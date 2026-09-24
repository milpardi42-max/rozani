import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, RotateCcw, Truck } from "lucide-react";
import { ProductBuyBox } from "@/components/product/ProductBuyBox";
import { ProductCard } from "@/components/cards/ProductCard";
import { PatternCard } from "@/components/cards/PatternCard";
import { Badge, Sku } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.products.map((product) => ({ locale, slug: product.slug })));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const p = site.products.find((x) => x.slug === slug);
  return p ? { title: t(p.title, locale), description: t(p.description, locale) } : {};
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const raw = site.products.find((x) => x.slug === slug);
  if (!raw) notFound();
  const d = dictionaries[locale];
  const p = enrichProduct(site, raw);
  const related = site.products.filter((x) => x.id !== p.id).sort((a, b) => Number(b.categoryId === p.categoryId) - Number(a.categoryId === p.categoryId)).slice(0, 4).map((x) => enrichProduct(site, x));
  const pattern = p.pattern ? enrichPattern(site, p.pattern) : null;

  return (
    <article className="pt-[calc(var(--header-h)+1.5rem)]">
      <div className="container-x">
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-caption text-foreground-secondary">
          <Link href={href(locale, "/shop")} className="hover:text-foreground">{d.nav.products}</Link>
          <span>/</span>
          {p.category && <><span>{t(p.category.name, locale)}</span><span>/</span></>}
          <span className="text-foreground">{t(p.title, locale)}</span>
        </nav>

        <ProductBuyBox product={p}>
          <div className="flex flex-wrap items-center gap-2">
            <Sku value={p.sku} />
            {!p.artistId ? <Badge tone="accent">{d.common.siteExclusive}</Badge> : <Badge tone="blue">{d.common.artistProduct}</Badge>}
            {p.category && <Badge>{t(p.category.name, locale)}</Badge>}
            {p.isNew && <Badge>{d.common.new}</Badge>}
          </div>
          <h1 className="mt-4 font-display text-h1 text-balance">{t(p.title, locale)}</h1>
          {p.artist ? (
            <Link href={href(locale, `/artists/${p.artist.slug}`)} className="mt-4 inline-flex items-center gap-3 group">
              <span className="relative h-9 w-9 overflow-hidden rounded-full"><Image src={p.artist.avatar} alt="" fill sizes="36px" className="object-cover" /></span>
              <span className="text-sm text-foreground-secondary">{d.common.creator}: <span className="font-medium text-foreground group-hover:text-accent">{t(p.artist.name, locale)}</span></span>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-foreground-secondary">{locale === "fa" ? "طراحی و تولید" : "Designed & produced by"} <span className="font-medium text-foreground">{d.brand}</span></p>
          )}
          <p className="mt-5 text-body text-foreground-secondary">{t(p.description, locale)}</p>

          <dl className="mt-6 grid grid-cols-3 gap-4 rounded-lg border border-border p-4 text-sm">
            {p.specs.map((s) => (
              <div key={t(s.label, "en")}>
                <dt className="text-caption text-muted">{t(s.label, locale)}</dt>
                <dd className="mt-0.5 font-medium" dir="auto">{t(s.value, locale)}</dd>
              </div>
            ))}
          </dl>
        </ProductBuyBox>

        {/* Info strip */}
        <div className="mt-12 grid gap-4 border-y border-border py-6 text-sm md:grid-cols-3">
          <div className="flex gap-3"><Package className="h-5 w-5 shrink-0 text-accent" /><div><p className="font-medium">{d.common.materials}</p><p className="mt-0.5 text-foreground-secondary">{t(p.materials, locale)}</p></div></div>
          <div className="flex gap-3"><Truck className="h-5 w-5 shrink-0 text-accent" /><div><p className="font-medium">{d.common.shipping}</p><p className="mt-0.5 text-foreground-secondary">{d.common.shippingNote}</p></div></div>
          <div className="flex gap-3"><RotateCcw className="h-5 w-5 shrink-0 text-accent" /><div><p className="font-medium">{d.footer.returns}</p><p className="mt-0.5 text-foreground-secondary">{locale === "fa" ? "۷ روز بازگشت بدون قید و شرط" : "7-day no-questions returns"}</p></div></div>
        </div>
      </div>

      {pattern && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.patterns} title={locale === "fa" ? "الگوی این محصول" : "The pattern behind this product"} href={href(locale, `/patterns/${pattern.slug}`)} hrefLabel={d.common.viewPattern} />
          <div className="mt-8 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-4"><PatternCard pattern={pattern} /></div>
            <div className="lg:col-span-8 flex flex-col justify-center rounded-lg bg-background-secondary p-8">
              <p className="font-display text-h2 text-balance">{t(pattern.title, locale)}</p>
              <p className="mt-4 max-w-xl text-body text-foreground-secondary">{t(pattern.description, locale)}</p>
            </div>
          </div>
        </section>
      )}

      <section className="bg-background-secondary"><div className="container-x section-y">
        <SectionHeader eyebrow={d.nav.products} title={d.common.relatedProducts} href={href(locale, "/shop")} hrefLabel={d.nav.viewAll} />
        <div className="mt-8 grid gap-5 xs:grid-cols-2 lg:grid-cols-4">{related.map((x) => <ProductCard key={x.id} product={x} />)}</div>
      </div></section>
    </article>
  );
}
