import { NextResponse, type NextRequest } from "next/server";
import { localTestMode, requestTestSession, sameOriginRequest } from "@/lib/test-session";

export function proxy(request: NextRequest) {
  if (localTestMode()) return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (pathname === "/login" || pathname === "/api/test-session") return NextResponse.next();
  if (!requestTestSession(request)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in with the production test password to continue." }, { status: 401, headers: { "Cache-Control": "no-store" } });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin is not allowed" }, { status: 403 });
  }
  if (pathname === "/") return NextResponse.redirect(new URL("/preview", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
