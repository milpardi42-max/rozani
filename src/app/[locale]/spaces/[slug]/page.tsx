import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/PageHero";
import { PatternGrid } from "@/components/product/Grids";
import { enrichPattern, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";
import type { BreadcrumbItem } from "@/components/ui/Breadcrumb";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.spaces.map((space) => ({ locale, slug: space.slug })));
}
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const s = site.spaces.find((x) => x.slug === slug);
  return s ? { title: t(s.name, locale) } : {};
}
export default async function SpacePage({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const s = site.spaces.find((x) => x.slug === slug);
  if (!s) notFound();
  const d = dictionaries[locale];
  const patterns = site.patterns.filter((p) => p.spaceIds.includes(s.id)).map((p) => enrichPattern(site, p));
  const breadcrumb: BreadcrumbItem[] = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.spaces, href: href(locale, "/spaces") },
    { label: t(s.name, locale) },
  ];
  return (
    <>
      <PageHero eyebrow={d.nav.spaces} title={t(s.name, locale)} description={d.home.spacesDesc} image={s.image} breadcrumb={breadcrumb} locale={locale} />
      <section className="container-x section-y"><PatternGrid patterns={patterns} /></section>
    </>
  );
}
