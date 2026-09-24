import type { Pattern, Product } from "../types";

export type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function filterPatterns(list: Pattern[], sp: SP, categorySlugToId: Record<string, string>, spaceSlugToId: Record<string, string>) {
  let out = list.slice();
  const cat = one(sp.category);
  const space = one(sp.space);
  const owner = one(sp.owner);
  const q = one(sp.q)?.toLowerCase();
  if (cat && categorySlugToId[cat]) out = out.filter((p) => p.categoryId === categorySlugToId[cat]);
  if (space && spaceSlugToId[space]) out = out.filter((p) => p.spaceIds.includes(spaceSlugToId[space]));
  if (owner === "site") out = out.filter((p) => !p.artistId);
  if (owner === "artist") out = out.filter((p) => !!p.artistId);
  if (q) out = out.filter((p) => p.title.fa.includes(q) || p.title.en.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  const sort = one(sp.sort);
  if (sort === "new") out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  else if (sort === "trending") out.sort((a, b) => Number(b.trending) - Number(a.trending) || b.likes - a.likes);
  else if (sort === "best") out.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller) || b.likes - a.likes);
  else if (sort === "price-asc") out.sort((a, b) => a.price.en - b.price.en);
  else if (sort === "price-desc") out.sort((a, b) => b.price.en - a.price.en);
  else if (sort === "popular") out.sort((a, b) => b.likes - a.likes);
  return out;
}

export function filterProducts(
  list: Product[],
  sp: SP,
  categorySlugToId: Record<string, string>,
  /* Product families (wallpaper / curtain / …) — see `lib/data/families.ts`. */
  familySlugToId: Record<string, string> = {},
) {
  let out = list.slice().sort((a, b) => a.order - b.order);
  const cat = one(sp.category);
  const owner = one(sp.owner);
  const family = one(sp.family);
  if (cat && categorySlugToId[cat]) out = out.filter((p) => p.categoryId === categorySlugToId[cat]);
  if (family && familySlugToId[family]) out = out.filter((p) => p.familyId === familySlugToId[family]);
  if (family === "other") out = out.filter((p) => !p.familyId);
  if (owner === "site") out = out.filter((p) => !p.artistId);
  if (owner === "artist") out = out.filter((p) => !!p.artistId);
  const sort = one(sp.sort);
  if (sort === "new") out.sort((a, b) => Number(b.isNew) - Number(a.isNew));
  else if (sort === "best") out.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
  else if (sort === "price-asc") out.sort((a, b) => a.price.en - b.price.en);
  else if (sort === "price-desc") out.sort((a, b) => b.price.en - a.price.en);
  return out;
}
