import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const mod = new Module(filename);
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = mod.require.bind(mod);
  mod.require = (name) => name in overrides ? overrides[name] : nativeRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const session = load("lib/test-session.ts");
const original = { mode: process.env.NODE_ENV, hash: process.env.INVENTORY_TEST_PASSWORD_HASH, secret: process.env.INVENTORY_SESSION_SECRET };
const password = randomBytes(24).toString("hex");
beforeEach(() => {
  process.env.NODE_ENV = "production";
  process.env.INVENTORY_TEST_PASSWORD_HASH = createHash("sha256").update(password).digest("hex");
  process.env.INVENTORY_SESSION_SECRET = randomBytes(48).toString("hex");
});
afterEach(() => {
  for (const [name, value] of [["NODE_ENV", original.mode], ["INVENTORY_TEST_PASSWORD_HASH", original.hash], ["INVENTORY_SESSION_SECRET", original.secret]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

test("missing production configuration fails closed", () => {
  delete process.env.INVENTORY_SESSION_SECRET;
  assert.equal(session.testAccessConfigured(), false);
  assert.equal(session.matchesTestPassword(password), false);
  assert.equal(session.validTestSession("anything"), false);
  assert.throws(() => session.createTestSession());
});
test("password verification rejects incorrect values and non-string inputs", () => {
  assert.equal(session.matchesTestPassword(password), true);
  for (const value of ["incorrect", null, {}, "x".repeat(257)]) assert.equal(session.matchesTestPassword(value), false);
});
test("CLI environment line endings are normalized without changing the entered password", () => {
  process.env.INVENTORY_TEST_PASSWORD_HASH += "\r\n";
  process.env.INVENTORY_SESSION_SECRET += "\n";
  assert.equal(session.testAccessConfigured(), true);
  assert.equal(session.matchesTestPassword(password), true);
  assert.equal(session.matchesTestPassword(password + "\n"), false);
  assert.equal(session.validTestSession(session.createTestSession()), true);
});
test("signed session expires after eight hours", () => {
  const now = 1000000000, token = session.createTestSession(now);
  assert.equal(session.validTestSession(token, now), true);
  assert.equal(session.validTestSession(token, now + session.TEST_SESSION_SECONDS * 1000 - 1), true);
  assert.equal(session.validTestSession(token, now + session.TEST_SESSION_SECONDS * 1000), false);
});
test("tampering, malformed tokens and rotated secrets invalidate sessions", () => {
  const token = session.createTestSession();
  assert.equal(session.validTestSession(token + "x"), false);
  assert.equal(session.validTestSession("garbage"), false);
  const [payload, signature] = token.split(".");
  assert.equal(session.validTestSession(Buffer.from('{"aud":"other","exp":9999999999999}').toString("base64url") + "." + signature), false);
  assert.equal(session.validTestSession(payload + "."), false);
  process.env.INVENTORY_SESSION_SECRET = randomBytes(48).toString("hex");
  assert.equal(session.validTestSession(token), false);
});
test("cookie authentication ignores unrelated cookies and requires a valid signature", () => {
  const token = session.createTestSession();
  assert.equal(session.requestTestSession(new Request("https://example.test", { headers: { cookie: `other=value; ${session.TEST_SESSION_COOKIE}=${token}` } })), true);
  assert.equal(session.requestTestSession(new Request("https://example.test", { headers: { cookie: "other=value" } })), false);
});
test("production cannot use local bypass and writes require matching origin", () => {
  assert.equal(session.localTestMode(), false);
  assert.equal(session.sameOriginRequest(new Request("https://example.test/api", { headers: { origin: "https://example.test" } })), true);
  assert.equal(session.sameOriginRequest(new Request("https://example.test/api", { headers: { origin: "https://other.test" } })), false);
  assert.equal(session.sameOriginRequest(new Request("https://example.test/api")), false);
});
test("login issues a secure HttpOnly cookie and logout expires it", async () => {
  const route = load("app/api/test-session/route.ts", { "@/lib/test-session": session });
  const request = (method, body) => new Request("https://example.test/api/test-session", { method, headers: { origin: "https://example.test", "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const denied = await route.POST(request("POST", { password: "incorrect" }));
  assert.equal(denied.status, 401); assert.equal(denied.headers.has("set-cookie"), false);
  const accepted = await route.POST(request("POST", { password }));
  assert.equal(accepted.status, 200);
  assert.match(accepted.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(accepted.headers.get("set-cookie"), /Secure/i);
  assert.match(accepted.headers.get("set-cookie"), /SameSite=lax/i);
  const logout = await route.DELETE(request("DELETE"));
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
});
test("login rejects cross-origin attempts and throttles repeated failures", async () => {
  const route = load("app/api/test-session/route.ts", { "@/lib/test-session": session });
  assert.equal((await route.POST(new Request("https://example.test/api/test-session", { method: "POST", headers: { origin: "https://other.test" }, body: JSON.stringify({ password }) }))).status, 403);
  for (let attempt = 0; attempt < 10; attempt++) assert.equal((await route.POST(new Request("https://example.test/api/test-session", { method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ password: "incorrect" }) }))).status, 401);
  assert.equal((await route.POST(new Request("https://example.test/api/test-session", { method: "POST", headers: { origin: "https://example.test" }, body: JSON.stringify({ password }) }))).status, 429);
});
