import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  GraduationCap,
  ArrowUpRight,
  Clock,
  Radio,
  Users,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { enrichEducation, getSite } from "@/lib/data/queries";
import { getAllReservations } from "@/lib/data/reservations";
import { academyOverview, lessonMinutes, previewVideoOf } from "@/lib/data/academy";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { faNum, formatDuration, href, t } from "@/lib/utils";
import { AcademyClient } from "./AcademyClient";
import { AcademyHeroPreview } from "@/components/academy/AcademyHeroPreview";
import { VideoGrid, type AcademyVideoEntry } from "@/components/academy/VideoGrid";
import { LiveEventBanner } from "@/components/academy/LiveEventBanner";

export const dynamic = "force-dynamic";

/** Ships with the site; an admin-uploaded preview for the featured course wins. */
const BUILT_IN_PREVIEW = "/videos/academy/preview.mp4";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/academy");
  return {
    title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.education,
    description: m ? t(m.description, locale) : undefined,
  };
}

export default async function AcademyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const site = await getSite();
  const d = dictionaries[locale];
  const isFA = locale === "fa";

  const [all, reservations] = await Promise.all([
    Promise.resolve(site.education.map((e) => enrichEducation(site, e))),
    getAllReservations(),
  ]);
  const stats = academyOverview(site, reservations);

  const featured = all.find((e) => e.featured && e.type === "course") ?? all[0];

  /* Hero preview: the video the admin uploaded for the featured course, else the built-in film. */
  const featuredVideo = previewVideoOf(featured);
  const heroVideo = featuredVideo?.url ?? BUILT_IN_PREVIEW;

  /* Every lesson video in the panel — the featured one is already playing in the hero. */
  const videoEntries: AcademyVideoEntry[] = all.flatMap((item) =>
    (item.videoFiles ?? []).map((video) => ({
      video,
      courseSlug: item.slug,
      courseTitle: item.title,
      skip: item.id === featured?.id,
    })),
  );
  const galleryEntries = videoEntries.filter((entry) => entry.video.url !== heroVideo);

  const liveEvent =
    all.find((e) => (e.type === "webinar" || e.type === "workshop") && e.liveEvent?.status === "live") ??
    all
      .filter((e) => (e.type === "webinar" || e.type === "workshop") && e.liveEvent?.status === "scheduled")
      .sort((a, b) => new Date(a.liveEvent!.startsAt).getTime() - new Date(b.liveEvent!.startsAt).getTime())[0] ??
    null;
  const n = (v: number) => (isFA ? faNum(v) : String(v));
  const cats = site.categories.filter((c) => site.education.some((e) => e.categoryId === c.id));
  /* The category strip links to `/academy?category=<slug>` — resolve it so the grid opens filtered. */
  const initialCategory = query.category
    ? cats.find((c) => c.slug === query.category)?.id ?? "all"
    : "all";
  const eventCount = stats.workshops + stats.webinars;

  const featuredLessons = (featured?.lessonList ?? []).slice(0, 8);
  const featuredStats = featured ? stats.bySlug[featured.slug] : undefined;

  /* Hero facts — every number is computed from published content and real registrations. */
  const heroStats = [
    { value: n(stats.courses), label: isFA ? "دوره" : "Courses" },
    { value: n(stats.lessons), label: isFA ? "درس" : "Lessons" },
    { value: n(Math.round(stats.minutes / 60)), label: isFA ? "ساعت آموزش" : "Hours" },
    ...(stats.students > 0 ? [{ value: n(stats.students), label: isFA ? "دانشجو" : "Students" }] : []),
  ];

  const perks = [
    {
      icon: Layers,
      label: isFA ? `${n(stats.lessons)} درس` : `${n(stats.lessons)} lessons`,
      desc: isFA ? "درس‌های ساختارمند با تمرین عملی" : "Structured lessons with exercises",
    },
    {
      icon: Clock,
      label: isFA ? `${n(Math.round(stats.minutes / 60))} ساعت آموزش` : `${n(Math.round(stats.minutes / 60))} hours`,
      desc: isFA ? "مجموع زمان ویدیوهای دوره‌ها" : "Total course video time",
    },
    {
      icon: Radio,
      label: isFA ? `${n(eventCount)} رویداد زنده` : `${n(eventCount)} live events`,
      desc: isFA ? "ورکشاپ و وبینار با ظرفیت محدود" : "Workshops & webinars, limited seats",
    },
    {
      icon: Users,
      label: isFA ? `${n(stats.instructors)} مدرس` : `${n(stats.instructors)} instructors`,
      desc: isFA ? "مدرسان و متخصصان آکادمی" : "Academy instructors & specialists",
    },
  ];

  const whyCards = [
    {
      emoji: "🎓",
      title: isFA ? "دوره‌های جامع" : "Comprehensive Courses",
      desc: isFA
        ? "دوره‌های ساختارمند با درس‌های مرحله‌به‌مرحله و تمرین‌های عملی."
        : "Structured courses with step-by-step lessons and practical exercises.",
      metric: isFA ? `${n(stats.courses)} دوره` : `${n(stats.courses)} courses`,
    },
    {
      emoji: "🎥",
      title: isFA ? "ورکشاپ‌های زنده" : "Live Workshops",
      desc: isFA
        ? "جلسات تعاملی آنلاین با مدرس، امکان پرسش و پاسخ مستقیم و تمرین در لحظه."
        : "Interactive online sessions with the instructor, live Q&A and real-time exercises.",
      metric: isFA ? `${n(stats.workshops)} ورکشاپ` : `${n(stats.workshops)} workshops`,
    },
    {
      emoji: "📡",
      title: isFA ? "وبینارهای تخصصی" : "Expert Webinars",
      desc: isFA
        ? "وبینارهای کوتاه با متخصصان صنعت — برای به‌روز ماندن با آخرین ترندها و تکنیک‌ها."
        : "Short webinars with industry experts — stay updated with the latest trends.",
      metric: isFA ? `${n(stats.webinars)} وبینار` : `${n(stats.webinars)} webinars`,
    },
    {
      emoji: "📹",
      title: isFA ? "آموزش‌های ویدیویی" : "Video Tutorials",
      desc: isFA
        ? "آموزش‌های کوتاه و تمرکز‌دار که یک مهارت خاص را عمیق آموزش می‌دهند."
        : "Short, focused tutorials that teach one specific skill in depth.",
      metric: isFA ? `${n(stats.lessons)} درس` : `${n(stats.lessons)} lessons`,
    },
    {
      emoji: "🗺️",
      title: isFA ? "مسیر یادگیری" : "Learning Paths",
      desc: isFA
        ? "برنامه‌ریزی شده از صفر تا حرفه‌ای — مجموعه‌ای از دوره‌ها در کنار هم."
        : "Planned from zero to professional — a curated set of courses together.",
      metric: isFA ? `${n(stats.categories)} دسته‌بندی` : `${n(stats.categories)} categories`,
    },
    {
      emoji: "🏆",
      title: isFA ? "پروژه‌های عملی" : "Real Projects",
      desc: isFA
        ? "هر دوره با یک پروژه واقعی پایان می‌یابد که می‌توانی در پورتفولیوی خود استفاده کنی."
        : "Every course ends with a real project you can add to your portfolio.",
      metric: isFA ? `${n(Math.round(stats.minutes / 60))} ساعت` : `${n(Math.round(stats.minutes / 60))} h`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: d.brand,
    url: `https://rosieatelier.com/${locale}/academy`,
    description: isFA
      ? "دوره‌ها، ورکشاپ‌ها و وبینارهای آکادمی رزی برای طراحی الگو و سطح."
      : "Rosie Academy courses, workshops and webinars for pattern and surface design.",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: isFA ? "دوره‌های آکادمی" : "Academy courses",
      itemListElement: all.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": item.type === "course" ? "Course" : "Event",
          name: t(item.title, locale),
          description: t(item.excerpt, locale),
          url: `https://rosieatelier.com/${locale}/academy/${item.slug}`,
          timeRequired: `PT${lessonMinutes(item)}M`,
          ...(item.type === "course" && item.author
            ? { provider: { "@type": "Person", name: t(item.author.name, locale) } }
            : {}),
          ...(item.price && item.price[locale] > 0
            ? {
                offers: {
                  "@type": "Offer",
                  price: item.price[locale],
                  priceCurrency: locale === "fa" ? "IRR" : "USD",
                  availability: "https://schema.org/InStock",
                },
              }
            : {}),
        },
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0c1018] text-white">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c1018]" />

        <div className="container-x relative z-10 pt-[calc(var(--header-h)+3rem)] pb-16 md:pb-20">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left: copy */}
            <div className="lg:col-span-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-caption text-white/70 mb-6 backdrop-blur-sm">
                <GraduationCap className="h-3.5 w-3.5" />
                {d.nav.education}
              </span>
              <h1 className="anim-blur-in font-display text-h1 text-white text-balance leading-tight">
                {isFA ? (
                  <>
                    آکادمی رزی<br />
                    <span className="text-accent">یاد بگیر، بساز، بفروش.</span>
                  </>
                ) : (
                  <>
                    Rosie Academy<br />
                    <span className="text-accent">Learn, Build, Publish.</span>
                  </>
                )}
              </h1>
              <p
                className="anim-blur-in mt-5 text-body-lg text-white/70 max-w-md"
                style={{ animationDelay: "80ms" }}
              >
                {isFA
                  ? "دوره‌های تخصصی طراحی الگو، ورکشاپ‌های زنده و وبینارهای حرفه‌ای — از مبانی تا عرضه بین‌المللی."
                  : "Specialist pattern design courses, live workshops and professional webinars — from foundations to international publishing."}
              </p>

              {/* Stats row — computed from published courses and real registrations */}
              <div
                className="anim-fade-up mt-8 flex flex-wrap gap-8 text-caption text-white/60 tabular"
                style={{ animationDelay: "160ms" }}
              >
                {heroStats.map((stat) => (
                  <span key={stat.label}>
                    <strong className="block font-display text-h3 text-white">{stat.value}</strong>
                    {stat.label}
                  </span>
                ))}
              </div>

              {/* Perks */}
              <ul className="mt-8 grid grid-cols-2 gap-3">
                {perks.map(({ icon: Icon, label, desc }) => (
                  <li key={label} className="flex items-start gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8 mt-0.5">
                      <Icon className="h-3.5 w-3.5 text-accent" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-white">{label}</span>
                      <span className="block text-caption text-white/50">{desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: featured course with its real preview video */}
            {featured && (
              <div className="lg:col-span-7">
                <Reveal>
                  <AcademyHeroPreview src={heroVideo} poster={featured.image}>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1 text-caption font-medium text-white backdrop-blur-sm">
                        {isFA ? "منتخب" : "Featured"} · {d.common[featured.type]}
                      </span>
                      {featured.category && (
                        <span className="rounded-full border border-white/20 px-3 py-1 text-caption text-white/70 backdrop-blur-sm">
                          {t(featured.category.name, locale)}
                        </span>
                      )}
                      {(featuredStats?.enrollments ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-caption text-white/70 backdrop-blur-sm">
                          <Users className="h-3 w-3" />
                          {isFA
                            ? `${n(featuredStats!.enrollments)} ثبت‌نام`
                            : `${n(featuredStats!.enrollments)} enrolled`}
                        </span>
                      )}
                    </div>
                    <h2 className="font-display text-h2 text-white text-balance">
                      <Link href={href(locale, `/academy/${featured.slug}`)} className="hover:text-white/90">
                        {t(featured.title, locale)}
                      </Link>
                    </h2>
                    <p className="mt-2 text-body-sm text-white/70 max-w-lg line-clamp-2">
                      {t(featured.excerpt, locale)}
                    </p>
                    {featured.author && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="relative h-8 w-8 overflow-hidden rounded-full border border-white/20">
                          <Image src={featured.author.avatar} alt="" fill sizes="32px" className="object-cover" />
                        </span>
                        <span className="text-caption text-white/60">
                          {d.common.author}: {t(featured.author.name, locale)}
                        </span>
                      </div>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-4">
                      <Link
                        href={href(locale, `/academy/${featured.slug}`)}
                        className="inline-flex items-center gap-2 border-b border-white/40 pb-0.5 text-sm font-medium transition-colors hover:border-white"
                      >
                        {isFA ? "مشاهده دوره" : "View course"}
                        <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
                      </Link>
                      <span className="text-caption text-white/50 tabular">
                        {n(featuredStats?.lessons ?? 0)} {isFA ? "درس" : "lessons"} ·{" "}
                        {formatDuration(lessonMinutes(featured), locale, d.common)}
                      </span>
                    </div>
                  </AcademyHeroPreview>
                </Reveal>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Categories strip ──────────────────────────────────── */}
      {cats.length > 0 && (
        <div className="border-b border-border bg-background-secondary">
          <div className="container-x">
            <div className="flex items-center gap-3 overflow-x-auto py-4 no-scrollbar">
              <span className="shrink-0 text-caption text-muted me-1">
                {d.nav.categories}:
              </span>
              {cats.map((c) => (
                <Link
                  key={c.id}
                  href={href(locale, `/academy?category=${c.slug}`)}
                  className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-caption text-foreground-secondary transition-all hover:border-accent hover:text-accent"
                >
                  {t(c.name, locale)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── What you get trust bar — only what the academy actually provides ── */}
      <div className="bg-accent text-white">
        <div className="container-x">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-4 text-sm">
            {[
              isFA ? "✓ ثبت‌نام آنلاین با پیگیری در پنل" : "✓ Online enrollment tracked in the panel",
              isFA ? "✓ ظرفیت محدود رویدادهای زنده" : "✓ Limited seats on live events",
              isFA ? "✓ پیش‌نمایش ویدیوهای درس‌ها" : "✓ Lesson video previews",
              isFA ? "✓ پشتیبانی از طریق صفحه تماس" : "✓ Support through the contact page",
            ].map((item) => (
              <span key={item} className="font-medium">{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── What you'll learn (3-col feature cards) ───────────── */}
      <section className="container-x py-16">
        <SectionHeader
          eyebrow={isFA ? "چرا آکادمی رزی" : "Why Rosie Academy"}
          title={isFA ? "هر آنچه نیاز داری در یک جا" : "Everything you need in one place"}
          description={
            isFA
              ? "از آموزش‌های کوتاه ویدیویی تا دوره‌های جامع حرفه‌ای و رویدادهای زنده — ما هر سطحی را پوشش می‌دهیم."
              : "From short video tutorials to comprehensive professional courses and live events — we cover every level."
          }
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {whyCards.map(({ emoji, title, desc, metric }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="flex h-full flex-col gap-4 rounded-xl border border-border bg-surface p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-3xl">{emoji}</span>
                  <span className="rounded-full bg-background-secondary px-3 py-1 text-caption text-foreground-secondary tabular">
                    {metric}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-body-sm text-foreground-secondary flex-1">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Featured course curriculum (real lesson list from the panel) ── */}
      {featured && featuredLessons.length > 0 && (
        <section className="bg-background-secondary">
          <div className="container-x py-16">
            <SectionHeader
              eyebrow={isFA ? "برنامه دوره منتخب" : "Featured curriculum"}
              title={t(featured.title, locale)}
              description={t(featured.excerpt, locale)}
              href={href(locale, `/academy/${featured.slug}`)}
              hrefLabel={isFA ? "صفحه دوره" : "Course page"}
            />
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {featuredLessons.map((lesson, index) => (
                <Reveal key={lesson.id} delay={index * 40}>
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background-secondary font-display text-body-sm tabular">
                      {n(index + 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{t(lesson.title, locale)}</span>
                      <span className="block text-caption text-foreground-secondary tabular">
                        {formatDuration(lesson.durationMin ?? 0, locale, d.common)}
                      </span>
                    </span>
                    {lesson.free && (
                      <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-caption font-medium text-success">
                        {isFA ? "پیش‌نمایش" : "Preview"}
                      </span>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="mt-4 text-caption text-muted tabular">
              {isFA
                ? `${n(featuredLessons.length)} درس نخست از ${n(featuredStats?.lessons ?? 0)} درس — مجموع ${formatDuration(lessonMinutes(featured), locale, d.common)}`
                : `First ${n(featuredLessons.length)} of ${n(featuredStats?.lessons ?? 0)} lessons — ${formatDuration(lessonMinutes(featured), locale, d.common)} total`}
            </p>
          </div>
        </section>
      )}

      {/* ── Lesson videos uploaded in the panel ───────────────── */}
      {galleryEntries.length > 0 && (
        <section className="container-x py-16">
          <SectionHeader
            eyebrow={isFA ? "ویدیوهای آکادمی" : "Academy videos"}
            title={isFA ? "پیش‌نمایش درس‌ها را ببین" : "Watch the lesson previews"}
            description={
              isFA
                ? "ویدیوهای آپلودشده در پنل آکادمی؛ هر ویدیوی رایگان همین‌جا پخش می‌شود."
                : "Videos uploaded in the academy panel — every free preview plays right here."
            }
          />
          <VideoGrid entries={galleryEntries} poster={featured?.image} />
        </section>
      )}

      {/* ── Process steps ─────────────────────────────────────── */}
      <section className="bg-background-secondary">
        <div className="container-x py-16">
          <SectionHeader
            eyebrow={isFA ? "چطور کار می‌کند" : "How it works"}
            title={isFA ? "شروع تنها ۳ قدم فاصله دارد" : "Just 3 steps away from learning"}
          />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              {
                step: isFA ? "۱" : "1",
                title: isFA ? "دوره را انتخاب کن" : "Choose a course",
                desc: isFA
                  ? "از بین دوره‌ها، ورکشاپ‌ها و وبینارها آنچه به نیازت می‌خورد را پیدا کن."
                  : "Find what fits your needs from courses, workshops and webinars.",
              },
              {
                step: isFA ? "۲" : "2",
                title: isFA ? "ثبت‌نام کن" : "Enroll",
                desc: isFA
                  ? "فرم ثبت‌نام را پر کن؛ ثبت‌نامت همان لحظه در پنل آکادمی ذخیره می‌شود."
                  : "Fill in the form — your registration is stored in the academy panel instantly.",
              },
              {
                step: isFA ? "۳" : "3",
                title: isFA ? "یاد بگیر و بساز" : "Learn & build",
                desc: isFA
                  ? "درس‌ها را دنبال کن، پروژه عملی بساز و از پیش‌نمایش‌های رایگان شروع کن."
                  : "Follow the lessons, build the project and start from the free previews.",
              },
            ].map(({ step, title, desc }, i) => (
              <Reveal key={step} delay={i * 100}>
                <div className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground font-display text-h3">
                    {step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-body-sm text-foreground-secondary">{desc}</p>
                    <span className="mt-2 flex items-center gap-1 text-caption text-muted">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      {isFA ? "آنلاین و بدون تماس تلفنی" : "Online, no phone calls"}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live event banner ─────────────────────────────────── */}
      {liveEvent && (
        <section className="container-x pb-0 pt-10">
          <LiveEventBanner event={liveEvent} />
        </section>
      )}

      {/* ── Interactive catalog (client component) ────────────── */}
      <AcademyClient
        items={all}
        categories={cats}
        initialCategory={initialCategory}
        stats={{ courses: stats.courses, lessons: stats.lessons, minutes: stats.minutes, instructors: stats.instructors, enrollments: stats.enrollments, students: stats.students }}
        itemStats={stats.bySlug}
        instructorStats={stats.instructorStats}
      />
    </>
  );
}
