import type { Localized } from "@/lib/i18n/types";
import type { ColorOption, ProductSpec } from "@/lib/types";

/** Serializable subset of site content used by the header, mega menu, store dropdown and search palette. */
export interface NavData {
  categories: { slug: string; name: Localized; image: string }[];
  spaces: { slug: string; name: Localized; image: string }[];
  artists: { slug: string; name: Localized; profession: Localized; avatar: string }[];
  patterns: { slug: string; title: Localized; image: string; sku: string }[];
  portfolios: { slug: string; title: Localized; cover: string }[];
  education: { slug: string; title: Localized; image: string; type: string }[];
  collections: { slug: string; title: Localized; cover: string }[];
  storeProducts: {
    id: string;
    slug: string;
    sku: string;
    title: Localized;
    price: { fa: number; en: number };
    colors: ColorOption[];
    specs: ProductSpec[];
    siteOwned: boolean;
  }[];
}
