import "server-only";
import { listPublicAssets } from "./assets";
import { assetColourways, assetFormatIds } from "./colourways";
import type { ShopWork } from "./shop-works";
import type { Artist } from "@/lib/types";

const NEW_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Every work a buyer can license right now (approved, public, at least one
 * enabled licence), projected for the shop. Newest first. Never throws: the
 * shop still renders its products if the marketplace store is unavailable.
 */
export async function listShopWorks(site: { artists: Artist[] }): Promise<ShopWork[]> {
  const assets = await listPublicAssets().catch(() => []);
  const now = Date.now();
  return assets.map((asset): ShopWork => {
    const tiers = asset.tiers.filter((tier) => tier.enabled);
    const fa = tiers.map((tier) => tier.price.fa).filter((value) => value > 0);
    const en = tiers.map((tier) => tier.price.en).filter((value) => value > 0);
    const artist = asset.artistId ? site.artists.find((item) => item.id === asset.artistId) ?? null : null;
    return {
      kind: "work",
      id: asset.id,
      slug: asset.slug,
      title: asset.title,
      familyId: asset.familyId ?? null,
      artistId: asset.artistId,
      artistName: artist?.name ?? null,
      image: asset.previewKey ? `/api/marketplace/media?key=${encodeURIComponent(asset.previewKey)}` : null,
      fromPrice: fa.length && en.length ? { fa: Math.min(...fa), en: Math.min(...en) } : null,
      colourways: assetColourways(asset).map((colourway) => ({ hex: colourway.hex, name: colourway.name })),
      formats: assetFormatIds(asset),
      createdAt: asset.createdAt,
      isNew: now - Date.parse(asset.createdAt) < NEW_FOR_MS,
      sales: asset.stats.sales,
      seamless: asset.seamless.verdict === "seamless",
    };
  });
}
