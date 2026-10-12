import type { CurrentUser } from "@/types";

/**
 * There is no session/auth yet, so write requests carry the caller's claimed
 * role as a header from the (dev-only) current-user context. The API routes
 * re-check it, but a client can send anything — this is a placeholder shape
 * to swap for a real session lookup once auth exists, not a security control.
 */
export function userHeaders(user: CurrentUser): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-User-Level": user.level,
    "X-User-Id": user.id,
  };
}
