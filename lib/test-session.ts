import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const TEST_SESSION_COOKIE = "fls-test-session";
export const TEST_SESSION_SECONDS = 8 * 60 * 60;
const audience = "fls-relay-test-operator";

export function localTestMode() {
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
}

export function testAccessConfigured() {
  return /^[a-f0-9]{64}$/i.test(process.env.INVENTORY_TEST_PASSWORD_HASH ?? "") &&
    (process.env.INVENTORY_SESSION_SECRET?.length ?? 0) >= 32;
}

export function matchesTestPassword(password: unknown) {
  if (!testAccessConfigured() || typeof password !== "string" || password.length > 256) return false;
  const actual = createHash("sha256").update(password).digest();
  const expected = Buffer.from(process.env.INVENTORY_TEST_PASSWORD_HASH!, "hex");
  return timingSafeEqual(actual, expected);
}

export function createTestSession(now = Date.now()) {
  if (!testAccessConfigured()) throw new Error("Production test access is not configured");
  const payload = Buffer.from(JSON.stringify({ aud: audience, exp: now + TEST_SESSION_SECONDS * 1000 })).toString("base64url");
  const signature = createHmac("sha256", process.env.INVENTORY_SESSION_SECRET!).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function validTestSession(token: string | undefined, now = Date.now()) {
  if (!testAccessConfigured() || !token || token.length > 1024) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const expected = createHmac("sha256", process.env.INVENTORY_SESSION_SECRET!).update(parts[0]).digest();
    const actual = Buffer.from(parts[1], "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload.aud === audience && typeof payload.exp === "number" && Number.isFinite(payload.exp) && payload.exp > now;
  } catch { return false; }
}

export function requestTestSession(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${TEST_SESSION_COOKIE}=`));
  return validTestSession(cookie?.slice(TEST_SESSION_COOKIE.length + 1));
}

export function sameOriginRequest(request: Request) {
  try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; }
  catch { return false; }
}
