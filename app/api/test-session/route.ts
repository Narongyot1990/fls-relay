import { NextResponse } from "next/server";
import { TEST_SESSION_COOKIE, TEST_SESSION_SECONDS, createTestSession, localTestMode, matchesTestPassword, requestTestSession, sameOriginRequest, testAccessConfigured } from "@/lib/test-session";

export const runtime = "nodejs";
// Per-instance throttling supplements a randomly generated, high-entropy test password.
const failures = new Map<string, { count: number; until: number }>();

export async function GET(request: Request) {
  return NextResponse.json({ authenticated: localTestMode() || requestTestSession(request), configured: localTestMode() || testAccessConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return NextResponse.json({ error: "Request origin is not allowed" }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 4096) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  if (!testAccessConfigured()) return NextResponse.json({ error: "Production test access is not configured yet." }, { status: 503 });
  const ip = request.headers.get("x-real-ip") ?? "unknown";
  const now = Date.now();
  for (const [key, value] of failures) if (value.until <= now) failures.delete(key);
  const attempt = failures.get(ip);
  if (attempt && attempt.count >= 10) return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(Math.ceil((attempt.until - now) / 1000)) } });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  if (!matchesTestPassword(body?.password)) {
    if (failures.size > 5000) failures.delete(failures.keys().next().value!);
    failures.set(ip, { count: (attempt?.count ?? 0) + 1, until: attempt?.until ?? now + 10 * 60 * 1000 });
    return NextResponse.json({ error: "Incorrect test password." }, { status: 401 });
  }
  failures.delete(ip);
  const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(TEST_SESSION_COOKIE, createTestSession(), { httpOnly: true, secure: !localTestMode(), sameSite: "lax", path: "/", maxAge: TEST_SESSION_SECONDS });
  return response;
}

export async function DELETE(request: Request) {
  if (!sameOriginRequest(request)) return NextResponse.json({ error: "Request origin is not allowed" }, { status: 403 });
  const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(TEST_SESSION_COOKIE, "", { httpOnly: true, secure: !localTestMode(), sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
