import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContent, updateCollection } from "@/lib/data/store";
import { getAllUsers, saveAllUsers } from "@/lib/data/users";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt } from "@/lib/rate-limit";
import type { Artist } from "@/lib/types";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "artist";
}

/** GET /api/artist/profile — returns the artist profile for the logged-in user */
export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) {
    return unauthorized();
  }

  const content = await getContent();

  const artistId = session.role === "admin"
    ? null // admins use the admin panel; return null to indicate no personal profile
    : session.artistId;

  if (!artistId) {
    return NextResponse.json({ ok: true, artist: null }, withNoStore());
  }

  const artist = content.artists.find((a) => a.id === artistId) ?? null;
  return NextResponse.json({ ok: true, artist }, withNoStore());
}

/**
 * PUT /api/artist/profile — update the artist's own profile.
 *
 * Allowed fields: name, profession, bio, location, social, avatar, cover, tags, licenseType, licenseNote.
 * Slug is re-derived from name if the artist wants a change, with uniqueness enforced.
 * Status and revenueSharePct are read-only for the artist (admin-only via /api/admin/artists).
 */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "artist") return unauthorized();

  const artistId = session.artistId;
  if (!artistId) {
    return NextResponse.json({ ok: false, error: "no_artist_record" }, withNoStore({ status: 400 }));
  }

  const body = (await req.json().catch(() => null)) as Partial<Artist> & { slug?: string } | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  // Rate limit: 30 profile updates per 5 min per IP
  const rlKey = `profile:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
  }
  recordAttempt(rlKey);

  const content = await getContent();
  const idx = content.artists.findIndex((a) => a.id === artistId);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: "artist_not_found" }, withNoStore({ status: 404 }));
  }

  const current = content.artists[idx];

  // Validate & deduplicate slug if name changed
  let slug = current.slug;
  if (body.slug && body.slug !== current.slug) {
    const candidate = toSlug(body.slug);
    const taken = content.artists.some((a) => a.slug === candidate && a.id !== artistId);
    if (taken) {
      return NextResponse.json({ ok: false, error: "slug_taken" }, withNoStore({ status: 409 }));
    }
    slug = candidate;
  } else if (body.name && (body.name.fa !== current.name.fa || body.name.en !== current.name.en)) {
    // Re-derive slug from updated name only if no explicit slug was provided
    const derived = toSlug(body.name.en || body.name.fa);
    if (derived && derived !== current.slug) {
      const taken = content.artists.some((a) => a.slug === derived && a.id !== artistId);
      if (!taken) slug = derived;
    }
  }

  // Only allow safe editable fields — protect status, revenueSharePct, userId, id, followers, etc.
  const updated: Artist = {
    ...current,
    ...(body.name ? { name: body.name } : {}),
    ...(body.profession ? { profession: body.profession } : {}),
    ...(body.bio !== undefined ? { bio: body.bio } : {}),
    ...(body.location !== undefined ? { location: body.location } : {}),
    ...(body.social !== undefined ? { social: body.social } : {}),
    ...(body.avatar ? { avatar: body.avatar } : {}),
    ...(body.cover ? { cover: body.cover } : {}),
    ...(body.tags !== undefined ? { tags: body.tags } : {}),
    ...(body.licenseType !== undefined ? { licenseType: body.licenseType } : {}),
    ...(body.licenseNote !== undefined ? { licenseNote: body.licenseNote } : {}),
    slug,
  };

  const artists = content.artists.map((a, i) => (i === idx ? updated : a));
  await updateCollection("artists", artists);

  // Sync display name in the user record if it changed
  if (body.name) {
    const displayName = body.name.fa || body.name.en;
    if (displayName && displayName !== session.name) {
      const users = await getAllUsers();
      const updatedUsers = users.map((u) =>
        u.id === session.id ? { ...u, name: displayName } : u,
      );
      await saveAllUsers(updatedUsers);
    }
  }

  return NextResponse.json({ ok: true, artist: updated }, withNoStore());
}
