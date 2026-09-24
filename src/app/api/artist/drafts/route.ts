import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContent, saveContent, updateCollection } from "@/lib/data/store";
import { withNoStore } from "@/lib/http";
import crypto from "crypto";
import type { DraftStatus, EducationItem, Portfolio } from "@/lib/types";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

async function requireArtistOrAdmin() {
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) return null;
  return session;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function makeUniqueSlug(base: string, existing: Array<{ slug: string }>) {
  const slug = toSlug(base) || `item-${Date.now().toString(36)}`;
  let candidate = slug;
  let i = 1;
  while (existing.some((x) => x.slug === candidate)) {
    candidate = `${slug}-${i}`;
    i += 1;
  }
  return candidate;
}

/**
 * GET /api/artist/drafts?type=portfolio|education
 * Returns the artist's own drafts (all statuses).
 * Admin gets everything.
 */
export async function GET(req: Request) {
  const session = await requireArtistOrAdmin();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "portfolio";

  const content = await getContent();

  if (type === "education") {
    const items =
      session.role === "admin"
        ? content.education
        : content.education.filter((e) => e.authorId === session.artistId);
    return NextResponse.json({ ok: true, items }, withNoStore());
  }

  // portfolio (default)
  const items =
    session.role === "admin"
      ? content.portfolios
      : content.portfolios.filter((p) => p.artistId === session.artistId);
  return NextResponse.json({ ok: true, items }, withNoStore());
}

/**
 * POST /api/artist/drafts?type=portfolio|education
 * Creates a new draft. draftStatus defaults to "draft".
 */
export async function POST(req: Request) {
  const session = await requireArtistOrAdmin();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "portfolio";

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const artistId = session.role === "admin"
    ? ((body.artistId as string | null) ?? null)
    : (session.artistId ?? null);

  const content = await getContent();

  if (type === "education") {
    const title = (body.title as EducationItem["title"]) ?? { fa: "درس جدید", en: "New lesson" };
    const item: EducationItem = {
      id: `edu-${crypto.randomBytes(6).toString("hex")}`,
      slug: makeUniqueSlug(
        (body.slug as string) || title.en || title.fa,
        content.education,
      ),
      type: (body.type as EducationItem["type"]) ?? "article",
      title,
      excerpt: (body.excerpt as EducationItem["excerpt"]) ?? { fa: "", en: "" },
      body: (body.body as EducationItem["body"]) ?? { fa: "", en: "" },
      image: (body.image as string) ?? "/images/collections/s01.jpg",
      authorId: artistId ?? "",
      difficulty: (body.difficulty as EducationItem["difficulty"]) ?? "beginner",
      durationMin: Number(body.durationMin ?? 30),
      lessons: Number(body.lessons ?? 1),
      categoryId: (body.categoryId as string) ?? content.categories[0]?.id ?? "",
      patternIds: (body.patternIds as string[]) ?? [],
      productIds: (body.productIds as string[]) ?? [],
      featured: false,
      popular: false,
      publishedAt: new Date().toISOString(),
      draftStatus: (body.draftStatus as DraftStatus) ?? "draft",
    };
    await updateCollection("education", [...content.education, item]);
    return NextResponse.json({ ok: true, item }, withNoStore());
  }

  // portfolio
  const title = (body.title as Portfolio["title"]) ?? { fa: "پروژه جدید", en: "New project" };
  const portfolio: Portfolio = {
    id: `pf-${crypto.randomBytes(6).toString("hex")}`,
    slug: makeUniqueSlug(
      (body.slug as string) || title.en || title.fa,
      content.portfolios,
    ),
    title,
    subtitle: (body.subtitle as Portfolio["subtitle"]) ?? { fa: "", en: "" },
    intro: (body.intro as Portfolio["intro"]) ?? { fa: "", en: "" },
    story: (body.story as Portfolio["story"]) ?? [],
    cover: (body.cover as string) ?? "/images/portfolios/pf-bedroom.jpg",
    gallery: (body.gallery as string[]) ?? [],
    artistId,
    patternIds: (body.patternIds as string[]) ?? [],
    productIds: (body.productIds as string[]) ?? [],
    client: (body.client as Portfolio["client"]) ?? { fa: "خصوصی", en: "Private" },
    location: (body.location as Portfolio["location"]) ?? { fa: "", en: "" },
    year: Number(body.year ?? new Date().getFullYear()),
    scope: (body.scope as Portfolio["scope"]) ?? { fa: "", en: "" },
    categoryId: (body.categoryId as string) ?? content.categories[0]?.id ?? "",
    featured: false,
    isProject: Boolean(body.isProject ?? false),
    size: (body.size as Portfolio["size"]) ?? "square",
    draftStatus: (body.draftStatus as DraftStatus) ?? "draft",
  };
  await updateCollection("portfolios", [...content.portfolios, portfolio]);
  return NextResponse.json({ ok: true, portfolio }, withNoStore());
}

/**
 * PATCH /api/artist/drafts
 * Update a draft (edit fields) or change its draftStatus.
 * Artist can: draft → pending_review (submit), pending_review → draft (withdraw).
 * Admin can: pending_review → published | rejected, and set rejectionNote.
 */
export async function PATCH(req: Request) {
  const session = await requireArtistOrAdmin();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> & {
    id?: string;
    _type?: "portfolio" | "education";
  } | null;
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const type = body._type ?? "portfolio";
  const content = await getContent();

  if (type === "education") {
    const idx = content.education.findIndex((e) => e.id === body.id);
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
    }
    const existing = content.education[idx];

    // Ownership check
    if (session.role !== "admin" && existing.authorId !== session.artistId) {
      return unauthorized();
    }

    // Status transition guard for artists
    if (session.role !== "admin" && body.draftStatus !== undefined) {
      const allowed: Partial<Record<DraftStatus, DraftStatus[]>> = {
        draft: ["pending_review"],
        pending_review: ["draft"],
      };
      const from = existing.draftStatus ?? "draft";
      const to = body.draftStatus as DraftStatus;
      if (!allowed[from]?.includes(to)) {
        return NextResponse.json(
          { ok: false, error: "invalid_status_transition" },
          withNoStore({ status: 400 }),
        );
      }
    }

    const updated: EducationItem = {
      ...existing,
      ...body,
      id: existing.id,
      authorId: existing.authorId,
    } as EducationItem;
    const education = content.education.map((e, i) => (i === idx ? updated : e));
    await saveContent({ ...content, education });
    return NextResponse.json({ ok: true, item: updated }, withNoStore());
  }

  // portfolio
  const idx = content.portfolios.findIndex((p) => p.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }
  const existing = content.portfolios[idx];

  if (session.role !== "admin" && existing.artistId !== session.artistId) {
    return unauthorized();
  }

  if (session.role !== "admin" && body.draftStatus !== undefined) {
    const allowed: Partial<Record<DraftStatus, DraftStatus[]>> = {
      draft: ["pending_review"],
      pending_review: ["draft"],
    };
    const from = existing.draftStatus ?? "draft";
    const to = body.draftStatus as DraftStatus;
    if (!allowed[from]?.includes(to)) {
      return NextResponse.json(
        { ok: false, error: "invalid_status_transition" },
        withNoStore({ status: 400 }),
      );
    }
  }

  const updated: Portfolio = { ...existing, ...body, id: existing.id, artistId: existing.artistId } as Portfolio;
  const portfolios = content.portfolios.map((p, i) => (i === idx ? updated : p));
  await saveContent({ ...content, portfolios });
  return NextResponse.json({ ok: true, portfolio: updated }, withNoStore());
}

/** DELETE /api/artist/drafts?id=…&type=portfolio|education */
export async function DELETE(req: Request) {
  const session = await requireArtistOrAdmin();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "portfolio";
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, withNoStore({ status: 400 }));
  }

  const content = await getContent();

  if (type === "education") {
    const item = content.education.find((e) => e.id === id);
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
    if (session.role !== "admin" && item.authorId !== session.artistId) return unauthorized();
    // Only allow deleting drafts (not published content)
    if (session.role !== "admin" && item.draftStatus === "published") {
      return NextResponse.json({ ok: false, error: "cannot_delete_published" }, withNoStore({ status: 403 }));
    }
    await updateCollection("education", content.education.filter((e) => e.id !== id));
    return NextResponse.json({ ok: true }, withNoStore());
  }

  const item = content.portfolios.find((p) => p.id === id);
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  if (session.role !== "admin" && item.artistId !== session.artistId) return unauthorized();
  if (session.role !== "admin" && item.draftStatus === "published") {
    return NextResponse.json({ ok: false, error: "cannot_delete_published" }, withNoStore({ status: 403 }));
  }
  await updateCollection("portfolios", content.portfolios.filter((p) => p.id !== id));
  return NextResponse.json({ ok: true }, withNoStore());
}
