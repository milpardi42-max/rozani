import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getContent, saveContent } from "@/lib/data/store";
import { withNoStore } from "@/lib/http";
import type { Pattern, Product } from "@/lib/types";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function requireArtist() {
  return getSession().then((s) => {
    if (!s || (s.role !== "artist" && s.role !== "admin")) return null;
    return s;
  });
}

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
    .replace(/^-|-$/g, "") || "item";
}

function makeUniqueSlug(base: string, existing: Array<{ slug: string }>) {
  const slug = toSlug(base) || `item-${Date.now().toString(36)}`;
  let candidate = slug;
  let index = 1;

  while (existing.some((item) => item.slug === candidate)) {
    candidate = `${slug}-${index}`;
    index += 1;
  }

  return candidate;
}

/** GET /api/artist/patterns — returns patterns belonging to the logged-in artist */
export async function GET() {
  const session = await requireArtist();
  if (!session) return unauthorized();

  const content = await getContent();

  if (session.role === "admin") {
    return NextResponse.json({ ok: true, patterns: content.patterns, products: content.products, categories: content.categories, spaces: content.spaces }, withNoStore());
  }

  const artistId = session.artistId;
  if (!artistId) {
    return NextResponse.json({ ok: true, patterns: [], products: [], categories: content.categories, spaces: content.spaces }, withNoStore());
  }

  return NextResponse.json(
    {
      ok: true,
      patterns: content.patterns.filter((p) => p.artistId === artistId),
      products: content.products.filter((p) => p.artistId === artistId),
      categories: content.categories,
      spaces: content.spaces,
    },
    withNoStore(),
  );
}

/** POST /api/artist/patterns — create a new pattern */
export async function POST(req: Request) {
  const session = await requireArtist();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> & { _type?: "pattern" | "product" } | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));

  const artistId = session.role === "admin" ? ((body.artistId as string | null) ?? null) : (session.artistId ?? null);
  const content = await getContent();
  const categoryId = (body.categoryId as string | null) ?? (content.categories[0]?.id ?? "");

  if (!categoryId || !content.categories.some((c) => c.id === categoryId)) {
    return NextResponse.json({ ok: false, error: "invalid_category" }, withNoStore({ status: 400 }));
  }

  if (body._type === "product") {
    // Create product
    const title = (body.title as Product["title"]) ?? { fa: "محصول جدید", en: "New product" };
    const product: Product = {
      id: `prod-${crypto.randomBytes(6).toString("hex")}`,
      sku: (body.sku as string) ?? `SKU-${Date.now().toString(36).toUpperCase()}`,
      slug: makeUniqueSlug(
        ((body.slug as string) || title.fa || title.en || `product-${Date.now().toString(36)}`),
        [...content.products, ...content.patterns],
      ),
      title: (body.title as Product["title"]) ?? { fa: "محصول جدید", en: "New product" },
      description: (body.description as Product["description"]) ?? { fa: "", en: "" },
      categoryId,
      patternId: (body.patternId as string | null) ?? null,
      artistId,
      price: (body.price as Product["price"]) ?? { fa: 0, en: 0 },
      compareAt: body.compareAt as Product["compareAt"],
      colors: (body.colors as Product["colors"]) ?? [],
      sizes: (body.sizes as Product["sizes"]) ?? [],
      specs: (body.specs as Product["specs"]) ?? [],
      materials: (body.materials as Product["materials"]) ?? { fa: "", en: "" },
      featured: false,
      bestSeller: false,
      isNew: true,
      order: content.products.length + 1,
    };
    await saveContent({ ...content, products: [...content.products, product] });
    return NextResponse.json({ ok: true, product }, withNoStore());
  }

  // Create pattern
  const b = body as Record<string, unknown>;
  const colorways = (b.colorways as Pattern["colorways"]) ?? [];
  const defaultImage =
    colorways.find((c) => c.isDefault)?.image ||
    colorways[0]?.image ||
    (b.image as string) ||
    "/images/collections/s01.jpg";
  const title = (b.title as Pattern["title"]) ?? { fa: "الگوی جدید", en: "New pattern" };
  const pattern: Pattern = {
    id: `pat-${crypto.randomBytes(6).toString("hex")}`,
    sku: (b.sku as string) ?? `PAT-${Date.now().toString(36).toUpperCase()}`,
    slug: makeUniqueSlug((b.slug as string) || title.fa || title.en || `pattern-${Date.now().toString(36)}`, [...content.products, ...content.patterns]),
    title: (b.title as Pattern["title"]) ?? { fa: "الگوی جدید", en: "New pattern" },
    description: (b.description as Pattern["description"]) ?? { fa: "", en: "" },
    image: defaultImage,
    gallery: (b.gallery as string[]) ?? (colorways.map((c) => c.image).filter(Boolean) as string[]),
    categoryId,
    spaceIds: (b.spaceIds as string[]) ?? [],
    artistId,
    price: (b.price as Pattern["price"]) ?? { fa: 0, en: 0 },
    specs: (b.specs as Pattern["specs"]) ?? {
      repeat: { fa: "تکرار کامل", en: "Full repeat" },
      dpi: "300",
      formats: "PNG, PDF",
      colors: colorways.length || 4,
      scale: { fa: "بزرگ", en: "Large" },
    },
    palette: (b.palette as string[]) ?? colorways.map((c) => c.hex),
    colorways: colorways.length ? colorways : undefined,
    tags: (b.tags as string[]) ?? [],
    featured: false,
    trending: false,
    bestSeller: false,
    isNew: true,
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  await saveContent({ ...content, patterns: [...content.patterns, pattern] });
  return NextResponse.json({ ok: true, pattern }, withNoStore());
}

/** PUT /api/artist/patterns — update an existing item */
export async function PUT(req: Request) {
  const session = await requireArtist();
  if (!session) return unauthorized();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> & { _type?: "pattern" | "product"; id?: string } | null;
  if (!body?.id) return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));

  const content = await getContent();

  if (body._type === "product") {
    const idx = content.products.findIndex((p) => p.id === body.id);
    if (idx === -1) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
    if (session.role !== "admin" && content.products[idx].artistId !== session.artistId) {
      return unauthorized();
    }
    const updated: Product = { ...content.products[idx], ...body } as Product;
    const products = content.products.map((p, i) => (i === idx ? updated : p));
    await saveContent({ ...content, products });
    return NextResponse.json({ ok: true, product: updated }, withNoStore());
  }

  const idx = content.patterns.findIndex((p) => p.id === body.id);
  if (idx === -1) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  if (session.role !== "admin" && content.patterns[idx].artistId !== session.artistId) {
    return unauthorized();
  }
  const updated: Pattern = { ...content.patterns[idx], ...body } as Pattern;
  const patterns = content.patterns.map((p, i) => (i === idx ? updated : p));
  await saveContent({ ...content, patterns });
  return NextResponse.json({ ok: true, pattern: updated }, withNoStore());
}

/** DELETE /api/artist/patterns?id=…&type=pattern|product */
export async function DELETE(req: Request) {
  const session = await requireArtist();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") ?? "pattern";
  if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, withNoStore({ status: 400 }));

  const content = await getContent();

  if (type === "product") {
    const item = content.products.find((p) => p.id === id);
    if (!item) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
    if (session.role !== "admin" && item.artistId !== session.artistId) return unauthorized();
    await saveContent({ ...content, products: content.products.filter((p) => p.id !== id) });
    return NextResponse.json({ ok: true }, withNoStore());
  }

  const item = content.patterns.find((p) => p.id === id);
  if (!item) return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  if (session.role !== "admin" && item.artistId !== session.artistId) return unauthorized();
  await saveContent({ ...content, patterns: content.patterns.filter((p) => p.id !== id) });
  return NextResponse.json({ ok: true }, withNoStore());
}
