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
