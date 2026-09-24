import "server-only";
import type { NavData } from "@/components/layout/nav-data";
import { getSite } from "./queries";

export async function getNavData(): Promise<NavData> {
  const site = await getSite();
  return {
    categories: site.categories.filter((c) => c.featured).sort((a, b) => a.order - b.order).map(({ slug, name, image }) => ({ slug, name, image })),
    spaces: site.spaces.map(({ slug, name, image }) => ({ slug, name, image })),
    artists: site.artists.map(({ slug, name, profession, avatar }) => ({ slug, name, profession, avatar })),
    patterns: site.patterns.map(({ slug, title, image, sku }) => ({ slug, title, image, sku })),
    portfolios: site.portfolios.map(({ slug, title, cover }) => ({ slug, title, cover })),
    education: site.education.map(({ slug, title, image, type }) => ({ slug, title, image, type })),
    collections: site.collections.map(({ slug, title, cover }) => ({ slug, title, cover })),
    storeProducts: site.products
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((p) => ({ id: p.id, slug: p.slug, sku: p.sku, title: p.title, price: p.price, colors: p.colors, specs: p.specs, siteOwned: !p.artistId })),
  };
}
