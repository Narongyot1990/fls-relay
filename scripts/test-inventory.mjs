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

function directoryHarness() {
  const { ObjectId } = Module.createRequire(import.meta.url)('mongodb');
  const siteId = new ObjectId(), secondSiteId = new ObjectId(), driverId = new ObjectId(), leaderId = new ObjectId();
  const state = {
    sites: [{ _id: siteId, code: 'QA', name: 'QA site', active: true }, { _id: secondSiteId, code: 'Q2', name: 'Second site', active: true }],
    holders: [{ _id: driverId, name: 'Driver', employeeNo: 'QA-01', type: 'driver', siteId, active: true, phone: '' }, { _id: leaderId, name: 'Leader', employeeNo: 'QA-SL', type: 'site_leader', siteId, active: true, phone: '' }],
    devices: [], custody_transactions: [], mutations: 0,
  };
  const matches = (doc, filter, insensitive = false) => Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some((sub) => matches(doc, sub, insensitive));
    const eq = (a, b) => insensitive ? String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase() : String(a ?? '') === String(b ?? '');
    if (value && typeof value === 'object' && '$ne' in value) return !eq(doc[key], value.$ne);
    if (value && typeof value === 'object' && '$in' in value) return value.$in.some((candidate) => eq(doc[key], candidate));
    return eq(doc[key], value);
  });
  const db = { collection: (name) => ({
    findOne: async (filter, options) => state[name].find((doc) => matches(doc, filter, !!options?.collation)) || null,
    countDocuments: async (filter) => state[name].filter((doc) => matches(doc, filter)).length,
    createIndex: async () => {},
    findOneAndUpdate: async (filter, update) => { const doc = state[name].find((doc) => matches(doc, filter)); if (!doc) return null; Object.assign(doc, update.$set); state.mutations++; return doc; },
    deleteOne: async (filter) => { const index = state[name].findIndex((doc) => matches(doc, filter)); if (index < 0) return { deletedCount: 0 }; state[name].splice(index, 1); state.mutations++; return { deletedCount: 1 }; },
  }) };
  const local = loader({ '@/lib/db/mongodb': { getDb: async () => db } });
  const call = (kind, id, method, body, role = 'system_admin') => local(`app/api/inventory/${kind}/[id]/route.ts`)[method](new Request(`http://localhost/api/inventory/${kind}/${id}`, { method, headers: { 'X-Inventory-Role': role, Origin: 'http://localhost' }, ...(body ? { body: JSON.stringify(body) } : {}) }), { params: Promise.resolve({ id: String(id) }) });
  return { state, siteId, secondSiteId, driverId, leaderId, call };
}

test('directory updates site and person fields through current-role APIs', async () => {
  const h = directoryHarness();
  const site = await h.call('sites', h.siteId, 'PATCH', { name: 'Renamed site', code: 'NEW-QA' });
  assert.equal(site.status, 200); assert.equal((await site.json()).site.name, 'Renamed site');
  const person = await h.call('people', h.driverId, 'PATCH', { name: 'Renamed driver', employeeNo: 'new-id', phone: '0123' }, 'it');
  assert.equal(person.status, 200); assert.equal((await person.json()).person.employeeNo, 'NEW-ID');
  assert.equal(h.state.holders[0].phone, '0123');
});

test('directory rejects unauthorized roles, invalid fields and duplicate identifiers without mutation', async () => {
  const h = directoryHarness();
  for (const role of ['site_leader', 'implementation']) assert.equal((await h.call('sites', h.siteId, 'PATCH', { name: 'Bad' }, role)).status, 403);
  assert.equal((await h.call('sites', h.siteId, 'PATCH', { code: 'q2' })).status, 409);
  assert.equal((await h.call('people', h.driverId, 'PATCH', { employeeNo: 'qa-sl' })).status, 409);
  assert.equal((await h.call('people', h.driverId, 'PATCH', { active: 'false' })).status, 400);
  assert.equal((await h.call('sites', 'bad-id', 'DELETE')).status, 400);
  assert.equal(h.state.mutations, 0);
});

test('directory deletes unused records but protects sites and people referenced by custody history', async () => {
  const h = directoryHarness();
  assert.equal((await h.call('sites', h.secondSiteId, 'DELETE')).status, 200);
  h.state.custody_transactions.push({ fromHolderId: h.driverId, toSiteId: h.siteId });
  assert.equal((await h.call('people', h.driverId, 'DELETE')).status, 409);
  assert.equal((await h.call('sites', h.siteId, 'DELETE')).status, 409);
  assert.equal((await h.call('people', h.driverId, 'PATCH', { active: false })).status, 200);
  assert.equal(h.state.custody_transactions.length, 1); assert.equal(h.state.holders[0].active, false);
});

test('directory blocks affiliation changes/deactivation while phones are assigned, but permits name corrections', async () => {
  const h = directoryHarness(); h.state.devices.push({ currentHolderId: h.driverId, currentSiteId: h.siteId, active: true, status: 'assigned' });
  for (const change of [{ siteId: String(h.secondSiteId) }, { type: 'site_leader' }, { active: false }]) assert.equal((await h.call('people', h.driverId, 'PATCH', change)).status, 409);
  assert.equal((await h.call('people', h.driverId, 'DELETE')).status, 409);
  assert.equal((await h.call('people', h.driverId, 'PATCH', { name: 'Corrected name' })).status, 200);
  assert.equal((await h.call('sites', h.siteId, 'PATCH', { active: false })).status, 409);
});

test('directory protects the last Site Leader at a site with stock and supports deactivate/reactivate for unused records', async () => {
  const h = directoryHarness(); h.state.devices.push({ currentHolderId: null, currentSiteId: h.siteId, active: true, status: 'in_site_stock' });
  assert.equal((await h.call('people', h.leaderId, 'PATCH', { active: false })).status, 409);
  assert.equal((await h.call('sites', h.secondSiteId, 'PATCH', { active: false })).status, 200);
  assert.equal((await h.call('people', h.driverId, 'PATCH', { siteId: String(h.secondSiteId) })).status, 400);
  assert.equal((await h.call('sites', h.secondSiteId, 'PATCH', { active: true })).status, 200);
  assert.equal((await h.call('people', h.driverId, 'DELETE')).status, 200);
});

test('history phone filter keeps the Site Leader scope and rejects invalid or out-of-scope filters', async () => {
  const { ObjectId } = Module.createRequire(import.meta.url)('mongodb');
  const siteId = new ObjectId(), deviceId = new ObjectId(); let query;
  const cursor = { sort: () => cursor, skip: () => cursor, limit: () => cursor, toArray: async () => [] };
  const access = load('lib/inventory-access.ts');
  const route = loader({
    '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ siteId: String(siteId), role: 'site_leader', actor: 'operator' }) },
    '@/lib/db/transactions': { transactionCollection: async () => ({ find: (filter) => { query = filter; return cursor; } }), custodyTransactionItem: () => {} },
    '@/lib/db/mongodb': { getDb: async () => ({ collection: () => ({ find: () => cursor }) }) },
  })('app/api/inventory/history/route.ts');
  assert.equal((await route.GET(new Request(`http://localhost/api/inventory/history?site=all&device=${deviceId}`))).status, 200);
  assert.ok(query.deviceId.equals(deviceId)); assert.ok(query.$or.every((branch) => Object.values(branch)[0].equals(siteId)));
  assert.equal((await route.GET(new Request('http://localhost/api/inventory/history?device=bad'))).status, 400);
  assert.equal((await route.GET(new Request(`http://localhost/api/inventory/history?site=${new ObjectId()}`))).status, 403);
});

const acknowledgement = { signature: 'data:image/png;base64,' + 'a'.repeat(80), acknowledged: true, policyLanguage: 'en', policyVersion: 'Professional_Smartphone_Handover_Bilingual_EN_TH-v1', accessories: [0, 1] };

function custodyHarness(role = 'implementation', scoped = false) {
  const { ObjectId } = Module.createRequire(import.meta.url)('mongodb');
  const siteId = new ObjectId(), driverId = new ObjectId();
  const state = { devices: [
    { _id: new ObjectId(), deviceId: 'OLD', active: true, status: 'assigned', currentHolderId: driverId, currentSiteId: siteId },
    { _id: new ObjectId(), deviceId: 'NEW', active: true, status: 'in_site_stock', currentHolderId: null, currentSiteId: siteId },
  ], events: [], failAudit: false, failIncoming: false };
  const equal = (a, b) => String(a ?? '') === String(b ?? '');
  const matches = (doc, filter) => Object.entries(filter).every(([key, value]) => key === '$or' ? value.some((sub) => matches(doc, sub)) : equal(doc[key], value));
  const session = { withTransaction: async (fn) => {
    const before = state.devices.map((doc) => ({ ...doc })), events = [...state.events];
    try { return await fn(); } catch (error) { state.devices = before; state.events = events; throw error; }
  } };
  const devices = {
    findOne: async (filter) => state.devices.find((doc) => matches(doc, filter)),
    findOneAndUpdate: async (filter, change, options) => {
      assert.equal(options.session, session, 'Device mutations must join the DB transaction');
      if (state.failIncoming && equal(filter._id, state.devices[1]._id)) return null;
      const index = state.devices.findIndex((doc) => matches(doc, filter));
      if (index < 0) return null;
      state.devices[index] = { ...state.devices[index], ...change.$set }; return state.devices[index];
    },
  };
  const transactions = {
    findOne: async (filter, options) => { assert.equal(options.session, session); return [...state.events].reverse().find((event) => matches(event, filter)) || null; },
    insertMany: async (events, options) => { assert.equal(options.session, session); if (state.failAudit) throw Error('audit unavailable'); state.events.push(...events); },
    insertOne: async (event, options) => transactions.insertMany([event], options),
  };
  const db = {
    client: { withSession: (fn) => fn(session) },
    collection: (name) => { assert.equal(name, 'holders'); return { findOne: async () => ({ _id: driverId, siteId, name: 'Actual Driver', active: true, type: 'driver' }) }; },
  };
  const access = load('lib/inventory-access.ts');
  const local = loader({
    '@/lib/db/mongodb': { getDb: async () => db },
    '@/lib/db/inventory': { ...load('lib/db/inventory.ts'), inventoryCollection: async () => devices, ensureInventoryIndexes: async () => {} },
    '@/lib/db/transactions': { transactionCollection: async () => transactions, ensureTransactionIndexes: async () => {} },
    '@/lib/inventory-access': { ...access, inventoryAccess: async () => ({ role, siteId: scoped ? siteId.toHexString() : null, actor: 'operator-id' }) },
  });
  const post = async (route, body) => local(`app/api/inventory/${route}/route.ts`).POST(new Request(`http://localhost/api/inventory/${route}`, { method: 'POST', body: JSON.stringify(body) }));
  return { state, post, siteId, driverId, exchange: () => ({ ...acknowledgement, driverId: driverId.toHexString(), returningDeviceId: state.devices[0]._id.toHexString(), newDeviceId: state.devices[1]._id.toHexString(), condition: 'damaged' }) };
}

test('exchange saves linked return/issue, driver signer and new acknowledgement together', async () => {
  const { state, post, exchange } = custodyHarness('site_leader', true);
  const response = await post('exchange', exchange());
  assert.equal(response.status, 201);
  assert.equal(state.devices[0].status, 'damaged'); assert.equal(state.devices[0].currentHolderId, null);
  assert.equal(state.devices[1].status, 'assigned');
  assert.equal(state.events.length, 2); assert.equal(state.events[0].replacementRef, state.events[1].replacementRef);
  assert.equal(state.events[1].signerName, 'Actual Driver'); assert.equal(state.events[1].signature, acknowledgement.signature);
  assert.equal(state.events[1].signerId, state.events[1].toHolderId);
});

test('exchange rolls back both phones and history when replacement or audit persistence fails', async () => {
  for (const failure of ['failIncoming', 'failAudit']) {
    const { state, post, exchange } = custodyHarness(); state[failure] = true;
    const response = await post('exchange', exchange());
    assert.ok(response.status >= 400);
    assert.equal(state.devices[0].status, 'assigned'); assert.equal(state.devices[1].status, 'in_site_stock'); assert.equal(state.events.length, 0);
  }
});

test('exchange rejects missing acknowledgement and devices outside Site Leader scope', async () => {
  const { state, post, exchange, siteId } = custodyHarness('site_leader', true);
  assert.equal((await post('exchange', { ...exchange(), signature: '' })).status, 400);
  const { ObjectId } = Module.createRequire(import.meta.url)('mongodb');
  state.devices[0].currentSiteId = new ObjectId();
  assert.equal((await post('exchange', exchange())).status, 403);
  state.devices[0].currentSiteId = siteId;
  state.devices[1].status = 'damaged';
  assert.equal((await post('exchange', exchange())).status, 409);
  assert.equal(state.events.length, 0);
});

test('recall requires reason, retains driver identity, and rolls back on audit failure', async () => {
  const { state, post } = custodyHarness('system_admin');
  const body = { deviceId: state.devices[0]._id.toHexString(), recall: true, reason: '   ', condition: 'ok' };
  assert.equal((await post('return', body)).status, 400); assert.equal(state.devices[0].status, 'assigned');
  body.reason = 'Employment ended'; state.failAudit = true;
  assert.equal((await post('return', body)).status, 503); assert.equal(state.devices[0].status, 'assigned');
  state.failAudit = false;
  assert.equal((await post('return', body)).status, 200); assert.equal(state.devices[0].status, 'in_site_stock');
  assert.equal(state.events[0].reason, body.reason); assert.equal(state.events[0].recall, true);
  assert.ok(state.events[0].fromHolderId); assert.equal(state.events[0].actorRole, 'system_admin');
});

test('Site Leaders cannot recall phones outside their site', async () => {
  const { state, post } = custodyHarness('site_leader', true);
  const { ObjectId } = Module.createRequire(import.meta.url)('mongodb'); state.devices[0].currentSiteId = new ObjectId();
  assert.equal((await post('return', { deviceId: state.devices[0]._id.toHexString(), recall: true, reason: 'Recall', condition: 'ok' })).status, 403);
  assert.equal(state.devices[0].status, 'assigned'); assert.equal(state.events.length, 0);
});

test('issue persists the driver as signer and rolls back the assignment if its audit fails', async () => {
  for (const failAudit of [false, true]) {
    const { state, post, driverId } = custodyHarness(); state.failAudit = failAudit;
    const response = await post('issue', { ...acknowledgement, driverId: driverId.toHexString(), deviceId: state.devices[1]._id.toHexString() });
    assert.equal(response.status, failAudit ? 503 : 201);
    assert.equal(state.devices[1].status, failAudit ? 'in_site_stock' : 'assigned');
    if (!failAudit) { assert.equal(state.events[0].signerName, 'Actual Driver'); assert.equal(state.events[0].signerId.toHexString(), driverId.toHexString()); }
    else assert.equal(state.events.length, 0);
  }
});

function seedAccessoryIssue(harness, accessories = [0, 1]) {
  const { ObjectId } = Module.createRequire(import.meta.url)('mongodb');
  const issue = { _id: new ObjectId(), type: 'issue', deviceId: harness.state.devices[0]._id, toHolderId: harness.driverId, accessories, at: new Date() };
  harness.state.events.push(issue);
  return { assignmentId: issue._id.toHexString(), returnedAccessories: [...accessories], accessoriesChecked: true, accessoryNotes: '' };
}

test('return checks original issued accessories and retains complete and partial return snapshots', async () => {
  for (const partial of [false, true]) {
    const h = custodyHarness(); const checklist = seedAccessoryIssue(h);
    if (partial) { checklist.returnedAccessories = [0]; checklist.accessoryNotes = 'USB cable lost'; }
    const response = await h.post('return', { deviceId: h.state.devices[0]._id.toHexString(), condition: 'ok', ...checklist });
    assert.equal(response.status, 200);
    assert.deepEqual(h.state.events[1].issuedAccessories, [0, 1]);
    assert.deepEqual(h.state.events[1].returnedAccessories, partial ? [0] : [0, 1]);
    assert.deepEqual(h.state.events[1].missingAccessories, partial ? [1] : []);
    assert.equal(h.state.events[1].accessoryNotes, checklist.accessoryNotes);
  }
});

test('return rejects unchecked checklists, missing explanations, stale assignments and invented items', async () => {
  for (const override of [{ accessoriesChecked: false }, { returnedAccessories: [0] }, { assignmentId: 'old-assignment' }, { returnedAccessories: [0, 4] }, { returnedAccessories: [20] }]) {
    const h = custodyHarness(); const checklist = seedAccessoryIssue(h);
    const response = await h.post('return', { deviceId: h.state.devices[0]._id.toHexString(), condition: 'ok', ...checklist, ...override });
    assert.ok([400, 409].includes(response.status));
    assert.equal(h.state.devices[0].status, 'assigned'); assert.equal(h.state.events.length, 1);
  }
});

test('exchange keeps returned accessories separate from the replacement accessory kit', async () => {
  const h = custodyHarness(); const checklist = seedAccessoryIssue(h);
  const response = await h.post('exchange', { ...h.exchange(), ...checklist, returnedAccessories: [0], accessoryNotes: 'USB cable lost', accessories: [2, 4] });
  assert.equal(response.status, 201);
  assert.deepEqual(h.state.events[1].issuedAccessories, [0, 1]); assert.deepEqual(h.state.events[1].missingAccessories, [1]);
  assert.deepEqual(h.state.events[2].accessories, [2, 4]);
  assert.equal(h.state.events[1].replacementRef, h.state.events[2].replacementRef);
});

test('unknown legacy checklists stay unknown rather than claiming no accessories or complete receipt', async () => {
  const h = custodyHarness();
  assert.equal((await h.post('return', { deviceId: h.state.devices[0]._id.toHexString(), condition: 'ok', accessoryNotes: 'Original checklist unavailable' })).status, 200);
  assert.equal(h.state.events[0].issuedAccessories, undefined); assert.equal(h.state.events[0].missingAccessories, undefined); assert.equal(h.state.events[0].accessoriesChecked, false);
});

test('history exposes accessory evidence without exposing driver signature images', () => {
  const h = custodyHarness(); const input = seedAccessoryIssue(h); const issue = h.state.events[0];
  const { custodyTransactionItem } = load('lib/db/transactions.ts');
  const row = custodyTransactionItem({ ...issue, fromSiteId: null, toSiteId: h.siteId, fromHolderId: null, actor: 'operator', actorRole: 'site_leader', signature: 'private-signature' });
  assert.deepEqual(row.accessories, [0, 1]); assert.equal('signature' in row, false); assert.ok(input.assignmentId);
});

test('inventory recovers persisted original accessories only for the current holder', async () => {
  const h = custodyHarness(); const input = seedAccessoryIssue(h); const issue = h.state.events[0];
  const { inventoryItem } = load('lib/db/inventory.ts');
  const { withAssignments } = loader({ '@/lib/db/transactions': { transactionCollection: async () => ({ aggregate: () => ({ toArray: async () => [{ _id: issue.deviceId, assignment: { id: issue._id, holderId: h.driverId, accessories: [0, 1], at: issue.at } }] }) }) } })('lib/db/accessories.ts');
  const result = await withAssignments(h.state.devices.map(inventoryItem));
  assert.deepEqual(result[0].assignment.accessories, [0, 1]); assert.equal(result[0].assignment.id, input.assignmentId);
  assert.equal(result[1].assignment, undefined);
  const mismatch = await withAssignments([{ ...inventoryItem(h.state.devices[0]), holderId: 'another-holder' }]);
  assert.equal(mismatch[0].assignment, undefined);
});

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
