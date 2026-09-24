import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/session";

/**
 * Shared request guards for the marketplace API surface.
 *
 * Every handler funnels through these helpers so the same three rules hold
 * everywhere: the session is read server-side, errors are answered with
 * `cache-control: private, no-store`, and rate-limit keys are namespaced.
 */

export function json<T>(data: T, init: ResponseInit = {}): NextResponse {
  return NextResponse.json(data as Record<string, unknown>, withNoStore(init));
}

export function fail(error: string, status = 400, extra: Record<string, unknown> = {}): NextResponse {
  return json({ ok: false, error, ...extra }, { status });
}

export async function session(): Promise<SessionUser | null> {
  return getSession();
}

export async function requireSession(): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSession();
  if (!user) return { response: fail("unauthorized", 401) };
  return { user };
}

export async function requireArtistOrAdmin(): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSession();
  if (!user) return { response: fail("unauthorized", 401) };
  if (user.role !== "artist" && user.role !== "admin") return { response: fail("forbidden", 403) };
  return { user };
}

export async function requireAdmin(): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSession();
  if (!user) return { response: fail("unauthorized", 401) };
  if (user.role !== "admin") return { response: fail("forbidden", 403) };
  return { user };
}

export function ip(request: Request): string {
  return clientIp(request);
}

export function userAgent(request: Request): string {
  return request.headers.get("user-agent") ?? "unknown";
}

/** Safe JSON body reader that never throws on malformed input. */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function numberParam(url: URL, key: string, fallback: number): number {
  const raw = url.searchParams.get(key);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
