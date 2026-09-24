import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Layers, Signal, Users } from "lucide-react";
import { EducationCard } from "@/components/cards/EducationCard";
import { PatternCard } from "@/components/cards/PatternCard";
import { ProductCard } from "@/components/cards/ProductCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Reveal } from "@/components/ui/Reveal";
import { CourseProgressSidebar } from "@/components/academy/CourseProgressSidebar";
import { EnrollForm } from "@/components/academy/EnrollForm";
import { VideoGrid, type AcademyVideoEntry } from "@/components/academy/VideoGrid";
import { academyOverview } from "@/lib/data/academy";
import { priceLabel } from "@/lib/utils";
import { getAllReservations } from "@/lib/data/reservations";
import { enrichEducation, enrichPattern, enrichProduct, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { faNum, formatDuration, formatPrice, href, t } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.education.map((item) => ({ locale, slug: item.slug })));
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const e = site.education.find((x) => x.slug === slug);
  if (!e) return {};
  const title = t(e.title, locale);
  const description = t(e.excerpt, locale);
  const url = `https://rosieatelier.com/${locale}/academy/${slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      images: [{ url: e.image, width: 1200, height: 800, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [e.image],
    },
  };
}

export default async function EducationDetail({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const raw = site.education.find((x) => x.slug === slug);
  if (!raw) notFound();
  const d = dictionaries[locale];
  const e = enrichEducation(site, raw);
  const reservations = await getAllReservations();
  const stats = academyOverview(site, reservations).bySlug[e.slug];
  const courseVideos: AcademyVideoEntry[] = (e.videoFiles ?? []).map((video) => ({
    video,
    courseSlug: e.slug,
    courseTitle: e.title,
  }));
  const eventHost = e.liveEvent?.hostNameCustom && e.liveEvent.hostName
    ? t(e.liveEvent.hostName, locale)
    : null;
  const related = site.education
    .filter((x) => x.id !== e.id && (x.categoryId === e.categoryId || x.authorId === e.authorId))
    .slice(0, 3)
    .map((x) => enrichEducation(site, x));
  const paragraphs = t(e.body, locale).split(/\n\n+/);

  // JSON-LD for Course/Article
  const jsonLd = e.type === "course"
    ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: t(e.title, locale),
        description: t(e.excerpt, locale),
        image: e.image,
        url: `https://rosieatelier.com/${locale}/academy/${slug}`,
        timeRequired: `PT${e.durationMin}M`,
        ...(e.author ? {
          instructor: {
            "@type": "Person",
            name: t(e.author.name, locale),
            url: `https://rosieatelier.com/${locale}/artists/${e.author.slug}`,
          },
        } : {}),
        ...(e.price ? {
          offers: {
            "@type": "Offer",
            price: locale === "fa" ? e.price.fa : e.price.en,
            priceCurrency: locale === "fa" ? "IRR" : "USD",
            availability: "https://schema.org/InStock",
          },
        } : {}),
      }
    : {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: t(e.title, locale),
        description: t(e.excerpt, locale),
        image: e.image,
        url: `https://rosieatelier.com/${locale}/academy/${slug}`,
        datePublished: e.publishedAt,
        ...(eventHost || e.author ? {
          author: {
            "@type": "Person",
            name: eventHost ?? t(e.author!.name, locale),
          },
        } : {}),
      };

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.education, href: href(locale, "/academy") },
    { label: t(e.title, locale) },
  ];

  const hasLessonList = e.lessonList && e.lessonList.length > 0;

  return (
    <article>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative isolate h-[70svh] min-h-[480px] overflow-hidden bg-[#0d1117] text-white">
        <Image src={e.image} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/95 via-[#0a0d13]/40 to-[#0a0d13]/30" />
        <div className="container-x relative flex h-full flex-col justify-end pb-12 pt-[calc(var(--announce-h,0px)+var(--header-h))]">
          <Breadcrumb items={breadcrumb} locale={locale} className="mb-6 text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_.text-foreground]:text-white [&_.text-foreground-secondary]:text-white/60 [&_.text-border]:text-white/25" />
          <div className="anim-blur-in flex flex-wrap gap-2">
            <Badge tone="glass">{d.common[e.type]}</Badge>
            {e.category && <Badge tone="glass">{t(e.category.name, locale)}</Badge>}
            <Badge tone="glass">{d.common[e.difficulty]}</Badge>
          </div>
          <h1 className="anim-blur-in mt-4 max-w-4xl font-display text-h1 text-balance" style={{ animationDelay: "100ms" }}>
            {t(e.title, locale)}
          </h1>
          <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-caption text-white/75" style={{ animationDelay: "200ms" }}>
            {eventHost ? (
              <span className="inline-flex items-center gap-2">
                {d.common.author}: {eventHost}
              </span>
            ) : e.author && (
              <Link href={href(locale, `/artists/${e.author.slug}`)} className="inline-flex items-center gap-2 hover:text-white">
                <span className="relative h-8 w-8 overflow-hidden rounded-full">
                  <Image src={e.author.avatar} alt="" fill sizes="32px" className="object-cover" />
                </span>
                {d.common.author}: {t(e.author.name, locale)}
              </Link>
            )}
            <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5" />{d.common[e.difficulty]}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(e.durationMin, locale, d.common)}</span>
            {e.lessons > 1 && (
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {locale === "fa" ? faNum(stats?.lessons ?? e.lessons) : stats?.lessons ?? e.lessons} {d.common.lessons}
              </span>
            )}
            {(stats?.enrollments ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 tabular">
                <Users className="h-3.5 w-3.5" />
                {locale === "fa"
                  ? `${faNum(stats!.enrollments)} ثبت‌نام`
                  : `${stats!.enrollments} enrolled`}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Main content + sidebar */}
      <section className="container-x section-y">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Article body */}
          <div className="lg:col-span-8">
            <Reveal>
              <p className="font-display text-h3 leading-relaxed text-foreground text-balance">{t(e.excerpt, locale)}</p>
            </Reveal>
            <Reveal className="prose-ra mt-10" delay={80}>
              {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </Reveal>
          </div>

          {/* Sticky sidebar */}
          <aside className="lg:col-span-4">
            <div className="rounded-xl border border-border p-5 lg:sticky lg:top-[calc(var(--header-h-compact)+1.5rem)] space-y-5">
              {/* Price / enroll CTA */}
              {e.price && (
                <div className="flex items-center justify-between gap-4 rounded-lg bg-background-secondary px-4 py-3">
                  <span className="text-h4 font-semibold tabular text-foreground">
                    {formatPrice(e.price, locale)}
                  </span>
                  {e.liveEvent?.isOnline && (e.type === "workshop" || e.type === "webinar") && (
                    <Link
                      href={href(locale, `/academy/${e.slug}/live`)}
                      className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent transition-colors"
                    >
                      {locale === "fa" ? "صفحه ورود به رویداد" : "Event access page"}
                    </Link>
                  )}
                </div>
              )}

              {/* Real registration — stored in the academy panel */}
              <EnrollForm
                item={{
                  slug: e.slug,
                  title: e.title,
                  type: e.type,
                  price: e.price,
                  paymentLabel: priceLabel(e.price, locale) ?? undefined,
                }}
                compact
              />

              {stats?.capacity ? (
                <p className="text-caption text-foreground-secondary tabular">
                  {locale === "fa"
                    ? `${faNum(stats.enrollments)} صندلی از ${faNum(stats.capacity)} رزرو شده`
                    : `${stats.enrollments} of ${stats.capacity} seats taken`}
                </p>
              ) : null}

              {/* Progress + lesson list (if lessonList present, full detail; else simple bar) */}
              {hasLessonList ? (
                <CourseProgressSidebar
                  courseId={e.id}
                  lessons={e.lessonList!}
                  totalMin={e.durationMin}
                  locale={locale}
                  dict={{ progress: d.common.progress, lessons: d.common.lessons, minutes: d.common.minutes, hours: d.common.hours, free: locale === "fa" ? "رایگان" : "Free" }}
                />
              ) : (
                <>
                  <div>
                    <p className="text-label text-muted">{d.common.progress}</p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-background-secondary">
                      <div className="h-full w-0 bg-accent" />
                    </div>
                    <p className="mt-2 text-caption text-foreground-secondary tabular">
                      {locale === "fa" ? "۰٪ تکمیل شده" : "0% complete"}
                    </p>
                  </div>
                  {e.lessons > 1 && (
                    <ol className="space-y-2 text-sm">
                      {Array.from({ length: Math.min(e.lessons, 8) }).map((_, i) => (
                        <li key={i} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background-secondary text-caption tabular">
                            {locale === "fa" ? faNum(i + 1) : i + 1}
                          </span>
                          <span className="truncate text-foreground-secondary">
                            {locale === "fa" ? `درس ${faNum(i + 1)}` : `Lesson ${i + 1}`}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              )}

              {/* Author */}
              {e.author && (
                <Link
                  href={href(locale, `/artists/${e.author.slug}`)}
                  className="flex items-center gap-3 border-t border-border pt-4 group"
                >
                  <span className="relative h-12 w-12 overflow-hidden rounded-full">
                    <Image src={e.author.avatar} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span>
                    <span className="block font-medium group-hover:text-accent">{t(e.author.name, locale)}</span>
                    <span className="block text-caption text-foreground-secondary">{t(e.author.profession, locale)}</span>
                  </span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>

      {courseVideos.length > 0 && (
        <section className="container-x pt-4">
          <SectionHeader
            eyebrow={d.nav.education}
            title={locale === "fa" ? "ویدیوهای این دوره" : "This course's videos"}
            description={
              locale === "fa"
                ? "ویدیوهایی که در پنل آکادمی برای این دوره آپلود شده‌اند."
                : "Videos uploaded for this course in the academy panel."
            }
          />
          <VideoGrid entries={courseVideos} poster={e.image} />
        </section>
      )}

      {e.patterns.length > 0 && (
        <section className="bg-background-secondary">
          <div className="container-x section-y">
            <SectionHeader eyebrow={d.nav.patterns} title={d.common.relatedPatterns} href={href(locale, "/patterns")} hrefLabel={d.nav.viewAll} />
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
              {e.patterns.map((p) => <PatternCard key={p.id} pattern={enrichPattern(site, p)} />)}
            </div>
          </div>
        </section>
      )}
      {e.products.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.products} title={d.common.relatedProducts} href={href(locale, "/shop")} hrefLabel={d.nav.viewAll} />
          <div className="mt-8 grid gap-5 xs:grid-cols-2 md:grid-cols-4">
            {e.products.map((p) => <ProductCard key={p.id} product={enrichProduct(site, p)} />)}
          </div>
        </section>
      )}
      {related.length > 0 && (
        <section className="container-x section-y">
          <SectionHeader eyebrow={d.nav.education} title={d.common.relatedTutorials} href={href(locale, "/academy")} hrefLabel={d.nav.viewAll} />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {related.map((x, i) => <Reveal key={x.id} delay={i * 70}><EducationCard item={x} /></Reveal>)}
          </div>
        </section>
      )}
    </article>
  );
}
