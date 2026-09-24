/**
 * Edge-compatible session token reader — no Node.js APIs, no "server-only" guard.
 * Shared between middleware (Edge Runtime) and server-side auth helpers.
 */

export const SESSION_COOKIE = "ra-session";
const SESSION_TTL_S = 60 * 60 * 24 * 14; // 14 days

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "artist" | "admin";
  artistId?: string;
}

const enc = new TextEncoder();

function secret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "rosie-atelier-dev-secret";
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
}

export async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload = b64url(
    enc.encode(
      JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S }),
    ),
  );
  return `${payload}.${await signPayload(payload)}`;
}

export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (!timingSafeEqual(await signPayload(payload), sig)) return null;
  try {
    const data = JSON.parse(fromB64url(payload)) as SessionUser & { exp: number };
    if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      ...(data.artistId ? { artistId: data.artistId } : {}),
    };
  } catch {
    return null;
  }
}
