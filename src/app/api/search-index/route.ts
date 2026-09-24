import { NextResponse } from "next/server";
import { getContent } from "@/lib/data/store";

/**
 * Public search index — served as a standalone endpoint so the full content listing no longer
 * rides along in the RSC payload of *every* page (SearchPalette fetches it lazily on first use).
 *
 * Locale-agnostic on purpose: documents carry both `fa`/`en` strings and the client picks one,
 * so a single cache entry serves both languages. Admin edits appear within `max-age` (or instantly
 * after a redeploy, which flushes the cache).
 */
export const revalidate = 300;

export async function GET() {
  const site = await getContent();
  const body = {
    patterns: site.patterns.map(({ slug, title, image, sku }) => ({ slug, title, image, sku })),
    products: site.products.map(({ slug, title, sku, colors }) => ({ slug, title, sku, image: colors[0]?.image ?? "" })),
    artists: site.artists.map(({ slug, name, profession, avatar }) => ({ slug, name, profession, avatar })),
    portfolios: site.portfolios.map(({ slug, title, cover }) => ({ slug, title, cover })),
    education: site.education.map(({ slug, title, image, type }) => ({ slug, title, image, type })),
    categories: site.categories.map(({ slug, name, image }) => ({ slug, name, image })),
  };
  return NextResponse.json(body, {
    headers: { "cache-control": "public, max-age=300, s-maxage=300" },
  });
}
