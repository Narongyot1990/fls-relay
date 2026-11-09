/* All writes in these tests use in-memory fakes. No MongoDB connection is made. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import ExcelJS from 'exceljs';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loader(overrides = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(__dirname, '..', filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = new Module(filename);
    mod.paths = Module._nodeModulePaths(path.dirname(filename));
    cache.set(filename, mod);
    const nativeRequire = mod.require.bind(mod);
    mod.require = (name) => {
      if (name in overrides) return overrides[name];
      if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
      if (name.startsWith('.')) {
        const resolved = path.resolve(path.dirname(filename), name + '.ts');
        if (fs.existsSync(resolved)) return load(resolved);
      }
      return nativeRequire(name);
    };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText;
    mod._compile(source, filename);
    return mod.exports;
  }
  return load;
}
const load = loader();
const { validateImportRows } = load('lib/inventory.ts');
const { parseInventoryCsv } = load('lib/inventory-csv.ts');
const { readInventoryFile } = load('lib/inventory-file.ts');
const { importDocument, ensureInventoryIndexes } = load('lib/db/inventory.ts');
const { validateSiteInput, validatePersonInput } = load('lib/directory.ts');

test('directory validation requires stable site codes, employee IDs and existing site references', () => {
  assert.deepEqual(validateSiteInput({ code: ' qa-site ', name: ' Yard ' }), { code: 'QA-SITE', name: 'Yard' });
  assert.throws(() => validateSiteInput({ code: 'bad code', name: 'Yard' }));
  assert.throws(() => validateSiteInput({ code: 'QA', name: '  ' }));
  const person = validatePersonInput({ type: 'driver', name: ' Driver ', employeeNo: '00ab', siteId: 'aaaaaaaaaaaaaaaaaaaaaaaa' });
  assert.equal(person.employeeNo, '00AB'); assert.equal(person.phone, '');
  assert.throws(() => validatePersonInput({ ...person, type: 'it' }));
  assert.throws(() => validatePersonInput({ ...person, siteId: 'central' }));
  assert.throws(() => validatePersonInput({ ...person, employeeNo: '' }));
});

test('IT/System Admin can maintain the directory; field handover roles cannot', async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const { inventoryAccess } = load('lib/inventory-access.ts');
    const request = (role) => new Request('https://example.test/api/inventory/sites', { method: 'POST', headers: { 'X-Inventory-Role': role, Origin: 'https://example.test' } });
    assert.equal((await inventoryAccess(request('system_admin'), 'directory')).role, 'system_admin');
    assert.equal((await inventoryAccess(request('it'), 'directory')).role, 'it');
    await assert.rejects(inventoryAccess(request('implementation'), 'directory'), /Only IT and System Admin/);
    await assert.rejects(inventoryAccess(request('site_leader'), 'directory'), /Only IT and System Admin/);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('site creation checks duplicates and never creates records on validation failure', async () => {
  const documents = [], access = load('lib/inventory-access.ts');
  const collection = { findOne: async ({ code }) => documents.find((doc) => doc.code.toLowerCase() === code.toLowerCase()),
    createIndex: async () => {}, insertOne: async (doc) => documents.push(doc) };
  const route = loader({ '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ role: 'it' }) },
    '@/lib/db/mongodb': { getDb: async () => ({ collection: () => collection }) } })('app/api/inventory/sites/route.ts');
  const request = (body) => new Request('https://example.test/api/inventory/sites', { method: 'POST', body: JSON.stringify(body) });
  assert.equal((await route.POST(request({ code: 'bad code', name: 'Test' }))).status, 400); assert.equal(documents.length, 0);
  const created = await route.POST(request({ code: 'qa', name: 'Test' }));
  assert.equal(created.status, 201); assert.equal((await created.json()).site.code, 'QA');
  assert.equal((await route.POST(request({ code: 'qa', name: 'Other' }))).status, 409); assert.equal(documents.length, 1);
});

test('people require an active site and employee IDs are unique across both person types', async () => {
  const documents = [], access = load('lib/inventory-access.ts'); let siteActive = false;
  const holders = { findOne: async ({ employeeNo }) => documents.find((doc) => doc.employeeNo.toLowerCase() === employeeNo.toLowerCase()),
    createIndex: async () => {}, insertOne: async (doc) => documents.push(doc) };
  const route = loader({ '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ role: 'it' }) },
    '@/lib/db/mongodb': { getDb: async () => ({ collection: (name) => {
      if (name === 'sites') return { findOne: async () => siteActive ? { active: true } : null };
      assert.equal(name, 'holders', 'Creating people must not transfer devices or create assignments'); return holders;
    } }) } })('app/api/inventory/people/route.ts');
  const body = { type: 'driver', name: 'Test person', employeeNo: 'qa-001', siteId: 'aaaaaaaaaaaaaaaaaaaaaaaa' };
  const request = (value) => new Request('https://example.test/api/inventory/people', { method: 'POST', body: JSON.stringify(value) });
  assert.equal((await route.POST(request(body))).status, 400); assert.equal(documents.length, 0);
  siteActive = true;
  const created = await route.POST(request(body)); assert.equal(created.status, 201);
  const person = (await created.json()).person; assert.equal(person.employeeNo, 'QA-001'); assert.equal(person.siteId, body.siteId);
  assert.equal((await route.POST(request({ ...body, type: 'site_leader', employeeNo: 'QA-001' }))).status, 409);
  assert.equal(documents.length, 1);
});

test('production inventory can be read without a password or session', async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const { inventoryAccess } = load('lib/inventory-access.ts');
    const access = await inventoryAccess(new Request('https://example.test/api/inventory', { headers: { 'X-Inventory-Role': 'it' } }));
    assert.equal(access.role, 'it');
    assert.equal(access.actor, 'public-test-it');
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
test('public production writes accept same-origin operators without a session', async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const { inventoryAccess } = load('lib/inventory-access.ts');
    const access = await inventoryAccess(new Request('https://example.test/api/inventory/import', { method: 'POST', headers: { 'X-Inventory-Role': 'implementation', Origin: 'https://example.test' } }), true);
    assert.equal(access.role, 'implementation');
    await assert.rejects(inventoryAccess(new Request('https://example.test/api/inventory/import', { method: 'POST', headers: { 'X-Inventory-Role': 'it', Origin: 'https://other.test' } }), true), /origin/);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('CSV handles BOM, quoted commas, escaped quotes and quoted multiline cells', () => {
  const parsed = parseInventoryCsv('\uFEFFDevice name,Managed by\r\n"A,1","In""tune\nAdmin"\r\n');
  assert.deepEqual(parsed.headers, ['Device name', 'Managed by']);
  assert.equal(parsed.rows[0]['Device name'], 'A,1');
  assert.equal(parsed.rows[0]['Managed by'], 'In"tune\nAdmin');
});
test('CSV rejects incomplete quotes, duplicate headers and short rows', () => {
  for (const csv of ['A,B\n"bad', 'A,a\nx,y', 'A,B\nx']) assert.throws(() => parseInventoryCsv(csv));
});
test('validation flags blank and case-insensitive duplicate IDs, invalid dates', () => {
  const rows = validateImportRows([{ deviceId: 'PHONE-1' }, { deviceId: 'phone-1' }, { deviceId: '', lastCheckIn: 'not-a-date' }]);
  assert.match(rows[0].errors.join(), /Duplicate/);
  assert.match(rows[1].errors.join(), /Duplicate/);
  assert.match(rows[2].errors.join(), /required/);
  assert.match(rows[2].errors.join(), /date/);
  assert.throws(() => validateImportRows(Array(2001).fill({ deviceId: 'X' })));
});
test('XLSX parses Intune columns, numeric OS version and Excel dates', async () => {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('Inventory');
  sheet.addRow(['Device name', 'Managed by', 'Ownership', 'Compliance', 'OS', 'OS version', 'Primary user UPN', 'Last check-in']);
  sheet.addRow(['UNIT-001', 'Intune', 'Corporate', 'Compliant', 'Android (Dedicated)', 16, null, new Date('2026-10-12T08:00:00Z')]);
  const preview = await readInventoryFile(new File([await book.xlsx.writeBuffer()], 'inventory.xlsx'));
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0].deviceId, 'UNIT-001');
  assert.equal(preview.rows[0].osVersion, '16');
  assert.equal(preview.rows[0].lastCheckIn, '2026-10-12T08:00:00.000Z');
  assert.equal(preview.databaseChecked, false);
});
test('identifier mapping can select a real company Device ID', async () => {
  const preview = await readInventoryFile(new File(['Device ID,Device name\nASSET-1,ANDROID-1'], 'devices.csv'), 'Device ID');
  assert.equal(preview.rows[0].deviceId, 'ASSET-1');
  assert.equal(preview.rows[0].deviceName, 'ANDROID-1');
});
test('empty files, unsupported format and unavailable sheet are rejected', async () => {
  await assert.rejects(readInventoryFile(new File([], 'empty.csv')), /non-empty/);
  await assert.rejects(readInventoryFile(new File(['test'], 'file.xls')), /supported/);
  const book = new ExcelJS.Workbook(); book.addWorksheet('One').addRow(['Device name']);
  await assert.rejects(readInventoryFile(new File([await book.xlsx.writeBuffer()], 'test.xlsx'), '', 'missing'), /Worksheet not found/);
});
test('import documents have no invented IMEI, serial, model, site or holder', () => {
  const row = validateImportRows([{ deviceId: 'UNIT-1', deviceName: 'UNIT-1', os: 'Android (Dedicated)' }])[0];
  const doc = importDocument(row, 'inventory.xlsx', 'test');
  assert.equal(doc.currentSiteId, null); assert.equal(doc.currentHolderId, null);
  assert.equal(doc.status, 'registered'); assert.equal(doc.model, '');
  assert.equal('imei' in doc, false); assert.equal('serial' in doc, false);
  assert.equal(doc.deviceIdKey, 'unit-1');
  assert.equal(doc.mdm.primaryUserUpn, null);
});
test('optional identifier index migration replaces only old single-field unique indexes', async () => {
  const created = [], dropped = [];
  const collection = {
    createIndex: async (key, options) => { created.push({ key, options }); },
    indexes: async () => [ { name: '_id_', key: { _id: 1 } }, { name: 'imei_1', unique: true, key: { imei: 1 } }, { name: 'serial_1', unique: true, key: { serial: 1 } }, { name: 'unrelated', key: { model: 1 } } ],
    dropIndex: async (name) => { dropped.push(name); },
  };
  await ensureInventoryIndexes(collection);
  assert.deepEqual(dropped.sort(), ['imei_1', 'serial_1']);
  assert.equal(created.length, 3);
  assert.equal(created[1].options.partialFilterExpression.imei.$type, 'string');
});
test('import requires explicit confirmation before any index or record writes', async () => {
  let writes = 0;
  const access = load('lib/inventory-access.ts');
  const route = loader({
    '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ role: 'it', actor: 'test' }) },
    '@/lib/db/inventory': { ensureInventoryIndexes: async () => { writes++; } },
  })('app/api/inventory/import/route.ts');
  const response = await route.POST(new Request('http://localhost/api/inventory/import', { method: 'POST', body: JSON.stringify({ rows: [{ deviceId: 'UNIT-1' }] }) }));
  assert.equal(response.status, 400); assert.equal(writes, 0);
});
test('import commit skips existing rows and inserts only new rows into a fake collection', async () => {
  const inserted = [];
  const access = load('lib/inventory-access.ts');
  const route = loader({
    '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ role: 'it', actor: 'test' }) },
    '@/lib/db/inventory': {
      existingImportIds: async () => new Set(['existing']), ensureInventoryIndexes: async () => {},
      inventoryCollection: async () => ({ insertOne: async (doc) => inserted.push(doc) }), importDocument,
    },
  })('app/api/inventory/import/route.ts');
  const response = await route.POST(new Request('http://localhost/api/inventory/import', { method: 'POST', body: JSON.stringify({ confirm: true, rows: [{ deviceId: 'EXISTING' }, { deviceId: 'NEW' }] }) }));
  const result = await response.json();
  assert.equal(response.status, 201); assert.equal(inserted.length, 1);
  assert.deepEqual(result.created, ['NEW']); assert.deepEqual(result.skipped, ['EXISTING']);
});

test('custody write mode allows Implementation and Site Leader, blocks System Admin', async () => {
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const { inventoryAccess } = load('lib/inventory-access.ts');
    const request = (role) => new Request('https://example.test/api/inventory/issue', { method: 'POST', headers: { 'X-Inventory-Role': role, Origin: 'https://example.test' } });
    assert.equal((await inventoryAccess(request('implementation'), 'custody')).role, 'implementation');
    await assert.rejects(inventoryAccess(request('system_admin'), 'custody'), /Only Implementation and Site Leader/);
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('custody eligibility: issue/return device selection matches the state machine', async () => {
  const { ObjectId } = await import('mongodb');
  const { loadIssuableDevice, loadAssignedDevice, readCondition } = load('lib/db/custody.ts');
  const siteX = new ObjectId(), siteY = new ObjectId(), holderA = new ObjectId(), holderB = new ObjectId();
  const central = { _id: new ObjectId(), active: true, status: 'registered', currentSiteId: null, currentHolderId: null };
  const atSiteX = { _id: new ObjectId(), active: true, status: 'in_site_stock', currentSiteId: siteX, currentHolderId: null };
  const atSiteY = { _id: new ObjectId(), active: true, status: 'in_site_stock', currentSiteId: siteY, currentHolderId: null };
  const held = { _id: new ObjectId(), active: true, status: 'in_site_stock', currentSiteId: siteX, currentHolderId: holderA };
  const assignedToA = { _id: new ObjectId(), active: true, status: 'assigned', currentHolderId: holderA };
  const docs = [central, atSiteX, atSiteY, held, assignedToA];
  function matches(doc, filter) {
    return Object.entries(filter).every(([key, value]) => {
      if (key === '$or') return value.some((sub) => matches(doc, sub));
      const have = doc[key] === undefined ? null : doc[key];
      const want = value === undefined ? null : value;
      return (have === null ? null : have.toString()) === (want === null ? null : want.toString());
    });
  }
  const devices = { findOne: async (filter) => docs.find((doc) => matches(doc, filter)) ?? null };
  assert.equal((await loadIssuableDevice(devices, central._id.toHexString(), siteX))._id, central._id);
  assert.equal((await loadIssuableDevice(devices, atSiteX._id.toHexString(), siteX))._id, atSiteX._id);
  await assert.rejects(loadIssuableDevice(devices, atSiteY._id.toHexString(), siteX), /not eligible/);
  await assert.rejects(loadIssuableDevice(devices, held._id.toHexString(), siteX), /not eligible/);
  await assert.rejects(loadIssuableDevice(devices, 'not-an-id', siteX), /existing device/);
  assert.equal((await loadAssignedDevice(devices, assignedToA._id.toHexString(), holderA))._id, assignedToA._id);
  await assert.rejects(loadAssignedDevice(devices, assignedToA._id.toHexString(), holderB), /not currently assigned/);
  assert.equal(readCondition('ok'), 'ok'); assert.equal(readCondition('damaged'), 'damaged');
  assert.throws(() => readCondition('maybe'), /condition/);
});

test('issue route rejects IT operators and empty signatures before touching the database', async () => {
  const access = load('lib/inventory-access.ts');
  const route = loader({
    '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ role: 'it', siteId: null, actor: 'public-test-it' }) },
  })('app/api/inventory/issue/route.ts');
  const blocked = await route.POST(new Request('http://localhost/api/inventory/issue', { method: 'POST', body: JSON.stringify({ deviceId: 'x', driverId: 'y', signature: 'data:image/png;base64,abc' }) }));
  assert.equal(blocked.status, 403);
  const implementation = loader({
    '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ role: 'implementation', siteId: null, actor: 'public-test-implementation' }) },
  })('app/api/inventory/issue/route.ts');
  const missingSignature = await implementation.POST(new Request('http://localhost/api/inventory/issue', { method: 'POST', body: JSON.stringify({ deviceId: 'x', driverId: 'y', signature: '' }) }));
  assert.equal(missingSignature.status, 400);
  const result = await missingSignature.json();
  assert.match(result.error, /signature/);
});
