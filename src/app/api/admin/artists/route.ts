import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContent, updateCollection } from "@/lib/data/store";
import { getAllUsers, saveAllUsers } from "@/lib/data/users";
import { withNoStore } from "@/lib/http";
import type { ArtistStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/** GET /api/admin/artists — list all artists with their status */
export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  const content = await getContent();
  return NextResponse.json({ ok: true, artists: content.artists }, withNoStore());
}

/**
 * PATCH /api/admin/artists
 * Body: { id: string; status: ArtistStatus; revenueSharePct?: number; licenseType?: string }
 * Approves, rejects, or updates an artist record.
 */
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return unauthorized();

  const body = (await req.json().catch(() => null)) as {
    id?: string;
    status?: ArtistStatus;
    revenueSharePct?: number;
    licenseType?: string;
    featured?: boolean;
    rejectionNote?: string;
  } | null;

  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const content = await getContent();
  const idx = content.artists.findIndex((a) => a.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }

  const patch: Partial<(typeof content.artists)[0]> = {};
  if (body.status !== undefined) patch.status = body.status;
  if (body.revenueSharePct !== undefined) patch.revenueSharePct = Math.min(100, Math.max(0, body.revenueSharePct));
  if (body.licenseType !== undefined) {
    if (!["standard", "exclusive", "custom"].includes(body.licenseType)) {
      return NextResponse.json({ ok: false, error: "invalid_license_type" }, withNoStore({ status: 400 }));
    }
    patch.licenseType = body.licenseType as "standard" | "exclusive" | "custom";
  }
  if (body.featured !== undefined) patch.featured = body.featured;
  if (body.rejectionNote !== undefined) patch.rejectionNote = body.rejectionNote || undefined;

  const updated = { ...content.artists[idx], ...patch };
  const artists = content.artists.map((a, i) => (i === idx ? updated : a));
  await updateCollection("artists", artists);

  return NextResponse.json({ ok: true, artist: updated }, withNoStore());
}

/**
 * DELETE /api/admin/artists?id=…
 * Removes the artist record and clears artistId from the linked user account.
 */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, withNoStore({ status: 400 }));
  }

  const content = await getContent();
  const artist = content.artists.find((a) => a.id === id);
  if (!artist) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }

  // Remove artist record
  await updateCollection(
    "artists",
    content.artists.filter((a) => a.id !== id),
  );

  // Clear artistId on the linked user
  if (artist.userId) {
    const users = await getAllUsers();
    const updated = users.map((u) =>
      u.id === artist.userId ? { ...u, artistId: undefined, role: "user" as const } : u,
    );
    await saveAllUsers(updated);
  }

  return NextResponse.json({ ok: true }, withNoStore());
}
