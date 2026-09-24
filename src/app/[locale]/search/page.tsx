import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { PatternGrid, ProductGrid } from "@/components/product/Grids";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EducationCard } from "@/components/cards/EducationCard";
import { EmptyState } from "@/components/ui/States";
import { enrichEducation, enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.search };
}
export const dynamic = "force-dynamic";

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string }> }) {
  const [{ locale }, { q = "" }] = await Promise.all([params, searchParams]);
  const site = await getSite();
  const d = dictionaries[locale];
  const s = q.trim().toLowerCase();
  const m = (l: { fa: string; en: string }) => !s || l.fa.includes(s) || l.en.toLowerCase().includes(s);
  const patterns = site.patterns.filter((p) => m(p.title) || p.sku.toLowerCase().includes(s)).map((p) => enrichPattern(site, p));
  const products = site.products.filter((p) => m(p.title) || p.sku.toLowerCase().includes(s)).map((p) => enrichProduct(site, p));
  const education = site.education.filter((e) => m(e.title)).map((e) => enrichEducation(site, e));
  const total = patterns.length + products.length + education.length;

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.search },
  ];

  return (
    <>
      <PageHero
        eyebrow={d.nav.search}
        title={s ? `"${q}"` : d.nav.search}
        description={`${total} ${d.common.results}`}
        breadcrumb={breadcrumb}
        locale={locale}
      >
        <form action="" className="flex max-w-lg gap-2"><input name="q" defaultValue={q} placeholder={d.search.placeholder} className="h-12 w-full rounded-full border border-border bg-surface px-5 text-sm focus:border-foreground focus:outline-none" /><button className="h-12 rounded-full bg-foreground px-6 text-sm font-medium text-background">{d.nav.search}</button></form>
      </PageHero>
      <div className="container-x space-y-16 pb-20">
        {total === 0 && <EmptyState title={d.search.noResults} />}
        {patterns.length > 0 && <section><SectionHeader title={d.nav.patterns} /><div className="mt-6"><PatternGrid patterns={patterns} /></div></section>}
        {products.length > 0 && <section><SectionHeader title={d.nav.products} /><div className="mt-6"><ProductGrid products={products} /></div></section>}
        {education.length > 0 && <section><SectionHeader title={d.nav.education} /><div className="mt-6 grid gap-5 md:grid-cols-3">{education.map((e) => <EducationCard key={e.id} item={e} />)}</div></section>}
      </div>
    </>
  );
}
