// Reads the supplied file and existing database. NEVER calls the import commit endpoint.
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { basename } from "node:path";
import { MongoClient } from "mongodb";

const filepath = process.argv[2];
if (!filepath) throw new Error("Pass the inventory XLSX/CSV path for a read-only preview check");
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
try {
  await client.connect();
  const db = client.db();
  async function snapshot() {
    const [records, indexes] = await Promise.all([
      db.collection("devices").find({}).sort({ _id: 1 }).toArray(), db.collection("devices").indexes(),
    ]);
    return { count: records.length, fingerprint: createHash("sha256").update(JSON.stringify({ records, indexes })).digest("hex") };
  }
  const before = await snapshot();
  const file = new File([await readFile(filepath)], basename(filepath));
  const form = new FormData(); form.set("file", file);
  const response = await fetch("http://localhost:3000/api/inventory/import/preview", { method: "POST", headers: { "X-Inventory-Role": "implementation" }, body: form });
  const preview = await response.json();
  assert.equal(response.status, 200, "Preview endpoint must succeed");
  assert.equal(preview.databaseChecked, true);
  const central = await fetch("http://localhost:3000/api/inventory", { headers: { "X-Inventory-Role": "implementation" } });
  assert.equal(central.status, 200);
  const context = await central.json();
  let siteScopeChecked = false;
  if (context.leaders.length) {
    const leader = context.leaders[0];
    const own = await fetch("http://localhost:3000/api/inventory", { headers: { "X-Inventory-Role": "site_leader", "X-Inventory-Leader": leader.id } });
    assert.equal(own.status, 200);
    const scoped = await own.json();
    assert.ok(scoped.devices.every((device) => device.siteId === leader.siteId));
    const forbidden = await fetch("http://localhost:3000/api/inventory?site=central", { headers: { "X-Inventory-Role": "site_leader", "X-Inventory-Leader": leader.id } });
    assert.equal(forbidden.status, 403);
    siteScopeChecked = true;
  }
  const after = await snapshot();
  assert.deepEqual(after, before, "Preview and read requests must not change any device or index");
  console.log(JSON.stringify({ previewRows: preview.rows.length, ready: preview.rows.filter((row) => !row.errors.length && !row.existing).length,
    existing: preview.rows.filter((row) => row.existing).length, invalid: preview.rows.filter((row) => row.errors.length).length,
    databaseDevicesBefore: before.count, databaseDevicesAfter: after.count, recordsAndIndexesUnchanged: true, siteScopeChecked }, null, 2));
} catch {
  console.error("Read-only verification failed. No import commit was requested. Inspect the local server; details hidden to protect credentials/data.");
  process.exitCode = 1;
} finally { await client.close(); }
