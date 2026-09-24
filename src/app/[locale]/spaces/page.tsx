import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { StyleCard } from "@/components/cards/StyleCard";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { faNum, href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.spaces };
}
export default async function SpacesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  return (
    <>
      <PageHero eyebrow={d.nav.spaces} title={d.home.spacesTitle} description={d.home.spacesDesc} />
      <div className="container-x grid grid-cols-2 gap-4 pb-20 md:grid-cols-3">
        {site.spaces.sort((a, b) => a.order - b.order).map((s, i) => {
          const n = site.patterns.filter((p) => p.spaceIds.includes(s.id)).length;
          return <StyleCard key={s.id} href={href(locale, `/spaces/${s.slug}`)} title={t(s.name, locale)} image={s.image} className={i === 0 ? "col-span-2 aspect-[16/9] md:aspect-[2/1]" : "aspect-[4/5] md:aspect-[4/3]"} big={i === 0} count={`${locale === "fa" ? faNum(n) : n} ${d.common.patterns}`} />;
        })}
      </div>
    </>
  );
}
