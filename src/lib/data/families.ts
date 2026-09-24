import type { Locale, Localized } from "../i18n/types";

/**
 * Product families — the eight real categories a pattern (الگو) can be made for.
 *
 * This is the taxonomy the whole surface business runs on:
 *   • the artist picks one when uploading a master (`MasterUploader`),
 *   • the marketplace asset stores it (`Asset.familyId`),
 *   • the shop groups its cards by it and shows the list under «الگو» in the sidebar,
 *   • the admin can re-classify any product with it.
 *
 * The order is meaningful — it is the order the shop and the upload form use.
 */
export interface ProductFamily {
  id: string;
  slug: string;
  name: Localized;
  order: number;
}

export const PRODUCT_FAMILIES: ProductFamily[] = [
  { id: "fam-wallpaper", slug: "wallpaper", name: { fa: "کاغذ دیواری", en: "Wallpaper" }, order: 1 },
  { id: "fam-home-fabric", slug: "home-fabric", name: { fa: "پارچه دکوراسیون داخلی", en: "Home Fabric" }, order: 2 },
  { id: "fam-curtain", slug: "curtain", name: { fa: "پرده", en: "Curtain" }, order: 3 },
  { id: "fam-cushion", slug: "cushion", name: { fa: "کوسن", en: "Cushion" }, order: 4 },
  { id: "fam-bedding", slug: "bedding", name: { fa: "روتختی", en: "Bedspread" }, order: 5 },
  { id: "fam-tablecloth", slug: "tablecloth", name: { fa: "رومیزی", en: "Tablecloth" }, order: 6 },
  { id: "fam-upholstery", slug: "upholstery-fabric", name: { fa: "پارچه مبلمان", en: "Upholstery Fabric" }, order: 7 },
  { id: "fam-wall-art", slug: "wall-art", name: { fa: "آثار هنری دیواری", en: "Wall Art" }, order: 8 },
];

/** The parent these families hang under — «الگو» (the pattern). */
export const FAMILY_PARENT: Localized = { fa: "الگو", en: "Pattern" };

/** Label for products that are not classified in any family yet. */
export const FAMILY_OTHER: Localized = { fa: "سایر محصولات", en: "Other products" };

export const FAMILY_IDS: string[] = PRODUCT_FAMILIES.map((family) => family.id);

export function familyById(id: string | null | undefined): ProductFamily | null {
  if (!id) return null;
  return PRODUCT_FAMILIES.find((family) => family.id === id) ?? null;
}

export function familyBySlug(slug: string | null | undefined): ProductFamily | null {
  if (!slug) return null;
  return PRODUCT_FAMILIES.find((family) => family.slug === slug) ?? null;
}

export function familyName(id: string | null | undefined, locale: Locale): string {
  const family = familyById(id);
  return family ? family.name[locale] ?? family.name.fa : "";
}

export function isFamilyId(value: unknown): boolean {
  return typeof value === "string" && FAMILY_IDS.includes(value);
}

/** Families in canonical order, optionally only those with a non-zero count. */
export function familiesWithCounts(counts: Record<string, number>, onlyNonEmpty = false): ProductFamily[] {
  return PRODUCT_FAMILIES.filter((family) => !onlyNonEmpty || (counts[family.id] ?? 0) > 0).sort((a, b) => a.order - b.order);
}
