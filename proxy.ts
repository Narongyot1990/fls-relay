import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const destination = new URL("/preview", request.url);
  const path = request.nextUrl.pathname;
  if (path === "/admin") destination.searchParams.set("manage", "admin");
  else if (path.startsWith("/admin/sites")) destination.searchParams.set("manage", "sites");
  else if (path.startsWith("/admin/holders")) destination.searchParams.set("manage", "people");
  return NextResponse.redirect(destination);
}

export const config = { matcher: ["/", "/admin", "/admin/sites/:path*", "/admin/holders/:path*"] };
