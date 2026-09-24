import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { FavoritesView } from "@/components/profile/FavoritesView";
import { enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].common.favorite };
}
export const dynamic = "force-dynamic";

export default async function FavoritesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  return (
    <>
      <PageHero eyebrow={d.nav.account} title={d.common.favorite} />
      <div className="container-x pb-20"><FavoritesView patterns={site.patterns.map((p) => enrichPattern(site, p))} products={site.products.map((p) => enrichProduct(site, p))} /></div>
    </>
  );
}
