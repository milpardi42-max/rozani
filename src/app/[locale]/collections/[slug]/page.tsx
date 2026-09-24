import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { PatternGrid, ProductGrid } from "@/components/product/Grids";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";
import type { BreadcrumbItem } from "@/components/ui/Breadcrumb";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.collections.map((collection) => ({ locale, slug: collection.slug })));
}
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const c = site.collections.find((x) => x.slug === slug);
  return c ? { title: t(c.title, locale), description: t(c.description, locale) } : {};
}
export default async function CollectionPage({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const c = site.collections.find((x) => x.slug === slug);
  if (!c) notFound();
  const d = dictionaries[locale];
  const patterns = c.patternIds.map((id) => site.patterns.find((p) => p.id === id)).filter(Boolean).map((p) => enrichPattern(site, p!));
  const products = c.productIds.map((id) => site.products.find((p) => p.id === id)).filter(Boolean).map((p) => enrichProduct(site, p!));
  const breadcrumb: BreadcrumbItem[] = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.collections, href: href(locale, "/collections") },
    { label: t(c.title, locale) },
  ];
  return (
    <>
      <PageHero eyebrow={d.nav.collections} title={t(c.title, locale)} description={t(c.description, locale)} image={c.cover} breadcrumb={breadcrumb} locale={locale} />
      {patterns.length > 0 && <section className="container-x section-y"><SectionHeader eyebrow={d.nav.patterns} title={d.nav.patterns} /><div className="mt-8"><PatternGrid patterns={patterns} /></div></section>}
      {products.length > 0 && <section className="bg-background-secondary"><div className="container-x section-y"><SectionHeader eyebrow={d.nav.products} title={d.common.products} /><div className="mt-8"><ProductGrid products={products} /></div></div></section>}
    </>
  );
}
