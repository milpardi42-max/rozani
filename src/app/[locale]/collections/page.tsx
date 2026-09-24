import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { StyleCard } from "@/components/cards/StyleCard";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.collections };
}
export default async function CollectionsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  return (
    <>
      <PageHero eyebrow={d.nav.collections} title={d.nav.collections} description={locale === "fa" ? "گزیده‌هایی ویراسته از الگوها و محصولات، حول یک حال‌وهوا." : "Curated selections of patterns and products, around a single mood."} />
      <div className="container-x grid gap-5 pb-20 md:grid-cols-3">
        {site.collections.map((c, i) => <StyleCard key={c.id} href={href(locale, `/collections/${c.slug}`)} title={t(c.title, locale)} description={t(c.description, locale)} image={c.cover} className={i === 0 ? "aspect-[4/5] md:col-span-2 md:aspect-[16/9]" : "aspect-[4/5]"} big={i === 0} />)}
      </div>
    </>
  );
}
