import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/ui/PageHero";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { PortfolioCollaboration, PortfolioIntro } from "@/components/portfolio/PortfolioIntro";
import { enrichPortfolio, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/portfolio");
  return m ? { title: { absolute: t(m.title, locale) }, description: t(m.description, locale) } : { title: dictionaries[locale].nav.portfolio };
}

export default async function PortfolioPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const items = site.portfolios.map((p) => enrichPortfolio(site, p));
  const usedCatIds = new Set(site.portfolios.map((p) => p.categoryId));
  const categories = site.categories.filter((c) => usedCatIds.has(c.id)).sort((a, b) => a.order - b.order);

  const coverImage = site.portfolios[0]?.cover ?? site.hero.image;

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.portfolio },
  ];

  return (
    <>
      <PageHero
        eyebrow={d.nav.portfolio}
        title={locale === "fa" ? "گالری پروژه‌های اجراشده" : "Realised project gallery"}
        description={locale === "fa" ? "از دیوار تا فضا — پروژه‌هایی که الگو را به زندگی تبدیل کردند." : "From wall to space — projects where pattern became life."}
        image={coverImage}
        breadcrumb={breadcrumb}
        locale={locale}
        zoomDirection="out"
      />

      {/* The founder's introduction — who the studio belongs to, in full */}
      <PortfolioIntro locale={locale} />

      {/* Works heading — the gallery that follows the introduction */}
      <section id="works" className="container-x scroll-mt-[calc(var(--header-h)+1rem)] pt-16">
        <p className="text-label flex items-center gap-3 text-accent">
          <span className="inline-block h-px w-6 bg-accent/60" />
          {locale === "fa" ? "آثار و پروژه‌ها" : "Works & projects"}
        </p>
        <h2 className="mt-4 font-display text-h2 text-balance">
          {locale === "fa" ? "آثار منتخب و پروژه‌های اجراشده" : "Selected works & realised projects"}
        </h2>
        <p className="mt-3 max-w-2xl text-body-lg text-foreground-secondary">
          {locale === "fa"
            ? "گزیده‌ای از الگوها، کاغذدیواری‌ها، پارچه‌ها و پرده‌هایی که به دیوار و فضای واقعی رسیده‌اند."
            : "A selection of patterns, wallpapers, textiles and drapery that made it onto real walls and into real spaces."}
        </p>
      </section>

      {/* Stats bar */}
      <section className="container-x pt-8 pb-4">
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background-secondary rtl:divide-x-reverse">
          {[
            [items.length, locale === "fa" ? "پروژه اجراشده" : "Realised projects"],
            [categories.length, locale === "fa" ? "دسته‌بندی" : "Categories"],
            [new Set(site.portfolios.map((p) => p.artistId).filter(Boolean)).size, locale === "fa" ? "طراح همکار" : "Contributing designers"],
          ].map(([val, label]) => (
            <div key={String(label)} className="flex flex-col items-center gap-0.5 py-6 text-center">
              <span className="font-display text-h2 tabular-nums leading-none">{val}</span>
              <span className="text-caption text-muted">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="container-x pb-20 pt-6">
        <Suspense>
          <PortfolioGrid items={items} categories={categories} />
        </Suspense>
      </section>

      {/* Closing band — the ways to work with the atelier */}
      <PortfolioCollaboration locale={locale} />
    </>
  );
}
