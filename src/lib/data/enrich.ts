import type { Artist, EducationItem, Pattern, Portfolio, Product, SiteContent } from "../types";

export type Enriched<T> = T & { artist: Artist | null };

export function artistOf(site: SiteContent, id: string | null): Artist | null {
  if (!id) return null;
  return site.artists.find((a) => a.id === id) ?? null;
}
export function categoryOf(site: SiteContent, id: string) {
  return site.categories.find((c) => c.id === id) ?? null;
}
export function patternById(site: SiteContent, id: string) {
  return site.patterns.find((p) => p.id === id) ?? null;
}
export function productById(site: SiteContent, id: string) {
  return site.products.find((p) => p.id === id) ?? null;
}

const ACADEMY_HOST: Artist = {
  id: "artist-razieh-khairipour",
  slug: "razieh-khairipour",
  name: { fa: "راضیه خیری پور", en: "Razieh Khairipour" },
  profession: { fa: "مدرس و میزبان آکادمی", en: "Academy instructor and host" },
  bio: { fa: "مدرس و میزبان ورکشاپ‌ها و وبینارهای آکادمی رزی.", en: "Instructor and host of Rosie Academy workshops and webinars." },
  avatar: "/images/education/e01.jpg",
  cover: "/images/education/e01.jpg",
  location: { fa: "تهران", en: "Tehran" },
  social: {},
  featured: false,
  followers: 0,
  rating: 5,
  reviewsCount: 0,
};
export function portfolioById(site: SiteContent, id: string) {
  return site.portfolios.find((p) => p.id === id) ?? null;
}

export function enrichPattern(site: SiteContent, p: Pattern) {
  return { ...p, artist: artistOf(site, p.artistId), category: categoryOf(site, p.categoryId) };
}
export function enrichProduct(site: SiteContent, p: Product) {
  return { ...p, artist: artistOf(site, p.artistId), category: categoryOf(site, p.categoryId), pattern: p.patternId ? patternById(site, p.patternId) : null };
}
export function enrichPortfolio(site: SiteContent, p: Portfolio) {
  return {
    ...p,
    artist: artistOf(site, p.artistId),
    category: categoryOf(site, p.categoryId),
    patterns: p.patternIds.map((id) => patternById(site, id)).filter(Boolean) as Pattern[],
    products: p.productIds.map((id) => productById(site, id)).filter(Boolean) as Product[],
  };
}
export function enrichEducation(site: SiteContent, e: EducationItem) {
  const author = e.type === "workshop" || e.type === "webinar"
    ? site.artists.find((artist) => artist.id === "artist-razieh-khairipour") ?? ACADEMY_HOST
    : artistOf(site, e.authorId);
  return {
    ...e,
    author,
    category: categoryOf(site, e.categoryId),
    patterns: e.patternIds.map((id) => patternById(site, id)).filter(Boolean) as Pattern[],
    products: e.productIds.map((id) => productById(site, id)).filter(Boolean) as Product[],
  };
}

export function artistStats(site: SiteContent, artistId: string) {
  return {
    patterns: site.patterns.filter((p) => p.artistId === artistId),
    products: site.products.filter((p) => p.artistId === artistId),
    portfolios: site.portfolios.filter((p) => p.artistId === artistId),
    education: site.education.filter((e) => e.authorId === artistId),
  };
}

export type EnrichedPattern = ReturnType<typeof enrichPattern>;
export type EnrichedProduct = ReturnType<typeof enrichProduct>;
export type EnrichedPortfolio = ReturnType<typeof enrichPortfolio>;
export type EnrichedEducation = ReturnType<typeof enrichEducation>;
