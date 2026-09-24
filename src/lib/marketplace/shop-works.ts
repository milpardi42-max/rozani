/**
 * Published artist works inside the shop (`/shop`).
 *
 * The shop sells physical products from the site content; artists sell
 * *digital works* (licensed files) through the marketplace. Every work is filed
 * under a product family at upload time, and the shop is where artists and
 * buyers look for that family — so once a work is published it is listed there
 * too, next to the products of its family, and links to its licence page
 * (`/marketplace/<slug>`), never to the physical cart.
 *
 * This module is browser-safe (types + filtering); the server-side projection
 * lives in `shop-works-server.ts`.
 */

import type { Localized } from "@/lib/i18n/types";

export interface ShopWork {
  kind: "work";
  id: string;
  slug: string;
  title: Localized;
  /** Product family chosen on upload — decides the shop section it appears in. */
  familyId: string | null;
  artistId: string | null;
  artistName: Localized | null;
  /** Public, watermarked preview (`/api/marketplace/media?key=…`). */
  image: string | null;
  /** Cheapest enabled licence. */
  fromPrice: { fa: number; en: number } | null;
  colourways: { hex: string; name: Localized }[];
  /** Deliverable formats (png, jpg, ai, …). */
  formats: string[];
  createdAt: string;
  /** Published within the last 30 days. */
  isNew: boolean;
  sales: number;
  seamless: boolean;
}

type SP = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Applies the shop's query string to works, mirroring `filterProducts`:
 * `family` and `owner` filter works exactly like products; a physical
 * `category` (wallpaper rolls, fabric by the metre…) does not apply to digital
 * files, so an active category filter shows products only.
 */
export function filterShopWorks(
  list: ShopWork[],
  sp: SP,
  categorySlugToId: Record<string, string>,
  familySlugToId: Record<string, string>,
): ShopWork[] {
  const category = one(sp.category);
  if (category && categorySlugToId[category]) return [];
  let out = list.slice();
  const family = one(sp.family);
  const owner = one(sp.owner);
  if (family && familySlugToId[family]) out = out.filter((work) => work.familyId === familySlugToId[family]);
  if (family === "other") out = out.filter((work) => !work.familyId);
  if (owner === "site") out = out.filter((work) => !work.artistId);
  if (owner === "artist") out = out.filter((work) => Boolean(work.artistId));
  return out;
}
