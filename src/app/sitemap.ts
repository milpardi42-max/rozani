import type { MetadataRoute } from "next";
import { getContent } from "@/lib/data/store";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/i18n/types";

/** Static route segments of the storefront (locale-prefixed). Admin/checkout/account are excluded. */
const STATIC_PAGES = [
  "", "about", "academy", "artists", "collections", "contact", "creators/join", "custom",
  "faq", "patterns", "portfolio", "projects", "razieh", "returns", "shop", "spaces", "stories", "styles",
] as const;

/** collection (key of SiteContent) → route segment its detail pages live under */
const slugCollections = (site: SiteContentLike): [string, { slug: string }[]][] => [
  ["patterns", site.patterns],
  ["shop", site.products],
  ["artists", site.artists],
  ["portfolio", site.portfolios],
  ["academy", site.education],
  ["collections", site.collections],
  ["stories", site.stories],
  ["spaces", site.spaces],
  ["styles", site.categories],
];

interface SiteContentLike {
  patterns: { slug: string }[];
  products: { slug: string }[];
  artists: { slug: string }[];
  portfolios: { slug: string }[];
  education: { slug: string }[];
  collections: { slug: string }[];
  stories: { slug: string }[];
  spaces: { slug: string }[];
  categories: { slug: string }[];
}

const LEGAL_DOCS = ["privacy", "terms", "licenses"];

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Refresh hourly so admin-created slugs appear without a redeploy. */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getContent();
  const url = (l: Locale, path: string) => `${SITE_URL}/${l}${path ? `/${path}` : ""}`;

  const entries: MetadataRoute.Sitemap = [];

  for (const page of STATIC_PAGES) {
    entries.push({
      url: url(DEFAULT_LOCALE, page),
      changeFrequency: "weekly",
      priority: page === "" ? 1 : 0.7,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, url(l, page)])) },
    });
  }

  for (const [segment, items] of slugCollections(site)) {
    for (const item of items) {
      const path = `${segment}/${item.slug}`;
      entries.push({
        url: url(DEFAULT_LOCALE, path),
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, url(l, path)])) },
      });
    }
  }

  for (const doc of LEGAL_DOCS) {
    entries.push({
      url: url(DEFAULT_LOCALE, `legal/${doc}`),
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, url(l, `legal/${doc}`)])) },
    });
  }

  return entries;
}
