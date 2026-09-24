"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  BookOpen,
  Play,
  Users,
  Calendar,
  Clock,
  Signal,
  ChevronDown,
  CheckCircle2,
  Video,
  Layers,
  Filter,
  X,
  Zap,
  Globe,
  Wifi,
} from "lucide-react";
import { cn, faNum, formatDuration, href, t } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useLocale } from "@/components/providers/AppProviders";
import { EnrollForm } from "@/components/academy/EnrollForm";
import type { EducationCardData } from "@/components/cards/EducationCard";
import type { Category } from "@/lib/types";

/* ─── Types ─────────────────────────────────────────────────── */
type Tab = "all" | "course" | "workshop" | "webinar";
type SortKey = "popular" | "newest" | "price_asc" | "price_desc";

/** Real numbers computed on the server from published content + stored registrations. */
export interface AcademyStats {
  courses: number;
  lessons: number;
  minutes: number;
  instructors: number;
  enrollments: number;
  students: number;
}

export interface AcademyItemStat {
  enrollments: number;
  capacity: number;
  seatsLeft: number | null;
  videos: number;
  freeVideos: number;
  lessons: number;
  minutes: number;
}

export interface AcademyInstructorStat {
  authorId: string;
  items: number;
  courses: number;
  events: number;
  lessons: number;
  videos: number;
}

interface Props {
  items: EducationCardData[];
  categories: Category[];
  /** Category id coming from `?category=<slug>` (the strip on the academy page). */
  initialCategory?: string;
  stats: AcademyStats;
  itemStats: Record<string, AcademyItemStat>;
  instructorStats: AcademyInstructorStat[];
}

/* ─── Real price helpers (no price set = free to watch) ─────── */
function priceOf(item: EducationCardData, locale: "fa" | "en"): { value: number; isFree: boolean } {
  const value = item.price?.[locale] ?? 0;
  return { value, isFree: value <= 0 };
}

function formatItemPrice(item: EducationCardData, locale: "fa" | "en"): string {
  const { value, isFree } = priceOf(item, locale);
  if (isFree) return locale === "fa" ? "رایگان" : "Free";
  return locale === "fa" ? `${faNum(value.toLocaleString("en-US"))} تومان` : `$${value}`;
}

function lessonsOf(item: EducationCardData): number {
  return item.lessonList?.length || item.lessons || 0;
}

function minutesOf(item: EducationCardData): number {
  const listed = item.lessonList?.reduce((sum, lesson) => sum + (lesson.durationMin ?? 0), 0) ?? 0;
  return listed || item.durationMin;
}

/* ─── Enroll / register modal ────────────────────────────────── */
function EnrollModal({
  item,
  stat,
  onClose,
}: {
  item: EducationCardData;
  stat?: AcademyItemStat;
  onClose: () => void;
}) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const { value: priceValue, isFree } = priceOf(item, locale);
  const priceLabel = isFree ? null : isFA ? `${faNum(priceValue.toLocaleString("en-US"))} تومان` : `$${priceValue}`;

  const preview = item.videoFiles?.find((video) => video.free) ?? item.videoFiles?.[0];

  const typeLabel =
    item.type === "course"
      ? isFA
        ? "دوره آموزشی"
        : "Course"
      : item.type === "workshop"
        ? isFA
          ? "ورکشاپ"
          : "Workshop"
        : isFA
          ? "وبینار"
          : "Webinar";

  const learnPoints = (item.lessonList ?? []).slice(0, 3).map((lesson) => t(lesson.title, locale));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-[#0a0d13]/75 backdrop-blur-sm" />
      <div
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: the course's own preview video when the panel has one */}
        <div className="relative h-40 overflow-hidden bg-[#0f141c]">
          {preview ? (
            <video src={preview.url} poster={item.image} muted loop autoPlay playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          ) : (
            <Image src={item.image} alt="" fill sizes="600px" className="object-cover opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f141c]/80 to-transparent" />
          <button
            onClick={onClose}
            className="absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
            aria-label={isFA ? "بستن" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-4 inset-x-5">
            <p className="text-caption text-white/70">{typeLabel}</p>
            <h3 className="font-semibold text-white text-balance line-clamp-2">{t(item.title, locale)}</h3>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
              <Clock className="h-4 w-4 text-accent shrink-0" />
              <span className="text-foreground-secondary tabular">{formatDuration(minutesOf(item), locale, dict.common)}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
              <Signal className="h-4 w-4 text-accent shrink-0" />
              <span className="text-foreground-secondary">{dict.common[item.difficulty]}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
              <Layers className="h-4 w-4 text-accent shrink-0" />
              <span className="text-foreground-secondary tabular">
                {isFA ? faNum(lessonsOf(item)) : lessonsOf(item)} {dict.common.lessons}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-background-secondary px-3 py-2.5">
              {(stat?.enrollments ?? 0) > 0 ? (
                <>
                  <Users className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground-secondary tabular">
                    {isFA ? `${faNum(stat!.enrollments)} ثبت‌نام` : `${stat!.enrollments} enrolled`}
                  </span>
                </>
              ) : (
                <>
                  <Video className="h-4 w-4 text-accent shrink-0" />
                  <span className="text-foreground-secondary tabular">
                    {isFA ? `${faNum(stat?.videos ?? 0)} ویدیو` : `${stat?.videos ?? 0} videos`}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Real curriculum points from the lesson list the admin published */}
          {learnPoints.length > 0 && (
            <div className="mb-5 rounded-lg border border-border p-4">
              <p className="text-caption font-semibold text-foreground mb-3">
                {isFA ? "در این دوره یاد می‌گیرید:" : "What you'll learn:"}
              </p>
              <ul className="space-y-2">
                {learnPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-body-sm text-foreground-secondary">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-5 flex items-center justify-between border-t border-border pt-5">
            <span className="text-caption text-foreground-secondary">{isFA ? "هزینه" : "Fee"}</span>
            {isFree ? (
              <span className="font-display text-h4 text-success">{dict.common.free}</span>
            ) : (
              <span className="font-display text-h4 text-foreground tabular">{priceLabel}</span>
            )}
          </div>

          <EnrollForm item={{ ...item, paymentLabel: priceLabel ?? undefined }} onDone={undefined} />
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-5 text-center">
      <Icon className="h-5 w-5 text-accent" />
      <span className="font-display text-h2 text-foreground tabular">{value}</span>
      <span className="text-caption text-foreground-secondary">{label}</span>
    </div>
  );
}

/* ─── Course Card (grid) ─────────────────────────────────────── */
function CourseCard({
  item,
  onEnroll,
  stat,
}: {
  item: EducationCardData;
  onEnroll: (item: EducationCardData) => void;
  stat?: AcademyItemStat;
}) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const { isFree } = priceOf(item, locale);
  const priceStr = formatItemPrice(item, locale);
  const url = href(locale, `/academy/${item.slug}`);

  const typeColors: Record<string, string> = {
    course: "bg-blue/10 text-blue",
    tutorial: "bg-accent-soft text-accent",
    path: "bg-[#7c3aed]/10 text-[#7c3aed]",
    article: "bg-success/10 text-success",
  };
  const typeLabels: Record<string, string> = {
    course: isFA ? "دوره" : "Course",
    tutorial: isFA ? "آموزش" : "Tutorial",
    path: isFA ? "مسیر" : "Path",
    article: isFA ? "مقاله" : "Article",
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:shadow-medium">
      {/* Thumbnail */}
      <Link href={url} className="relative block aspect-[16/9] overflow-hidden bg-background-secondary">
        <Image
          src={item.image}
          alt={t(item.title, locale)}
          fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          className="img-zoom object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute start-3 top-3">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-medium backdrop-blur-sm", typeColors[item.type] ?? typeColors.course)}>
            {typeLabels[item.type] ?? dict.common[item.type]}
          </span>
        </div>
        {/* Real video count over the artwork */}
        {(stat?.videos ?? 0) > 0 && (
          <div className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-caption text-white backdrop-blur-sm tabular">
            <Play className="h-3 w-3 fill-white" />
            {isFA ? `${faNum(stat!.videos)} ویدیو` : `${stat!.videos} videos`}
          </div>
        )}
        {/* Popular badge — set by the admin in the panel */}
        {item.popular && (
          <div className="absolute end-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/90 px-2.5 py-0.5 text-caption font-medium text-white backdrop-blur-sm">
              <Zap className="h-3 w-3 fill-current" />
              {isFA ? "محبوب" : "Popular"}
            </span>
          </div>
        )}
        {item.featured && !item.popular && (
          <div className="absolute end-3 top-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-2.5 py-0.5 text-caption font-medium text-white backdrop-blur-sm">
              {isFA ? "منتخب" : "Featured"}
            </span>
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {item.category && <p className="text-caption text-accent mb-1.5">{t(item.category.name, locale)}</p>}
        <Link href={url} className="block font-semibold text-foreground hover:text-accent transition-colors line-clamp-2 leading-snug mb-2">
          {t(item.title, locale)}
        </Link>
        <p className="text-body-sm text-foreground-secondary line-clamp-2 mb-4">{t(item.excerpt, locale)}</p>

        {/* Meta row — every value comes from the item itself */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-foreground-secondary mb-3">
          <span className="inline-flex items-center gap-1 tabular">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(minutesOf(item), locale, dict.common)}
          </span>
          {lessonsOf(item) > 1 && (
            <span className="inline-flex items-center gap-1 tabular">
              <Layers className="h-3.5 w-3.5" />
              {isFA ? faNum(lessonsOf(item)) : lessonsOf(item)} {dict.common.lessons}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Signal className="h-3.5 w-3.5" />
            {dict.common[item.difficulty]}
          </span>
        </div>

        {/* Real registrations for this item */}
        {(stat?.enrollments ?? 0) > 0 && (
          <div className="mb-4 inline-flex items-center gap-1.5 text-caption text-success tabular">
            <Users className="h-3.5 w-3.5" />
            {isFA ? `${faNum(stat!.enrollments)} نفر ثبت‌نام کرده‌اند` : `${stat!.enrollments} enrolled`}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          {item.author ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full">
                <Image src={item.author.avatar} alt="" fill sizes="28px" className="object-cover" />
              </span>
              <span className="truncate text-caption text-foreground-secondary">{t(item.author.name, locale)}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="shrink-0">
            {isFree ? (
              <span className="font-semibold text-success">{dict.common.free}</span>
            ) : (
              <span className="font-display text-h4 text-foreground tabular">{priceStr}</span>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-5">
        <button
          onClick={() => onEnroll(item)}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover active:scale-[0.98]"
        >
          {isFree
            ? isFA
              ? "شروع رایگان"
              : "Start free"
            : isFA
              ? "ثبت‌نام در دوره"
              : "Enroll in course"}
        </button>
      </div>
    </article>
  );
}

/* ─── Event / Workshop Row ───────────────────────────────────── */
function EventRow({
  item,
  onEnroll,
  stat,
}: {
  item: EducationCardData;
  onEnroll: (item: EducationCardData) => void;
  stat?: AcademyItemStat;
}) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const { isFree } = priceOf(item, locale);
  const priceStr = formatItemPrice(item, locale);
  const url = href(locale, `/academy/${item.slug}`);
  const seatsLeft = stat?.seatsLeft ?? null;
  const capacity = stat?.capacity ?? 0;

  return (
    <Reveal>
      <div className="group flex flex-col gap-5 overflow-hidden rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-medium sm:flex-row sm:items-center">
        <Link href={url} className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg bg-background-secondary sm:h-24 sm:w-36">
          <Image src={item.image} alt="" fill sizes="144px" className="img-zoom object-cover" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-caption font-medium text-success">
              <Wifi className="h-3 w-3" />
              {isFA ? "رویداد زنده" : "Live Event"}
            </span>
            {item.popular && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-caption font-medium text-warning">
                <Zap className="h-3 w-3 fill-current" />
                {isFA ? "محبوب" : "Popular"}
              </span>
            )}
          </div>
          <Link href={url} className="font-semibold text-foreground hover:text-accent transition-colors line-clamp-1">
            {t(item.title, locale)}
          </Link>
          <p className="text-body-sm text-foreground-secondary line-clamp-1">{t(item.excerpt, locale)}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-caption text-foreground-secondary">
            <span className="inline-flex items-center gap-1 tabular">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(minutesOf(item), locale, dict.common)}
            </span>
            {/* Real seat situation, counted from stored registrations */}
            <span className="inline-flex items-center gap-1 tabular">
              <Users className="h-3.5 w-3.5" />
              {capacity > 0
                ? isFA
                  ? `${faNum(stat?.enrollments ?? 0)} از ${faNum(capacity)} صندلی پر شده`
                  : `${stat?.enrollments ?? 0} of ${capacity} seats taken`
                : isFA
                  ? `${faNum(stat?.enrollments ?? 0)} ثبت‌نام`
                  : `${stat?.enrollments ?? 0} enrolled`}
            </span>
            {item.liveEvent?.startsAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Intl.DateTimeFormat(isFA ? "fa-IR" : "en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(item.liveEvent.startsAt))}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" />
              {isFA ? "آنلاین" : "Online"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          {isFree ? (
            <span className="font-semibold text-success">{dict.common.free}</span>
          ) : (
            <span className="font-display text-h4 whitespace-nowrap text-foreground tabular">{priceStr}</span>
          )}
          <button
            onClick={() => onEnroll(item)}
            disabled={seatsLeft !== null && seatsLeft <= 0}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {seatsLeft !== null && seatsLeft <= 0
              ? isFA
                ? "تکمیل ظرفیت"
                : "Full"
              : isFA
                ? "ثبت‌نام"
                : "Register"}
          </button>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Instructor Card ────────────────────────────────────────── */
function InstructorCard({ item, stat }: { item: EducationCardData; stat?: AcademyInstructorStat }) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  if (!item.author) return null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
        <Image src={item.author.avatar} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{t(item.author.name, locale)}</p>
        <p className="truncate text-body-sm text-foreground-secondary">{t(item.author.profession, locale)}</p>
        <p className="mt-0.5 text-caption text-muted tabular">
          {isFA
            ? `${faNum(stat?.courses ?? 0)} دوره · ${faNum(stat?.events ?? 0)} رویداد · ${faNum(stat?.lessons ?? 0)} درس`
            : `${stat?.courses ?? 0} courses · ${stat?.events ?? 0} events · ${stat?.lessons ?? 0} lessons`}
        </p>
      </div>
      <Link href={href(locale, `/artists/${item.author.slug}`)} className="shrink-0 text-caption text-accent hover:underline">
        {dict.nav.explore}
      </Link>
    </div>
  );
}

/* ─── Main Client Component ──────────────────────────────────── */
export function AcademyClient({ items, categories, initialCategory, stats, itemStats, instructorStats }: Props) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory && initialCategory !== "all" ? initialCategory : "all");
  const [sortKey, setSortKey] = useState<SortKey>("popular");
  const [enrollItem, setEnrollItem] = useState<EducationCardData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "all", label: isFA ? "همه" : "All", icon: BookOpen },
    { key: "course", label: isFA ? "دوره‌ها" : "Courses", icon: Video },
    { key: "workshop", label: isFA ? "ورکشاپ" : "Workshops", icon: Calendar },
    { key: "webinar", label: isFA ? "وبینار" : "Webinars", icon: Globe },
  ];

  const filtered = items.filter((item) => {
    const tabMatch = activeTab === "all" || item.type === activeTab;
    const catMatch = activeCategory === "all" || item.categoryId === activeCategory;
    return tabMatch && catMatch;
  });

  const enrollments = (item: EducationCardData) => itemStats[item.slug]?.enrollments ?? 0;

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "popular") {
      return (
        enrollments(b) - enrollments(a) ||
        (b.popular ? 1 : 0) - (a.popular ? 1 : 0) ||
        (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
      );
    }
    if (sortKey === "newest") return b.publishedAt.localeCompare(a.publishedAt);
    const pa = priceOf(a, locale).value;
    const pb = priceOf(b, locale).value;
    if (sortKey === "price_asc") return pa - pb;
    if (sortKey === "price_desc") return pb - pa;
    return 0;
  });

  const gridItems = sorted.filter((i) => i.type === "course");
  const eventItems = sorted.filter((i) => i.type === "workshop" || i.type === "webinar");

  const n = (v: number) => (isFA ? faNum(v) : String(v));

  const uniqueInstructorItems = items.reduce<EducationCardData[]>((acc, item) => {
    if (item.author && !acc.some((x) => x.authorId === item.authorId)) acc.push(item);
    return acc;
  }, []);
  const statFor = (authorId: string) => instructorStats.find((s) => s.authorId === authorId);

  return (
    <>
      {/* ── Sticky filter bar ────────────────────────────────── */}
      <div className="sticky top-[var(--header-h-compact)] z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container-x">
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "bg-background-secondary text-foreground-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}

            <div className="flex-1" />

            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                showFilters ? "border-accent bg-accent-soft text-accent" : "border-border text-foreground-secondary hover:text-foreground",
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {isFA ? "فیلتر" : "Filter"}
              {activeCategory !== "all" && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>

            <div className="relative shrink-0">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-9 cursor-pointer appearance-none rounded-full border border-border bg-background ps-4 pe-8 text-sm text-foreground focus:border-accent focus:outline-none"
              >
                <option value="popular">{isFA ? "محبوب‌ترین" : "Most popular"}</option>
                <option value="newest">{isFA ? "جدیدترین" : "Newest"}</option>
                <option value="price_asc">{isFA ? "ارزان‌ترین" : "Price: Low to High"}</option>
                <option value="price_desc">{isFA ? "گران‌ترین" : "Price: High to Low"}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border py-3 pb-3.5">
              <span className="text-caption text-muted me-1">{dict.nav.categories}:</span>
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-caption font-medium transition-all",
                  activeCategory === "all" ? "bg-accent text-accent-foreground" : "border border-border text-foreground-secondary hover:border-accent hover:text-accent",
                )}
              >
                {dict.common.all}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-caption font-medium transition-all",
                    activeCategory === c.id ? "bg-accent text-accent-foreground" : "border border-border text-foreground-secondary hover:border-accent hover:text-accent",
                  )}
                >
                  {t(c.name, locale)}
                </button>
              ))}
              {activeCategory !== "all" && (
                <button onClick={() => setActiveCategory("all")} className="inline-flex items-center gap-1 text-caption text-muted hover:text-foreground">
                  <X className="h-3 w-3" />
                  {dict.common.clear}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Stats bar — computed from published content and stored registrations ── */}
      <div className="container-x py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={BookOpen} value={n(stats.courses)} label={isFA ? "دوره آموزشی" : "Courses"} />
          <StatCard icon={Video} value={n(stats.lessons)} label={isFA ? "درس" : "Lessons"} />
          <StatCard icon={Users} value={n(stats.instructors)} label={isFA ? "مدرس" : "Instructors"} />
          <StatCard
            icon={Calendar}
            value={n(stats.enrollments)}
            label={isFA ? "ثبت‌نام واقعی" : "Real enrollments"}
          />
        </div>
        <p className="mt-3 text-caption text-muted">
          {isFA
            ? `مجموع ${faNum(Math.round(stats.minutes / 60))} ساعت آموزش در ${faNum(stats.courses)} دوره. آمار از محتوای منتشرشده و ثبت‌نام‌های واقعی محاسبه می‌شود.`
            : `${Math.round(stats.minutes / 60)} hours of teaching across ${stats.courses} courses. Numbers come from published content and real registrations.`}
        </p>
      </div>

      {/* ── Courses grid ───────────────────────────────────────── */}
      {(activeTab === "all" || activeTab === "course") && gridItems.length > 0 && (
        <section className="container-x pb-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-h3 text-foreground">{isFA ? "دوره‌های آموزشی" : "Courses"}</h2>
            <span className="text-caption text-muted tabular">
              {n(gridItems.length)} {isFA ? "مورد" : "items"}
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {gridItems.map((item, i) => (
              <Reveal key={item.id} delay={i * 60}>
                <CourseCard item={item} onEnroll={setEnrollItem} stat={itemStats[item.slug]} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ── Events / Workshops / Webinars ─────────────────────── */}
      {(activeTab === "all" || activeTab === "workshop" || activeTab === "webinar") && eventItems.length > 0 && (
        <section className="bg-background-secondary">
          <div className="container-x py-14">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-h3 text-foreground">
                {isFA ? "ورکشاپ‌ها، وبینارها و مسیرهای یادگیری" : "Workshops, Webinars & Learning Paths"}
              </h2>
              <span className="text-caption text-muted tabular">
                {n(eventItems.length)} {isFA ? "رویداد" : "events"}
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {eventItems.map((item) => (
                <EventRow key={item.id} item={item} onEnroll={setEnrollItem} stat={itemStats[item.slug]} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {sorted.length === 0 && (
        <div className="container-x py-24 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted" />
          <p className="font-semibold text-foreground">{dict.common.empty}</p>
          <p className="mt-1 text-body-sm text-foreground-secondary">{dict.common.emptyDesc}</p>
          <button
            onClick={() => {
              setActiveTab("all");
              setActiveCategory("all");
            }}
            className="mt-4 text-sm text-accent hover:underline"
          >
            {dict.common.clear}
          </button>
        </div>
      )}

      {/* ── Instructors ───────────────────────────────────────── */}
      {activeTab === "all" && uniqueInstructorItems.length > 0 && (
        <section className="container-x py-14">
          <div className="mb-6">
            <p className="mb-2 text-label text-accent">{isFA ? "مدرسین" : "Instructors"}</p>
            <h2 className="font-display text-h3 text-foreground">{isFA ? "آموزش از بهترین‌ها" : "Learn from the best"}</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueInstructorItems.slice(0, 6).map((item) => (
              <InstructorCard key={item.authorId} item={item} stat={statFor(item.authorId)} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA Banner ────────────────────────────────────────── */}
      {activeTab === "all" && (
        <section className="bg-[#0f141c]">
          <div className="container-x py-16 text-center text-white">
            <p className="mb-3 text-label text-white/60">{isFA ? "همین حالا شروع کن" : "Start today"}</p>
            <h2 className="mb-4 font-display text-h1 text-white text-balance">
              {isFA ? "به آکادمی رزی بپیوند." : "Join Rosie Academy."}
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-body-lg text-white/70">
              {isFA
                ? "از مبانی طراحی الگو تا انتشار حرفه‌ای — با مدرسان تجربی یاد بگیر."
                : "From pattern design fundamentals to professional publishing — learn with experienced instructors."}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="accent" size="lg" href={href(locale, featuredHref(items))}>
                {isFA ? "شروع با دوره منتخب" : "Start with the featured course"}
              </Button>
              <Button variant="glass" size="lg" href={href(locale, "/contact")}>
                {isFA ? "پرسش از آکادمی" : "Ask the academy"}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Register modal ────────────────────────────────────── */}
      {enrollItem && (
        <EnrollModal item={enrollItem} stat={itemStats[enrollItem.slug]} onClose={() => setEnrollItem(null)} />
      )}
    </>
  );
}

/** Featured course link for the closing CTA (falls back to the catalogue). */
function featuredHref(items: EducationCardData[]): string {
  const featured = items.find((item) => item.featured && item.type === "course") ?? items[0];
  return featured ? `/academy/${featured.slug}` : "/academy";
}
