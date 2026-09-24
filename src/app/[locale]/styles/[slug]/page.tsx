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
  return LOCALES.flatMap((locale) => site.categories.map((category) => ({ locale, slug: category.slug })));
}
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const c = site.categories.find((x) => x.slug === slug);
  return c ? { title: t(c.name, locale), description: t(c.description, locale) } : {};
}

export default async function StylePage({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const c = site.categories.find((x) => x.slug === slug);
  if (!c) notFound();
  const d = dictionaries[locale];
  const patterns = site.patterns.filter((p) => p.categoryId === c.id).map((p) => enrichPattern(site, p));
  const products = site.products.filter((p) => p.categoryId === c.id).map((p) => enrichProduct(site, p));
  const breadcrumb: BreadcrumbItem[] = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.styles, href: href(locale, "/styles") },
    { label: t(c.name, locale) },
  ];

  return (
    <>
      <PageHero eyebrow={d.nav.styles} title={t(c.name, locale)} description={t(c.description, locale)} image={c.image} breadcrumb={breadcrumb} locale={locale} />
      <section className="container-x section-y">
        <SectionHeader eyebrow={d.nav.patterns} title={`${t(c.name, locale)} · ${d.nav.patterns}`} href={href(locale, `/patterns?category=${c.slug}`)} hrefLabel={d.nav.viewAll} />
        <div className="mt-8"><PatternGrid patterns={patterns} /></div>
      </section>
      {products.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.products} title={d.common.relatedProducts} href={href(locale, `/shop?category=${c.slug}`)} hrefLabel={d.nav.viewAll} />
          <div className="mt-8"><ProductGrid products={products} /></div>
        </section>
      )}
    </>
  );
}
