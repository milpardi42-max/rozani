/**
 * HTTP helpers shared by the session/admin endpoints and the browser code that calls them.
 *
 * A response that describes *who is logged in* (or what an admin is allowed to see) must never be
 * stored by a browser cache or proxy: a replayed stale `/api/auth/me` answer reports `user: null`
 * right after `login()` created the session and bounces the admin back to /login.
 */

/** Headers every `/api/auth/*` and `/api/admin/content` response must carry. */
export const NO_STORE_HEADERS = {
  "cache-control": "private, no-store",
} as const;

/**
 * ResponseInit with the no-store headers merged in: any header the caller already set is kept,
 * the two cache headers are overwritten so a response can never become cacheable.
 */
export function withNoStore(init: ResponseInit = {}): ResponseInit {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) headers.set(key, value);
  return { ...init, headers };
}

/**
 * Fetch init for every session-aware request from the browser: skip the HTTP cache and make sure
 * the HttpOnly session cookie is actually attached (same-origin).
 */
export const SESSION_FETCH: Pick<RequestInit, "cache" | "credentials"> = {
  cache: "no-store",
  credentials: "same-origin",
};
