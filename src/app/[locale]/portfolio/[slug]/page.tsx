import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { PatternCard } from "@/components/cards/PatternCard";
import { ProductCard } from "@/components/cards/ProductCard";
import { PortfolioCard } from "@/components/cards/PortfolioCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ScrollProgress } from "@/components/portfolio/ScrollProgress";
import { GalleryLightbox } from "@/components/portfolio/GalleryLightbox";
import { ShareButtons } from "@/components/portfolio/ShareButtons";
import { enrichPattern, enrichPortfolio, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { faNum, href, t } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.portfolios.map((p) => ({ locale, slug: p.slug })));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const p = site.portfolios.find((x) => x.slug === slug);
  if (!p) return {};
  const title = t(p.title, locale);
  const description = t(p.intro, locale);
  const url = `https://rosieatelier.com/${locale}/portfolio/${slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: p.cover, width: 1200, height: 800, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [p.cover],
    },
  };
}

export default async function PortfolioDetail({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const raw = site.portfolios.find((x) => x.slug === slug);
  if (!raw) notFound();
  const d = dictionaries[locale];
  const p = enrichPortfolio(site, raw);
  const related = site.portfolios
    .filter((x) => x.id !== p.id && (x.categoryId === p.categoryId || x.artistId === p.artistId))
    .slice(0, 2)
    .map((x) => enrichPortfolio(site, x));
  const yr = locale === "fa" ? faNum(p.year) : p.year;

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.portfolio, href: href(locale, "/portfolio") },
    { label: t(p.title, locale) },
  ];

  // JSON-LD structured data (CreativeWork / Article)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: t(p.title, locale),
    description: t(p.intro, locale),
    image: p.cover,
    dateCreated: String(p.year),
    locationCreated: { "@type": "Place", name: t(p.location, locale) },
    ...(p.artist ? {
      author: {
        "@type": "Person",
        name: t(p.artist.name, locale),
        url: `https://rosieatelier.com/${locale}/artists/${p.artist.slug}`,
      },
    } : {}),
    url: `https://rosieatelier.com/${locale}/portfolio/${slug}`,
  };

  return (
    <article>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ScrollProgress />

      {/* Project hero */}
      <section className="relative isolate h-[92svh] min-h-[560px] overflow-hidden bg-[#0d1117] text-white">
        <Image src={p.cover} alt={t(p.title, locale)} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/95 via-[#0a0d13]/30 to-[#0a0d13]/30" />
        <div className="container-x relative flex h-full flex-col justify-end pb-12 pt-[calc(var(--announce-h,0px)+var(--header-h))]">
          <Breadcrumb items={breadcrumb} locale={locale} className="mb-6 text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_.text-foreground]:text-white [&_.text-foreground-secondary]:text-white/60 [&_.text-border]:text-white/25" />
          <p className="anim-blur-in text-label text-white/70">{p.category ? t(p.category.name, locale) : ""} · {yr}</p>
          <h1 className="anim-blur-in mt-4 max-w-4xl font-display text-display text-balance" style={{ animationDelay: "100ms" }}>{t(p.title, locale)}</h1>
          <p className="anim-blur-in mt-4 max-w-xl text-body-lg text-white/75" style={{ animationDelay: "200ms" }}>{t(p.subtitle, locale)}</p>
        </div>
      </section>

      {/* Intro + meta sidebar */}
      <section className="container-x section-y">
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <p className="font-display text-h2 leading-snug text-balance">{t(p.intro, locale)}</p>
          </Reveal>
          <Reveal className="lg:col-span-4 lg:col-start-9" delay={100}>
            <div className="lg:sticky lg:top-[calc(var(--header-h)+24px)]">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-xl border border-border bg-background-secondary p-6 text-sm">
                <Meta k={d.common.client} v={t(p.client, locale)} />
                <Meta k={d.common.location} v={t(p.location, locale)} />
                <Meta k={d.common.year} v={String(yr)} />
                <Meta k={d.common.scope} v={t(p.scope, locale)} />
                {p.artist && (
                  <div className="col-span-2 border-t border-border pt-5">
                    <dt className="text-caption text-muted">{d.common.creator}</dt>
                    <dd className="mt-2">
                      <Link href={href(locale, `/artists/${p.artist.slug}`)} className="group inline-flex items-center gap-3">
                        <span className="relative h-11 w-11 overflow-hidden rounded-full"><Image src={p.artist.avatar} alt="" fill sizes="44px" className="object-cover" /></span>
                        <span>
                          <span className="block font-medium group-hover:text-accent">{t(p.artist.name, locale)}</span>
                          <span className="block text-caption text-foreground-secondary">{t(p.artist.profession, locale)}</span>
                        </span>
                        <ArrowUpRight className="h-4 w-4 ms-auto text-muted group-hover:text-accent rtl-flip" />
                      </Link>
                    </dd>
                  </div>
                )}
                <div className="col-span-2 border-t border-border pt-5">
                  <ShareButtons title={t(p.title, locale)} locale={locale} />
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Story blocks */}
      <section className="space-y-14 md:space-y-24">
        {p.story.map((b, i) => {
          if (b.type === "image" && b.image)
            return (
              <Reveal key={i} className="container-x">
                <figure>
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-background-secondary md:aspect-[21/9]">
                    <Image src={b.image} alt={b.caption ? t(b.caption, locale) : ""} fill sizes="100vw" className="object-cover" />
                  </div>
                  {b.caption && <figcaption className="mt-3 text-caption text-foreground-secondary">{t(b.caption, locale)}</figcaption>}
                </figure>
              </Reveal>
            );
          if (b.type === "pair" && b.images)
            return (
              <Reveal key={i} className="container-x">
                <div className="grid gap-4 md:grid-cols-2">
                  {b.images.map((src) => (
                    <div key={src} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-background-secondary">
                      <Image src={src} alt="" fill sizes="50vw" className="object-cover" />
                    </div>
                  ))}
                </div>
                {b.caption && <p className="mt-3 text-caption text-foreground-secondary">{t(b.caption, locale)}</p>}
              </Reveal>
            );
          if (b.type === "quote" && b.text)
            return (
              <Reveal key={i} className="container-x">
                <blockquote className="mx-auto max-w-3xl border-s-4 border-accent py-2 ps-8 font-display text-h2 italic text-balance text-foreground">
                  &ldquo;{t(b.text, locale)}&rdquo;
                </blockquote>
              </Reveal>
            );
          return (
            <Reveal key={i} className="container-x">
              <p className="prose-ra mx-auto">{b.text ? t(b.text, locale) : ""}</p>
            </Reveal>
          );
        })}
      </section>

      {/* Gallery */}
      {p.gallery.length > 1 && (
        <section className="container-x section-y">
          <GalleryLightbox images={p.gallery} />
        </section>
      )}

      {p.patterns.length > 0 && (
        <section className="bg-background-secondary">
          <div className="container-x section-y">
            <SectionHeader eyebrow={d.nav.patterns} title={locale === "fa" ? "الگوهای استفاده‌شده" : "Patterns used"} href={href(locale, "/patterns")} hrefLabel={d.nav.viewAll} />
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
              {p.patterns.map((x) => <PatternCard key={x.id} pattern={enrichPattern(site, x)} />)}
            </div>
          </div>
        </section>
      )}

      {p.products.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.products} title={locale === "fa" ? "محصولات استفاده‌شده" : "Products used"} href={href(locale, "/shop")} hrefLabel={d.nav.viewAll} />
          <div className="mt-8 grid gap-5 xs:grid-cols-2 md:grid-cols-4">
            {p.products.map((x) => <ProductCard key={x.id} product={enrichProduct(site, x)} />)}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.portfolio} title={d.common.relatedProjects} href={href(locale, "/portfolio")} hrefLabel={d.nav.viewAll} />
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {related.map((x) => <div key={x.id} className="aspect-[16/10]"><PortfolioCard item={x} /></div>)}
          </div>
          <div className="mt-10 flex justify-center">
            <Button href={href(locale, "/custom")} variant="outline" size="lg">
              {d.home.customCta}<ArrowUpRight className="h-4 w-4 rtl-flip" />
            </Button>
          </div>
        </section>
      )}
    </article>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-caption text-muted">{k}</dt>
      <dd className="mt-1 font-medium" dir="auto">{v}</dd>
    </div>
  );
}
