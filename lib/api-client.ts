import type { CurrentUser } from "@/types";

/**
 * There is no session/auth yet, so write requests carry the caller's claimed
 * role (and site, for L2's own-site checks like confirming a T1) as headers
 * from the (dev-only) current-user context. The API routes re-check them,
 * but a client can send anything — this is a placeholder shape to swap for a
 * real session lookup once auth exists, not a security control.
 */
export function userHeaders(user: CurrentUser): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-User-Level": user.level,
    "X-User-Id": user.id,
    "X-User-Site-Id": user.siteId ?? "",
  };
}

/** Same role headers, without Content-Type — for FormData uploads, where the browser must set its own multipart boundary. */
export function userAuthHeaders(user: CurrentUser): HeadersInit {
  return {
    "X-User-Level": user.level,
    "X-User-Id": user.id,
    "X-User-Site-Id": user.siteId ?? "",
  };
}
