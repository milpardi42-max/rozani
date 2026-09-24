import { bumpAssetViews, filterAssets, getAsset, getAssets, isPurchasable, listPublicAssets } from "@/lib/marketplace/assets";
import { hasRtl } from "@/lib/marketplace/pdf/textpath";
import { recordEvent } from "@/lib/marketplace/analytics";
import { json, numberParam } from "@/lib/marketplace/guard";
import { assetColourways, assetFormatIds } from "@/lib/marketplace/colourways";
import type { Asset } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/assets         → public catalogue
 * GET /api/marketplace/assets?id=…    → one asset (also records a view event)
 *
 * Only approved, public works are exposed; the master object key is never
 * returned — just the watermarked derivative keys.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const slug = url.searchParams.get("slug");

  if (id || slug) {
    const asset = id ? await getAsset(id) : (await getAssets()).find((item) => item.slug === slug) ?? null;
    if (!asset || (asset.status !== "approved" && asset.status !== "sold_exclusive")) {
      return json({ ok: false, error: "not_found" }, { status: 404 });
    }
    if (asset.status === "approved") {
      void bumpAssetViews(asset.id);
      void recordEvent({ kind: "view", assetId: asset.id, artistId: asset.artistId });
    }
    return json({ ok: true, asset: present(asset, true) });
  }

  const kinds = url.searchParams.getAll("kind").filter(Boolean) as Asset["kind"][];
  const tag = url.searchParams.get("tag") ?? undefined;
  const search = url.searchParams.get("q") ?? undefined;
  const sort = (url.searchParams.get("sort") ?? "recent") as "recent" | "price" | "popular";
  const limit = Math.min(Math.max(numberParam(url, "limit", 24), 1), 60);

  let assets = filterAssets(await listPublicAssets(), { kind: kinds.length ? kinds : undefined, tag, search });
  if (sort === "popular") assets = assets.sort((a, b) => b.stats.sales - a.stats.sales || b.stats.views - a.stats.views);
  if (sort === "price") {
    const floor = (asset: Asset) => Math.min(...asset.tiers.filter((tier) => tier.enabled).map((tier) => tier.price.fa), Number.MAX_SAFE_INTEGER);
    assets = assets.sort((a, b) => floor(a) - floor(b));
  }

  const total = assets.length;
  const page = Math.max(1, numberParam(url, "page", 1));
  const slice = assets.slice((page - 1) * limit, page * limit);

  return json({
    ok: true,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
    assets: slice.map((asset) => present(asset, false)),
  });
}

/** Public projection — no master key, no private review notes. */
function present(asset: Asset, full: boolean) {
  const tiers = asset.tiers.filter((tier) => tier.enabled && !(tier.exclusive && asset.status === "sold_exclusive"));
  const prices = tiers.map((tier) => tier.price.fa).filter((value) => value > 0);

  return {
    id: asset.id,
    slug: asset.slug,
    title: asset.title,
    description: asset.description,
    kind: asset.kind,
    tags: asset.tags,
    status: asset.status,
    soldExclusive: asset.status === "sold_exclusive",
    purchasable: isPurchasable(asset),
    createdAt: asset.createdAt,
    artistId: asset.artistId,
    stats: { views: asset.stats.views, sales: asset.stats.sales },
    fromPrice: prices.length ? { fa: Math.min(...prices), en: Math.min(...tiers.map((tier) => tier.price.en).filter((value) => value > 0)) } : null,
    tiers: full
      ? tiers.map((tier) => ({
          id: tier.id,
          kind: tier.kind,
          title: tier.title,
          terms: tier.terms,
          price: tier.price,
          maxDownloads: tier.maxDownloads,
          maxUnits: tier.maxUnits,
          exclusive: tier.exclusive,
          /** Persian terms need the outline renderer for print previews. */
          rtl: hasRtl(tier.terms.fa),
        }))
      : tiers.map((tier) => ({ id: tier.id, kind: tier.kind, title: tier.title, price: tier.price, exclusive: tier.exclusive })),
    media: {
      preview: asset.previewKey ?? null,
      tile: asset.tileKey ?? null,
      thumbs: asset.derivatives.filter((file) => file.kind === "thumb").map((file) => file.key),
      mockups: full ? asset.mockups.map((file) => ({ key: file.key, kind: file.kind, variant: file.variant })) : [],
    },
    formats: assetFormatIds(asset),
    colourways: assetColourways(asset).map((colourway) => ({ hex: colourway.hex, name: colourway.name })),
    seamless: {
      verdict: asset.seamless.verdict,
      score: asset.seamless.score,
      tileable: asset.seamless.tileable,
    },
    file: full
      ? {
          mime: asset.master.mime,
          sizeBytes: asset.master.sizeBytes,
          width: asset.master.width,
          height: asset.master.height,
          sha256: asset.master.sha256,
        }
      : undefined,
  };
}
