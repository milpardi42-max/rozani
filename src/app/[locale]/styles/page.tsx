import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { StyleCard } from "@/components/cards/StyleCard";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { faNum, href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.styles };
}

export default async function StylesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const cats = site.categories.slice().sort((a, b) => a.order - b.order);
  return (
    <>
      <PageHero eyebrow={d.nav.styles} title={d.home.stylesTitle} description={d.home.stylesDesc} />
      <div className="container-x pb-20">
        <BentoGrid rows="auto-rows-[200px] md:auto-rows-[240px]">
          {cats.map((c, i) => {
            const n = site.patterns.filter((p) => p.categoryId === c.id).length;
            const span = i % 5 === 0 ? "col-span-2 row-span-2 md:col-span-3 lg:col-span-6 lg:row-span-2" : i % 5 === 3 ? "col-span-2 md:col-span-3 lg:col-span-6" : "col-span-1 md:col-span-3 lg:col-span-3";
            return <StyleCard key={c.id} big={i % 5 === 0} href={href(locale, `/styles/${c.slug}`)} title={t(c.name, locale)} description={t(c.description, locale)} image={c.image} className={span} count={`${locale === "fa" ? faNum(n) : n} ${d.common.patterns}`} />;
          })}
        </BentoGrid>
      </div>
    </>
  );
}
