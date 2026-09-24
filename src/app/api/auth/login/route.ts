import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyCredentials } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, clearFailures, recordFailure, tooManyAttempts } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; password?: string } | null;
  if (!body?.email || !body?.password) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const key = `${clientIp(req)}|${body.email.trim().toLowerCase()}`;
  if (tooManyAttempts(key)) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
  }
  const result = await verifyCredentials(body.email, body.password);
  if (!result.ok) {
    recordFailure(key);
    return NextResponse.json({ ok: false, error: result.error }, withNoStore({ status: 401 }));
  }
  clearFailures(key);
  const res = NextResponse.json({ ok: true, user: result.user }, withNoStore());
  res.cookies.set(SESSION_COOKIE, await createSessionToken(result.user), sessionCookieOptions());
  return res;
}
