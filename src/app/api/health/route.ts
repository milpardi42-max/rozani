import { NextResponse } from "next/server";
import { storeBackendName } from "@/lib/data/store";
import { adminConfigured } from "@/lib/auth";

/**
 * Unauthenticated readiness probe for uptime checks.
 * Reports which storage backend is active, whether admin auth is configured,
 * and (when Redis is configured) the result of a live PING to Redis.
 */
export const dynamic = "force-dynamic";

async function pingRedis(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { ok: false, error: "not_configured" };
  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(["PING"]),
      cache: "no-store",
    });
    const latencyMs = Date.now() - t0;
    if (!r.ok) return { ok: false, latencyMs, error: `http_${r.status}` };
    const body = (await r.json()) as { result?: string };
    return body.result === "PONG" ? { ok: true, latencyMs } : { ok: false, latencyMs, error: "unexpected_response" };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, error: String(e) };
  }
}

export async function GET() {
  const backend = storeBackendName();
  const persistent = backend !== "file";
  const configured = adminConfigured();

  const redis = persistent ? await pingRedis() : { ok: false, error: "not_configured" };

  return NextResponse.json(
    {
      ok: true,
      service: "rosie-atelier",
      time: new Date().toISOString(),
      storage: { backend, persistent, redis },
      admin: { configured },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
