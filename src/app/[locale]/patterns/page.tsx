import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { CatalogLayout, FilterSidebar } from "@/components/product/FilterSidebar";
import { PatternGrid } from "@/components/product/Grids";
import { GridSkeleton } from "@/components/ui/States";
import { enrichPattern, getSite } from "@/lib/data/queries";
import { filterPatterns, type SP } from "@/lib/data/filters";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/patterns");
  return { title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.patterns, description: m ? t(m.description, locale) : undefined };
}

export default async function PatternsPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SP> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const site = await getSite();
  const d = dictionaries[locale];
  const fa = locale === "fa";
  const catMap = Object.fromEntries(site.categories.map((c) => [c.slug, c.id]));
  const spaceMap = Object.fromEntries(site.spaces.map((s) => [s.slug, s.id]));
  const list = filterPatterns(site.patterns, sp, catMap, spaceMap).map((p) => enrichPattern(site, p));

  // counts per category (unfiltered base, for sidebar badges)
  const base = site.patterns;
  const categories = site.categories
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.slug,
      label: t(c.name, locale),
      count: base.filter((p) => p.categoryId === c.id).length,
    }));

  const sorts = [
    { id: "new", label: d.common.new },
    { id: "trending", label: d.common.trending },
    { id: "best", label: d.common.bestSeller },
    { id: "popular", label: fa ? "محبوب‌ترین" : "Most liked" },
    { id: "price-asc", label: fa ? "ارزان‌ترین" : "Price: low to high" },
    { id: "price-desc", label: fa ? "گران‌ترین" : "Price: high to low" },
  ];

  const extra = [
    {
      key: "space",
      label: d.nav.spaces,
      options: site.spaces.map((s) => ({
        id: s.slug,
        label: t(s.name, locale),
        count: base.filter((p) => p.spaceIds.includes(s.id)).length,
      })),
    },
    {
      key: "owner",
      label: d.common.creator,
      options: [
        { id: "artist", label: d.nav.artists, count: base.filter((p) => !!p.artistId).length },
        { id: "site", label: d.brand, count: base.filter((p) => !p.artistId).length },
      ],
    },
  ];

  return (
    <>
      <PageHero eyebrow={d.home.discoveryEyebrow} title={d.nav.patterns} description={d.home.discoveryDesc} />
      <div className="container-x pb-20">
        <Suspense fallback={<GridSkeleton />}>
          <CatalogLayout
            sidebar={
              <FilterSidebar
                total={list.length}
                categories={categories}
                sorts={sorts}
                extra={extra}
                title={fa ? "کشف الگو" : "Discover patterns"}
                mobileLabel={fa ? "فیلتر الگوها" : "Filter patterns"}
              />
            }
          >
            <div className="mt-2 lg:mt-0">
              <PatternGrid patterns={list} />
            </div>
          </CatalogLayout>
        </Suspense>
      </div>
    </>
  );
}
