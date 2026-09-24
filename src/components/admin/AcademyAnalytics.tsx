"use client";

/**
 * AcademyAnalytics — تب آمار و گزارش آکادمی
 *
 * نمایش می‌دهد:
 *  - KPI Cards: کل آیتم‌ها، ثبت‌نام‌ها، ظرفیت خالی، درآمد تخمینی
 *  - وضعیت رویدادهای زنده / آینده
 *  - جدول دقیق هر رویداد با ظرفیت‌سنج
 *  - توزیع نوع محتوا
 *  - ۵ دوره برتر از نظر ثبت‌نام
 *  - نرخ پر شدن ظرفیت وبینارها / ورکشاپ‌ها
 */

import { useMemo, useState } from "react";
import {
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  GraduationCap,
  Mic2,
  Radio,
  Star,
  TrendingUp,
  Users,
  Video,
  Zap,
  AlertCircle,
  Copy,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { cn, href, t } from "@/lib/utils";
import type { EducationItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";

/* ─── helpers ──────────────────────────────────────────────────── */

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

function fmtNum(n: number) {
  return n.toLocaleString("fa-IR");
}

function fmtPrice(n: number) {
  return `${n.toLocaleString("fa-IR")} ت`;
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function capacityColor(p: number) {
  if (p >= 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-400";
  return "bg-emerald-500";
}

/* ─── Sub-components ───────────────────────────────────────────── */

function KpiCard({
  icon, label, value, sub, color = "blue", highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "rose" | "emerald" | "amber" | "purple";
  highlight?: boolean;
}) {
  const colors = {
    blue:    { bg: "bg-blue-50",   text: "text-blue-700",   icon: "text-blue-500"   },
    rose:    { bg: "bg-rose-50",   text: "text-rose-700",   icon: "text-rose-500"   },
    emerald: { bg: "bg-emerald-50",text: "text-emerald-700",icon: "text-emerald-500"},
    amber:   { bg: "bg-amber-50",  text: "text-amber-700",  icon: "text-amber-500"  },
    purple:  { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500" },
  };
  const c = colors[color];
  return (
    <div className={cn(
      "rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-sm",
      highlight && "ring-2 ring-red-400/40 border-red-200"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", c.bg)}>
          <span className={c.icon}>{icon}</span>
        </div>
        {highlight && (
          <span className="flex items-center gap-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-foreground tabular-nums leading-none">{typeof value === "number" ? fmtNum(value) : value}</p>
      <p className="mt-1 text-xs font-medium text-muted">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-foreground-secondary">{sub}</p>}
    </div>
  );
}

function DonutSegment({
  label, count, total, color,
}: {
  label: string; count: number; total: number; color: string;
}) {
  const p = pct(count, total);
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", color)} />
      <span className="flex-1 text-sm text-foreground-secondary">{label}</span>
      <span className="font-semibold tabular-nums text-sm text-foreground">{fmtNum(count)}</span>
      <span className="w-8 text-right text-xs text-muted tabular-nums">{p}٪</span>
    </div>
  );
}

function CapacityBar({ registered, capacity }: { registered: number; capacity: number }) {
  if (!capacity) return <span className="text-xs text-muted">نامحدود</span>;
  const p = pct(registered, capacity);
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", capacityColor(p))}
          style={{ width: `${Math.min(p, 100)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted whitespace-nowrap">
        {fmtNum(registered)}/{fmtNum(capacity)}
      </span>
      <span className={cn(
        "text-[10px] font-bold tabular-nums",
        p >= 90 ? "text-red-600" : p >= 70 ? "text-amber-600" : "text-emerald-600"
      )}>{p}٪</span>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */

type AnalyticsFilter = "all" | "webinar" | "workshop" | "course";

export function AcademyAnalytics({
  items,
  locale,
}: {
  items: EducationItem[];
  locale: Locale;
}) {
  const [filter, setFilter] = useState<AnalyticsFilter>("all");

  /* ── computed stats ── */
  const stats = useMemo(() => {
    const courses   = items.filter((i) => i.type === "course");
    const workshops = items.filter((i) => i.type === "workshop");
    const webinars  = items.filter((i) => i.type === "webinar");

    const liveNow    = items.filter((i) => i.liveEvent?.status === "live");
    const scheduled  = items.filter((i) => i.liveEvent?.status === "scheduled");
    const ended      = items.filter((i) => i.liveEvent?.status === "ended");
    const freeItems  = items.filter((i) => !i.price || i.price.fa === 0);
    const paidItems  = items.filter((i) => i.price && i.price.fa > 0);

    const totalRegistered = items.reduce((s, i) => s + (i.liveEvent?.registeredCount ?? 0), 0);
    const totalCapacity   = items.reduce((s, i) => s + (i.liveEvent?.capacity ?? 0), 0);
    const totalVideos     = items.reduce((s, i) => s + (i.videoFiles?.length ?? 0), 0);
    const totalRevEst     = items.reduce((s, i) => {
      if (!i.price?.fa || !i.liveEvent?.registeredCount) return s;
      return s + i.price.fa * i.liveEvent.registeredCount;
    }, 0);

    // Top 5 by registered count
    const byRegistered = [...items]
      .filter((i) => i.liveEvent && i.liveEvent.registeredCount > 0)
      .sort((a, b) => (b.liveEvent?.registeredCount ?? 0) - (a.liveEvent?.registeredCount ?? 0))
      .slice(0, 5);

    // Live events
    const liveEvents = items
      .filter((i) => i.liveEvent)
      .sort((a, b) => {
        const order: Record<string, number> = { live: 0, scheduled: 1, ended: 2, cancelled: 3 };
        return (order[a.liveEvent!.status] ?? 9) - (order[b.liveEvent!.status] ?? 9);
      });

    return {
      total: items.length,
      courses, workshops, webinars,
      liveNow, scheduled, ended,
      freeItems, paidItems,
      totalRegistered, totalCapacity, totalVideos, totalRevEst,
      byRegistered, liveEvents,
      capacityFillPct: totalCapacity > 0 ? pct(totalRegistered, totalCapacity) : null,
    };
  }, [items]);

  /* ── filtered events table ── */
  const tableItems = useMemo(() => {
    const base = filter === "all"
      ? items.filter((i) => i.liveEvent)
      : filter === "course"
      ? items.filter((i) => i.type === "course")
      : items.filter((i) => i.type === filter && i.liveEvent);
    return [...base].sort((a, b) => {
      const order: Record<string, number> = { live: 0, scheduled: 1, ended: 2, cancelled: 3 };
      const sa = a.liveEvent?.status ?? "ended";
      const sb = b.liveEvent?.status ?? "ended";
      return (order[sa] ?? 9) - (order[sb] ?? 9);
    });
  }, [items, filter]);

  const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
    live:      { label: "🔴 زنده",           dot: "bg-red-500 animate-pulse", badge: "bg-red-100 text-red-700 border-red-200" },
    scheduled: { label: "زمان‌بندی شده",      dot: "bg-amber-400",             badge: "bg-amber-50 text-amber-700 border-amber-200" },
    ended:     { label: "پایان‌یافته",         dot: "bg-zinc-400",              badge: "bg-zinc-100 text-zinc-600 border-zinc-200" },
    cancelled: { label: "لغوشده",             dot: "bg-red-300",               badge: "bg-red-50 text-red-400 border-red-100" },
  };

  const TYPE_COLOR: Record<string, string> = {
    course:   "text-blue-600 bg-blue-50 border-blue-200",
    workshop: "text-emerald-600 bg-emerald-50 border-emerald-200",
    webinar:  "text-rose-600 bg-rose-50 border-rose-200",
  };
  const TYPE_LABEL: Record<string, string> = {
    course: "دوره", workshop: "ورکشاپ", webinar: "وبینار",
  };

  /* ─── export CSV ─── */
  const exportCSV = () => {
    const rows = [
      ["عنوان", "نوع", "وضعیت", "تاریخ", "ثبت‌نام", "ظرفیت", "درصد پر شدن", "قیمت (تومان)"].join(","),
      ...tableItems.map((i) => [
        `"${t(i.title, "fa")}"`,
        `"${TYPE_LABEL[i.type]}"`,
        `"${i.liveEvent ? STATUS_META[i.liveEvent.status]?.label ?? i.liveEvent.status : "—"}"`,
        `"${i.liveEvent?.startsAt ? fmtDate(i.liveEvent.startsAt) : "—"}"`,
        i.liveEvent?.registeredCount ?? "—",
        i.liveEvent?.capacity ?? "—",
        i.liveEvent?.capacity
          ? `${pct(i.liveEvent.registeredCount, i.liveEvent.capacity)}٪`
          : "—",
        i.price?.fa ?? 0,
      ].join(",")),
    ];
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `academy-analytics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <BarChart2 className="h-5 w-5 text-accent" />
            آمار و گزارش آکادمی
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            تحلیل کامل دوره‌ها، رویدادها، ثبت‌نام‌ها و ظرفیت‌ها
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-foreground-secondary hover:border-accent/50 hover:text-foreground transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          خروجی CSV
        </button>
      </div>

      {/* ── Live alert ── */}
      {stats.liveNow.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <strong>{stats.liveNow.length} رویداد</strong> در حال پخش زنده است.
          <div className="mr-auto flex flex-wrap gap-2">
            {stats.liveNow.map((e) => (
              <Link
                key={e.id}
                href={href(locale, `/academy/${e.slug}/broadcast`)}
                target="_blank"
                className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
              >
                <Radio className="h-3 w-3" />
                {t(e.title, "fa")}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={<GraduationCap className="h-4 w-4" />} label="دوره آموزشی"    value={stats.courses.length}   color="blue" />
        <KpiCard icon={<Mic2 className="h-4 w-4" />}          label="ورکشاپ"         value={stats.workshops.length} color="emerald" />
        <KpiCard icon={<Radio className="h-4 w-4" />}         label="وبینار"          value={stats.webinars.length}  color="rose" />
        <KpiCard
          icon={<Zap className="h-4 w-4" />}
          label="رویداد زنده"
          value={stats.liveNow.length}
          sub={stats.liveNow.length > 0 ? "همین الان" : undefined}
          color="rose"
          highlight={stats.liveNow.length > 0}
        />
        <KpiCard icon={<Users className="h-4 w-4" />}         label="کل ثبت‌نام"     value={stats.totalRegistered} color="purple" sub={stats.totalCapacity > 0 ? `از ${fmtNum(stats.totalCapacity)} ظرفیت` : undefined} />
        <KpiCard icon={<Video className="h-4 w-4" />}         label="ویدیوی آپلودشده" value={stats.totalVideos}      color="amber" />
      </div>

      {/* ── Second row KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<Calendar className="h-4 w-4" />}     label="رویداد زمان‌بندی‌شده" value={stats.scheduled.length} color="amber" />
        <KpiCard icon={<CheckCircle2 className="h-4 w-4" />} label="رویداد پایان‌یافته"    value={stats.ended.length}     color="blue" />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="درآمد تخمینی"
          value={fmtPrice(stats.totalRevEst)}
          sub="بر اساس ثبت‌نام × قیمت"
          color="emerald"
        />
        <KpiCard
          icon={<Star className="h-4 w-4" />}
          label="نرخ پر شدن ظرفیت"
          value={stats.capacityFillPct !== null ? `${stats.capacityFillPct}٪` : "—"}
          sub={stats.totalCapacity > 0 ? `${fmtNum(stats.totalRegistered)} از ${fmtNum(stats.totalCapacity)}` : "ظرفیت نامحدود"}
          color="purple"
        />
      </div>

      {/* ── Two-col: Distribution + Top 5 ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Type distribution */}
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-accent" />
            توزیع نوع محتوا
          </h4>
          <div className="space-y-3">
            <DonutSegment label="دوره آموزشی" count={stats.courses.length}   total={stats.total} color="bg-blue-500" />
            <DonutSegment label="ورکشاپ"      count={stats.workshops.length} total={stats.total} color="bg-emerald-500" />
            <DonutSegment label="وبینار"       count={stats.webinars.length}  total={stats.total} color="bg-rose-500" />
            <DonutSegment label="رایگان"       count={stats.freeItems.length} total={stats.total} color="bg-amber-400" />
            <DonutSegment label="پولی"         count={stats.paidItems.length} total={stats.total} color="bg-purple-500" />
          </div>

          {/* Simple bar chart */}
          <div className="mt-4 space-y-2">
            {[
              { label: "دوره",    val: stats.courses.length,   max: stats.total, color: "bg-blue-500" },
              { label: "ورکشاپ", val: stats.workshops.length, max: stats.total, color: "bg-emerald-500" },
              { label: "وبینار",  val: stats.webinars.length,  max: stats.total, color: "bg-rose-500" },
            ].map(({ label, val, max, color }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-muted">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", color)}
                    style={{ width: max ? `${pct(val, max)}%` : "0%" }}
                  />
                </div>
                <span className="w-6 text-right font-semibold tabular-nums text-foreground">{fmtNum(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 by registered */}
        <div className="rounded-xl border border-border bg-white p-5 space-y-4">
          <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            ۵ رویداد برتر (بیشترین ثبت‌نام)
          </h4>
          {stats.byRegistered.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">هنوز ثبت‌نامی ثبت نشده</p>
          ) : (
            <div className="space-y-3">
              {stats.byRegistered.map((item, i) => {
                const reg = item.liveEvent?.registeredCount ?? 0;
                const cap = item.liveEvent?.capacity ?? 0;
                const max = stats.byRegistered[0]?.liveEvent?.registeredCount ?? 1;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-muted">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-medium", TYPE_COLOR[item.type])}>
                          {TYPE_LABEL[item.type]}
                        </span>
                        <span className="truncate text-xs font-medium text-foreground">
                          {t(item.title, "fa")}
                        </span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${pct(reg, max)}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-foreground tabular-nums">{fmtNum(reg)}</p>
                      {cap > 0 && <p className="text-[10px] text-muted">{pct(reg, cap)}٪</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Events Table ── */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        {/* Table header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h4 className="font-semibold text-sm text-foreground">
            جدول رویدادها
          </h4>
          {/* Filter tabs */}
          <div className="flex gap-1 rounded-lg border border-border bg-background-secondary p-0.5 text-xs">
            {(["all", "webinar", "workshop", "course"] as AnalyticsFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1 font-medium transition-colors",
                  filter === f ? "bg-[#1e2230] text-white" : "text-foreground-secondary hover:text-foreground"
                )}
              >
                {{ all: "همه", webinar: "وبینار", workshop: "ورکشاپ", course: "دوره" }[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background-secondary text-xs text-muted">
                <th className="px-4 py-2.5 text-right font-medium">عنوان</th>
                <th className="px-4 py-2.5 text-right font-medium">نوع</th>
                <th className="px-4 py-2.5 text-right font-medium">وضعیت</th>
                <th className="px-4 py-2.5 text-right font-medium">تاریخ</th>
                <th className="px-4 py-2.5 text-right font-medium">ظرفیت</th>
                <th className="px-4 py-2.5 text-right font-medium">قیمت</th>
                <th className="px-4 py-2.5 text-center font-medium">لینک</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tableItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-muted">
                    رویدادی برای نمایش وجود ندارد
                  </td>
                </tr>
              ) : (
                tableItems.map((item) => {
                  const ls = item.liveEvent?.status;
                  const statusMeta = ls ? STATUS_META[ls] : null;
                  const reg = item.liveEvent?.registeredCount ?? 0;
                  const cap = item.liveEvent?.capacity ?? 0;
                  const isFree = !item.price || item.price.fa === 0;

                  return (
                    <tr key={item.id} className="hover:bg-background-secondary/50 transition-colors">
                      {/* Title */}
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate font-medium text-foreground">{t(item.title, "fa")}</p>
                        {item.liveEvent?.durationMin && (
                          <p className="mt-0.5 text-[11px] text-muted flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {item.liveEvent.durationMin} دقیقه
                          </p>
                        )}
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", TYPE_COLOR[item.type])}>
                          {TYPE_LABEL[item.type]}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {statusMeta ? (
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", statusMeta.badge)}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", statusMeta.dot)} />
                            {statusMeta.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-foreground-secondary whitespace-nowrap">
                        {item.liveEvent?.startsAt ? fmtDate(item.liveEvent.startsAt) : "—"}
                      </td>

                      {/* Capacity bar */}
                      <td className="px-4 py-3">
                        {item.liveEvent ? (
                          <CapacityBar registered={reg} capacity={cap} />
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3">
                        <span className={cn("text-xs font-medium", isFree ? "text-emerald-600" : "text-foreground")}>
                          {isFree ? "رایگان" : fmtPrice(item.price!.fa)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={href(locale, `/academy/${item.slug}`)}
                            target="_blank"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted hover:border-accent hover:text-accent transition-colors"
                            title="مشاهده صفحه"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {(item.type === "webinar" || item.type === "workshop") && item.liveEvent?.status === "live" && (
                            <Link
                              href={href(locale, `/academy/${item.slug}/broadcast`)}
                              target="_blank"
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                              title="کنترل پخش زنده"
                            >
                              <Radio className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {(item.type === "webinar" || item.type === "workshop") && (
                            <Link
                              href={href(locale, `/academy/${item.slug}/live`)}
                              target="_blank"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                              title="لینک ورود شرکت‌کنندگان"
                            >
                              <Users className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="border-t border-border bg-background-secondary px-5 py-2.5 text-xs text-muted flex items-center justify-between">
          <span>{fmtNum(tableItems.length)} رویداد نمایش داده می‌شود</span>
          <span>کل ثبت‌نام: <strong className="text-foreground">{fmtNum(tableItems.reduce((s, i) => s + (i.liveEvent?.registeredCount ?? 0), 0))}</strong></span>
        </div>
      </div>

      {/* ── Capacity fill warning ── */}
      {stats.liveEvents.filter((e) => {
        const cap = e.liveEvent?.capacity ?? 0;
        const reg = e.liveEvent?.registeredCount ?? 0;
        return cap > 0 && pct(reg, cap) >= 80;
      }).length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            رویدادهای نزدیک به تکمیل ظرفیت
          </p>
          <div className="space-y-1.5">
            {stats.liveEvents
              .filter((e) => {
                const cap = e.liveEvent?.capacity ?? 0;
                const reg = e.liveEvent?.registeredCount ?? 0;
                return cap > 0 && pct(reg, cap) >= 80;
              })
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-sm text-amber-700">
                  <span className="flex-1 truncate font-medium">{t(e.title, "fa")}</span>
                  <CapacityBar
                    registered={e.liveEvent!.registeredCount}
                    capacity={e.liveEvent!.capacity}
                  />
                </div>
              ))}
          </div>
        </div>
      )}

    </div>
  );
}
