// Explicit, backed-up reset of this application's configured database. Preview is the default.
// Source CSV and database snapshots stay under the git-ignored .local-backups directory.
import { readFileSync, mkdirSync, openSync, writeFileSync, fsyncSync, closeSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import Module from 'node:module';
import ts from 'typescript';
import { MongoClient, ObjectId, BSON } from 'mongodb';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowedCollections = ['devices', 'holders', 'sites', 'models', 'transactions', 'custody_transactions'];
const columns = ['Device name', 'Serial number', 'Manufacturer', 'Model', 'Driver Id', 'Driver name', 'Driver Site'];
const siteDefinitions = [{ code: 'CPO_CHO', name: 'CPOCHO' }, { code: 'CPO_MTP', name: 'CPOMTP' }];
const hash = (value) => createHash('sha256').update(value).digest('hex');
const encode = (value) => BSON.EJSON.stringify(value, { relaxed: false });

function parseCsv(text) {
  const filename = resolve(root, 'lib/inventory-csv.ts');
  const mod = new Module(filename);
  mod._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  return mod.exports.parseInventoryCsv(text);
}

export function buildPlan(source, filename, at = new Date()) {
  const csv = parseCsv(source.toString('utf8'));
  if (csv.headers.length !== columns.length || columns.some((key) => !csv.headers.includes(key))) throw new Error('Unexpected source columns; refusing migration');
  if (!csv.rows.length) throw new Error('Source has no phone rows');
  const sites = siteDefinitions.map((item) => ({ _id: new ObjectId(), ...item, active: true }));
  const siteByCode = new Map(sites.map((site) => [site.code, site]));
  const drivers = new Map(), serials = new Set(), models = new Map();
  const batch = `phone-list-${at.toISOString()}`;
  const devices = csv.rows.map((row, index) => {
    const get = (key) => String(row[key] || '').trim();
    for (const key of columns.slice(0, 4)) if (!get(key) || get(key).length > 200) throw new Error(`Missing/invalid ${key} at CSV row ${index + 2}`);
    const serial = get('Serial number'), serialKey = serial.toLowerCase();
    if (serials.has(serialKey)) throw new Error(`Duplicate serial at CSV row ${index + 2}`);
    serials.add(serialKey);
    const employeeNo = get('Driver Id').toUpperCase(), name = get('Driver name'), siteCode = get('Driver Site').toUpperCase();
    if (employeeNo || name || siteCode) {
      if (!employeeNo || !name || !siteByCode.has(siteCode)) throw new Error(`Incomplete/unknown driver identity or site at CSV row ${index + 2}`);
      const prior = drivers.get(employeeNo);
      if (prior && (prior.name.toLowerCase() !== name.toLowerCase() || !prior.siteId.equals(siteByCode.get(siteCode)._id))) throw new Error(`Conflicting driver identity at CSV row ${index + 2}`);
      if (!prior) drivers.set(employeeNo, { _id: new ObjectId(), employeeNo, name, type: 'driver', siteId: siteByCode.get(siteCode)._id, phone: '', active: true });
    }
    const model = get('Model'), manufacturer = get('Manufacturer');
    if (models.has(model) && models.get(model).manufacturer !== manufacturer) throw new Error(`Conflicting model manufacturer at CSV row ${index + 2}`);
    if (!models.has(model)) models.set(model, { _id: new ObjectId(), name: model, manufacturer, fieldKeys: [], active: true });
    return { _id: new ObjectId(), deviceId: serial, deviceIdKey: serialKey, deviceName: get('Device name'), serial, manufacturer, model,
      phoneNumber: '', status: 'registered', currentSiteId: null, currentHolderId: null, registeredAt: at, active: true,
      importSource: basename(filename), migrationBatch: batch, sourceRow: index + 2, mdm: { deviceName: get('Device name') } };
  });
  const holders = [...drivers.values()];
  return { batch, sourceSha256: hash(source), sites, holders, devices, models: [...models.values()],
    summary: { phones: devices.length, drivers: holders.length, sites: sites.map((site) => ({ code: site.code, name: site.name, drivers: holders.filter((driver) => driver.siteId.equals(site._id)).length })), models: models.size, phoneAssignments: 0, phoneSiteAssignments: 0, rowsWithoutDriver: csv.rows.filter((row) => !row['Driver Id'].trim()).length, deviceIdSource: 'Serial number' } };
}

function writePrivate(path, content) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, content); fsyncSync(fd); } finally { closeSync(fd); }
}

async function prepareIndexes(db) {
  const devices = db.collection('devices');
  await devices.createIndex({ deviceIdKey: 1 }, { name: 'inventory_device_id', unique: true, partialFilterExpression: { deviceIdKey: { $type: 'string' } } });
  // Match lib/db/inventory.ts: absent optional identifiers must not conflict.
  for (const field of ['imei', 'serial']) {
    const name = `inventory_optional_${field}`;
    await devices.createIndex({ [field]: 1 }, { name, unique: true, partialFilterExpression: { [field]: { $type: 'string', $gt: '' } } });
    for (const index of await devices.indexes()) if (index.name !== name && index.unique && !index.partialFilterExpression && !index.sparse && Object.keys(index.key).length === 1 && index.key[field] === 1) await devices.dropIndex(index.name);
  }
  for (const [collection, field] of [['sites', 'code'], ['holders', 'employeeNo'], ['models', 'name']]) await db.collection(collection).createIndex({ [field]: 1 }, { unique: true });
}

async function main() {
  const args = process.argv.slice(2), arg = (key) => args[args.indexOf(key) + 1];
  if (!args.includes('--source') || !arg('--source')) throw new Error('--source is required');
  const filename = resolve(arg('--source')), source = readFileSync(filename);
  const plan = buildPlan(source, filename);
  const commit = args.includes('--commit');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect(); const db = client.db();
    if (['admin', 'config', 'local'].includes(db.databaseName)) throw new Error('Refusing to reset a system database');
    const collections = await db.listCollections().toArray();
    if (collections.some((item) => item.type !== 'collection' || !allowedCollections.includes(item.name))) throw new Error('Unexpected collection/view in this database; reset refused');
    const before = {};
    for (const { name } of collections) before[name] = await db.collection(name).countDocuments();
    if (!commit) { console.log(JSON.stringify({ mode: 'preview', database: db.databaseName, before, sourceSha256: plan.sourceSha256, planned: plan.summary })); return; }
    if (!args.includes('--expected-db') || arg('--expected-db') !== db.databaseName) throw new Error('--expected-db must match the configured database');
    if (!args.includes('--source-sha256') || arg('--source-sha256') !== plan.sourceSha256) throw new Error('Source hash does not match the reviewed CSV');
    const hello = await db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Atomic reset requires MongoDB transaction support');
    const backup = resolve(root, '.local-backups', `phone-list-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    mkdirSync(backup, { recursive: true });
    const snapshots = {};
    await client.withSession((session) => session.withTransaction(async () => {
      for (const { name } of collections) snapshots[name] = await db.collection(name).find({}, { session, promoteValues: false }).sort({ _id: 1 }).toArray();
    }, { readConcern: { level: 'snapshot' } }));
    const manifest = { database: db.databaseName, createdAt: new Date().toISOString(), sourceSha256: plan.sourceSha256, collections: [], planned: plan.summary };
    for (const item of collections) {
      const text = encode(snapshots[item.name]), file = `${item.name}.ejson`;
      writePrivate(resolve(backup, file), text);
      if (hash(readFileSync(resolve(backup, file))) !== hash(text) || BSON.EJSON.parse(readFileSync(resolve(backup, file), 'utf8'), { relaxed: false }).length !== snapshots[item.name].length) throw new Error('Backup readback verification failed');
      manifest.collections.push({ name: item.name, file, count: snapshots[item.name].length, sha256: hash(text), indexes: await db.collection(item.name).indexes(), options: item.options });
    }
    writePrivate(resolve(backup, 'source.csv'), source);
    writePrivate(resolve(backup, 'new-data.ejson'), encode({ sites: plan.sites, holders: plan.holders, devices: plan.devices, models: plan.models }));
    writePrivate(resolve(backup, 'manifest.ejson'), encode(manifest));
    console.log(JSON.stringify({ stage: 'backup-verified', backup, database: db.databaseName, before: Object.fromEntries(manifest.collections.map((item) => [item.name, item.count])) }));
    await prepareIndexes(db);
    const replacement = { sites: plan.sites, holders: plan.holders, devices: plan.devices, models: plan.models };
    await client.withSession((session) => session.withTransaction(async () => {
      for (const { name } of collections) {
        const current = await db.collection(name).find({}, { session, promoteValues: false }).sort({ _id: 1 }).toArray();
        if (hash(encode(current)) !== hash(encode(snapshots[name]))) throw new Error('Database changed since backup; reset aborted');
      }
      for (const { name } of collections) await db.collection(name).deleteMany({}, { session });
      for (const [name, docs] of Object.entries(replacement)) if (docs.length) await db.collection(name).insertMany(docs, { session });
      for (const name of allowedCollections) if (await db.collection(name).countDocuments({}, { session }) !== (replacement[name]?.length || 0)) throw new Error('Transactional record counts differ from migration plan');
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }));
    const after = {};
    for (const name of allowedCollections) {
      after[name] = await db.collection(name).countDocuments();
      if (after[name] !== (replacement[name]?.length || 0)) throw new Error('Post-commit counts differ from migration plan; inspect backup and concurrent writes');
    }
    if (await db.collection('devices').countDocuments({ $or: [{ currentSiteId: { $ne: null } }, { currentHolderId: { $ne: null } }, { status: { $ne: 'registered' } }] })) throw new Error('Unexpected phone assignment after migration');
    const byId = (docs) => [...docs].sort((a, b) => String(a._id).localeCompare(String(b._id)));
    for (const [name, docs] of Object.entries(replacement)) if (hash(encode(byId(await db.collection(name).find().toArray()))) !== hash(encode(byId(docs)))) throw new Error('Post-commit field verification failed');
    writePrivate(resolve(backup, 'result.json'), JSON.stringify({ completedAt: new Date().toISOString(), database: db.databaseName, after, sourceSha256: plan.sourceSha256, planned: plan.summary }, null, 2));
    console.log(JSON.stringify({ stage: 'migration-verified', database: db.databaseName, backup, after, planned: plan.summary }));
  } finally { await client.close(); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(JSON.stringify({ error: String(error.message).replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted connection]') })); process.exitCode = 1; });
