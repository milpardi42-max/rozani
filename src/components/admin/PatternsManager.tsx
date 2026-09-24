"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Filter,
  Flame,
  Grid3X3,
  LayoutList,
  Palette,
  Search,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn, href, t } from "@/lib/utils";
import type { Pattern, Category, Artist, SiteContent } from "@/lib/types";

/* ─── helpers ─── */
function farsiNum(n: number) {
  return n.toLocaleString("fa-IR");
}

type FlagKey = "featured" | "trending" | "bestSeller" | "isNew";

const FLAG_META: Record<FlagKey, { label: string; icon: React.ReactNode; color: string }> = {
  featured: {
    label: "منتخب",
    icon: <Star className="h-3 w-3" />,
    color: "border-amber-300 bg-amber-50 text-amber-700",
  },
  trending: {
    label: "پرطرفدار",
    icon: <TrendingUp className="h-3 w-3" />,
    color: "border-rose-300 bg-rose-50 text-rose-700",
  },
  bestSeller: {
    label: "پرفروش",
    icon: <Flame className="h-3 w-3" />,
    color: "border-orange-300 bg-orange-50 text-orange-700",
  },
  isNew: {
    label: "جدید",
    icon: <Sparkles className="h-3 w-3" />,
    color: "border-emerald-300 bg-emerald-50 text-emerald-700",
  },
};

const FLAGS: FlagKey[] = ["featured", "trending", "bestSeller", "isNew"];

/* ─── PatternRow (list view) ─── */
function PatternRow({
  pattern,
  artist,
  category,
  onChange,
  viewHref,
}: {
  pattern: Pattern;
  artist: Artist | null;
  category: Category | null;
  onChange: (updated: Pattern) => void;
  viewHref: string;
}) {
  const toggle = (f: FlagKey) => onChange({ ...pattern, [f]: !pattern[f] });

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-medium sm:flex-row sm:items-center">
      {/* تصویر */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-background-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pattern.image} alt={t(pattern.title, "fa")} className="h-full w-full object-cover" />
        {/* رنگ‌های palette */}
        {pattern.palette?.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 flex h-2">
            {pattern.palette.slice(0, 5).map((hex, i) => (
              <div key={i} className="flex-1" style={{ background: hex }} />
            ))}
          </div>
        )}
      </div>

      {/* اطلاعات */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={viewHref}
            target="_blank"
            className="truncate text-sm font-semibold text-foreground hover:text-accent hover:underline underline-offset-4 transition-colors"
          >
            {t(pattern.title, "fa")}
          </Link>
          <code className="rounded bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted shrink-0">
            {pattern.sku}
          </code>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
          {artist ? (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3 opacity-60" />
              {t(artist.name, "fa")}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-accent font-medium">
              <Palette className="h-3 w-3" />
              سایت
            </span>
          )}
          {category && (
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3 opacity-60" />
              {t(category.name, "fa")}
            </span>
          )}
          {pattern.colorways && pattern.colorways.length > 0 && (
            <span className="flex items-center gap-1.5">
              {pattern.colorways.slice(0, 5).map((cw, i) => (
                <span key={i} className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ background: cw.hex }} />
              ))}
              {pattern.colorways.length > 5 && <span>+{pattern.colorways.length - 5}</span>}
            </span>
          )}
          <span className="tabular-nums text-muted/70">{new Date(pattern.createdAt).toLocaleDateString("fa-IR")}</span>
        </div>
      </div>

      {/* پرچم‌ها */}
      <div className="flex flex-wrap gap-1.5 shrink-0">
        {FLAGS.map((f) => {
          const on = Boolean(pattern[f]);
          const m = FLAG_META[f];
          return (
            <button
              key={f}
              type="button"
              onClick={() => toggle(f)}
              title={m.label}
              className={cn(
                "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all duration-150",
                on ? m.color : "border-border text-foreground-secondary hover:border-foreground-secondary/70",
              )}
            >
              {m.icon}
              {m.label}
            </button>
          );
        })}
      </div>

      {/* آیکون مشاهده */}
      <Link
        href={viewHref}
        target="_blank"
        className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-background-secondary hover:text-foreground transition-colors"
        title="مشاهده در سایت"
      >
        <Eye className="h-4 w-4" />
      </Link>
    </li>
  );
}

/* ─── PatternGridCard (grid view) ─── */
function PatternGridCard({
  pattern,
  artist,
  category,
  onChange,
  viewHref,
}: {
  pattern: Pattern;
  artist: Artist | null;
  category: Category | null;
  onChange: (updated: Pattern) => void;
  viewHref: string;
}) {
  const toggle = (f: FlagKey) => onChange({ ...pattern, [f]: !pattern[f] });
  const activeFlags = FLAGS.filter((f) => pattern[f]);

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-white overflow-hidden transition-shadow hover:shadow-medium">
      {/* تصویر */}
      <div className="relative aspect-[4/3] overflow-hidden bg-background-secondary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pattern.image}
          alt={t(pattern.title, "fa")}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* نوار رنگ‌ها */}
        {pattern.palette?.length > 0 && (
          <div className="absolute bottom-0 inset-x-0 flex h-2.5">
            {pattern.palette.slice(0, 6).map((hex, i) => (
              <div key={i} className="flex-1" style={{ background: hex }} />
            ))}
          </div>
        )}
        {/* badge ها */}
        <div className="absolute inset-x-2 top-2 flex flex-wrap gap-1">
          {activeFlags.map((f) => {
            const m = FLAG_META[f];
            return (
              <span key={f} className={cn("flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", m.color)}>
                {m.icon}{m.label}
              </span>
            );
          })}
        </div>
        {/* دکمه مشاهده */}
        <Link
          href={viewHref}
          target="_blank"
          className="absolute inset-x-2 bottom-4 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-black/70 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 backdrop-blur-sm"
        >
          <Eye className="h-3.5 w-3.5" />
          مشاهده در سایت
        </Link>
        {/* colorway dots */}
        {pattern.colorways && pattern.colorways.length > 0 && (
          <div className="absolute left-2 bottom-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {pattern.colorways.slice(0, 5).map((cw, i) => (
              <span key={i} className="h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ background: cw.hex }} />
            ))}
          </div>
        )}
      </div>

      {/* محتوا */}
      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{t(pattern.title, "fa")}</p>
            <p className="text-[11px] text-muted">
              {artist ? t(artist.name, "fa") : <span className="text-accent font-medium">رزی</span>}
              {category && <> · {t(category.name, "fa")}</>}
            </p>
          </div>
          <code className="shrink-0 rounded bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted">{pattern.sku}</code>
        </div>

        {/* کنترل پرچم‌ها */}
        <div className="grid grid-cols-2 gap-1">
          {FLAGS.map((f) => {
            const on = Boolean(pattern[f]);
            const m = FLAG_META[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggle(f)}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all duration-150 justify-center",
                  on ? m.color : "border-border text-foreground-secondary hover:border-foreground-secondary/70",
                )}
              >
                {m.icon}
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Stats Bar ─── */
function StatsBar({ patterns }: { patterns: Pattern[] }) {
  const total = patterns.length;
  const siteOwned = patterns.filter((p) => !p.artistId).length;
  const artistOwned = patterns.filter((p) => !!p.artistId).length;
  const featured = patterns.filter((p) => p.featured).length;
  const trending = patterns.filter((p) => p.trending).length;
  const bestSeller = patterns.filter((p) => p.bestSeller).length;
  const isNew = patterns.filter((p) => p.isNew).length;

  const stats = [
    { label: "کل پترن‌ها", value: total, icon: <Grid3X3 className="h-4 w-4" />, color: "text-foreground bg-background-secondary" },
    { label: "رزی آتلیه", value: siteOwned, icon: <Palette className="h-4 w-4" />, color: "text-accent bg-accent/10" },
    { label: "هنرمندان", value: artistOwned, icon: <Users className="h-4 w-4" />, color: "text-purple-700 bg-purple-50" },
    { label: "منتخب", value: featured, icon: <Star className="h-4 w-4" />, color: "text-amber-700 bg-amber-50" },
    { label: "پرطرفدار", value: trending, icon: <TrendingUp className="h-4 w-4" />, color: "text-rose-700 bg-rose-50" },
    { label: "پرفروش", value: bestSeller, icon: <Flame className="h-4 w-4" />, color: "text-orange-700 bg-orange-50" },
    { label: "جدید", value: isNew, icon: <Sparkles className="h-4 w-4" />, color: "text-emerald-700 bg-emerald-50" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col items-center gap-1 rounded-xl border border-border bg-white px-3 py-3 text-center shadow-soft"
        >
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.color)}>
            {s.icon}
          </div>
          <p className="text-xl font-bold tabular-nums text-foreground">{farsiNum(s.value)}</p>
          <p className="text-[10px] text-muted leading-tight">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Category breakdown ─── */
function CategoryBreakdown({
  patterns,
  categories,
}: {
  patterns: Pattern[];
  categories: Category[];
}) {
  const items = categories
    .map((c) => ({
      cat: c,
      count: patterns.filter((p) => p.categoryId === c.id).length,
    }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.count - a.count);

  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
      <p className="mb-4 text-sm font-semibold text-foreground">توزیع بر اساس دسته‌بندی</p>
      <div className="space-y-2.5">
        {items.map(({ cat, count }) => (
          <div key={cat.id} className="flex items-center gap-3">
            <p className="w-28 shrink-0 truncate text-xs text-foreground-secondary text-left">{t(cat.name, "fa")}</p>
            <div className="flex-1 h-2 rounded-full bg-background-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-700"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-muted">
              {farsiNum(count)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   کامپوننت اصلی PatternsManager
   ════════════════════════════════════════════════ */
export function PatternsManager({
  data,
  update,
}: {
  data: SiteContent;
  update: (patch: Partial<SiteContent>) => void;
}) {
  const locale = "fa";
  const [search, setSearch] = useState("");
  const [filterFlag, setFilterFlag] = useState<FlagKey | "all" | "site" | "artist">("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortKey, setSortKey] = useState<"date" | "name" | "likes">("date");
  const [sortAsc, setSortAsc] = useState(false);

  /* map lookup */
  const artistMap = useMemo(
    () => Object.fromEntries(data.artists.map((a) => [a.id, a])),
    [data.artists],
  );
  const categoryMap = useMemo(
    () => Object.fromEntries(data.categories.map((c) => [c.id, c])),
    [data.categories],
  );

  /* filter + sort */
  const filtered = useMemo(() => {
    let list = data.patterns.slice();

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          t(p.title, "fa").toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (artistMap[p.artistId ?? ""]
            ? t(artistMap[p.artistId!].name, "fa").toLowerCase().includes(q)
            : false),
      );
    }

    // owner filter
    if (filterFlag === "site") list = list.filter((p) => !p.artistId);
    else if (filterFlag === "artist") list = list.filter((p) => !!p.artistId);
    else if (filterFlag !== "all") list = list.filter((p) => Boolean(p[filterFlag as FlagKey]));

    // category filter
    if (filterCat !== "all") list = list.filter((p) => p.categoryId === filterCat);

    // sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "name") cmp = t(a.title, "fa").localeCompare(t(b.title, "fa"));
      else if (sortKey === "likes") cmp = a.likes - b.likes;
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [data.patterns, search, filterFlag, filterCat, sortKey, sortAsc, artistMap]);

  /* update a single pattern */
  const onPatternChange = (updated: Pattern) => {
    update({ patterns: data.patterns.map((p) => (p.id === updated.id ? updated : p)) });
  };

  const flagFilters: { id: FlagKey | "all" | "site" | "artist"; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "همه", icon: <Grid3X3 className="h-3.5 w-3.5" /> },
    { id: "featured", label: "منتخب", icon: <Star className="h-3.5 w-3.5" /> },
    { id: "trending", label: "پرطرفدار", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "bestSeller", label: "پرفروش", icon: <Flame className="h-3.5 w-3.5" /> },
    { id: "isNew", label: "جدید", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "site", label: "رزی آتلیه", icon: <Palette className="h-3.5 w-3.5" /> },
    { id: "artist", label: "هنرمندان", icon: <Users className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="space-y-5">

      {/* ── عنوان ── */}
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Palette className="h-4 w-4" />
          </span>
          پترن‌ها
        </h1>
        <p className="mt-1 text-sm text-muted">
          مدیریت همه پترن‌های سایت — رزی آتلیه، هنرمندان و کاربران
        </p>
      </div>

      {/* ── کارت‌های آمار ── */}
      <StatsBar patterns={data.patterns} />

      {/* ── ردیف نمودار دسته‌بندی + فیلتر/جستجو ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">

          {/* جستجو + دکمه‌های فیلتر */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* جعبه جستجو */}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input
                  type="text"
                  dir="rtl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو در عنوان، کد SKU، نام هنرمند…"
                  className="h-10 w-full rounded-lg border border-border bg-background-secondary pr-9 pl-3 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* سورت */}
              <div className="flex items-center gap-2">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as "date" | "name" | "likes")}
                  className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus:outline-none"
                >
                  <option value="date">جدیدترین</option>
                  <option value="name">نام</option>
                  <option value="likes">لایک</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortAsc(!sortAsc)}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-background-secondary transition-colors"
                  title={sortAsc ? "صعودی" : "نزولی"}
                >
                  {sortAsc ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                </button>

                {/* نمای گرید / لیست */}
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center transition-colors",
                      viewMode === "grid" ? "bg-foreground text-white" : "bg-white text-muted hover:bg-background-secondary",
                    )}
                    title="نمای شبکه"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center border-r border-border transition-colors",
                      viewMode === "list" ? "bg-foreground text-white" : "bg-white text-muted hover:bg-background-secondary",
                    )}
                    title="نمای فهرست"
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* چیپ‌های فیلتر */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="flex items-center gap-1 text-xs text-muted">
                <Filter className="h-3 w-3" />
                فیلتر:
              </span>
              {flagFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterFlag(f.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                    filterFlag === f.id
                      ? "border-foreground bg-foreground text-white"
                      : "border-border text-foreground-secondary hover:border-foreground-secondary",
                  )}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>

            {/* فیلتر دسته‌بندی */}
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="flex items-center gap-1 text-xs text-muted">
                <Tag className="h-3 w-3" />
                دسته:
              </span>
              <button
                type="button"
                onClick={() => setFilterCat("all")}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                  filterCat === "all"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-foreground-secondary hover:border-foreground-secondary",
                )}
              >
                همه دسته‌ها
              </button>
              {data.categories.map((c) => {
                const count = data.patterns.filter((p) => p.categoryId === c.id).length;
                if (count === 0) return null;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFilterCat(c.id)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                      filterCat === c.id
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-foreground-secondary hover:border-foreground-secondary",
                    )}
                  >
                    {t(c.name, "fa")} <span className="opacity-60">({farsiNum(count)})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* شمارنده نتایج */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted">
              {farsiNum(filtered.length)} پترن{" "}
              {filtered.length !== data.patterns.length && `از ${farsiNum(data.patterns.length)}`}
            </p>
            {(search || filterFlag !== "all" || filterCat !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterFlag("all");
                  setFilterCat("all");
                }}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <X className="h-3 w-3" />
                پاک کردن فیلترها
              </button>
            )}
          </div>

          {/* لیست/گرید پترن‌ها */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-secondary text-muted">
                <Palette className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground">پترنی یافت نشد</p>
              <p className="text-xs text-muted">فیلترها را تغییر دهید یا جستجو را پاک کنید</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <PatternGridCard
                  key={p.id}
                  pattern={p}
                  artist={artistMap[p.artistId ?? ""] ?? null}
                  category={categoryMap[p.categoryId] ?? null}
                  onChange={onPatternChange}
                  viewHref={href(locale, `/patterns/${p.slug}`)}
                />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((p) => (
                <PatternRow
                  key={p.id}
                  pattern={p}
                  artist={artistMap[p.artistId ?? ""] ?? null}
                  category={categoryMap[p.categoryId] ?? null}
                  onChange={onPatternChange}
                  viewHref={href(locale, `/patterns/${p.slug}`)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* ستون راست: نمودار دسته‌بندی */}
        <div className="space-y-4">
          <CategoryBreakdown patterns={data.patterns} categories={data.categories} />

          {/* راهنمای پرچم‌ها */}
          <div className="rounded-xl border border-border bg-white p-5 shadow-soft">
            <p className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" />
              راهنمای پرچم‌ها
            </p>
            <div className="space-y-3">
              {FLAGS.map((f) => {
                const m = FLAG_META[f];
                const count = data.patterns.filter((p) => Boolean(p[f])).length;
                return (
                  <div key={f} className="flex items-center gap-3">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-md border text-[10px]", m.color)}>
                      {m.icon}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">{m.label}</p>
                        <span className="text-xs tabular-nums text-muted">{farsiNum(count)}</span>
                      </div>
                      <div className="mt-1 h-1 w-full rounded-full bg-background-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent/60 transition-all duration-700"
                          style={{ width: `${data.patterns.length ? (count / data.patterns.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
