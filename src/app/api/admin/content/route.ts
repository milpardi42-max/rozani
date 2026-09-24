import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { getContent, getContentWithEtag, resetContent, saveContent } from "@/lib/data/store";
import type { SiteContent } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Admin content API — protected by the signed HttpOnly session cookie (see src/lib/auth.ts).
 * Every answer is private + no-store: it is keyed on the session cookie, so it can never be cached
 * in a shared/edge layer where another (anonymous) visitor — or a logged-out admin — would read it.
 */
async function requireAdmin() {
  const user = await getSession();
  return user?.role === "admin" ? user : null;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  const [content, etag] = await getContentWithEtag();
  const res = NextResponse.json(content, withNoStore());
  if (etag) res.headers.set("ETag", `"${etag}"`);
  return res;
}

export async function PUT(req: Request) {
  if (!(await requireAdmin())) return unauthorized();
  const body = (await req.json().catch(() => null)) as SiteContent | null;
  if (!body || !Array.isArray(body.patterns) || !Array.isArray(body.products)) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  // Optional optimistic locking: If-Match header
  const ifMatch = req.headers.get("If-Match");
  const expectedEtag = ifMatch ? ifMatch.replace(/^"|"$/g, "") : undefined;

  try {
    await saveContent(body, expectedEtag);
  } catch (e) {
    if (e instanceof Error && e.message === "etag_conflict") {
      return NextResponse.json({ ok: false, error: "etag_conflict" }, withNoStore({ status: 409 }));
    }
    console.error("[admin/content] storage write failed:", e);
    return NextResponse.json({ ok: false, error: "storage_write_failed" }, withNoStore({ status: 502 }));
  }
  return NextResponse.json({ ok: true }, withNoStore());
}

export async function DELETE() {
  if (!(await requireAdmin())) return unauthorized();
  try {
    await resetContent();
  } catch (e) {
    console.error("[admin/content] storage reset failed:", e);
    return NextResponse.json({ ok: false, error: "storage_reset_failed" }, withNoStore({ status: 502 }));
  }
  return NextResponse.json({ ok: true }, withNoStore());
}
