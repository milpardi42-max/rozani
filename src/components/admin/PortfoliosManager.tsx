"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn, href, t } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import type { Artist, Category, DraftStatus, Portfolio, SiteContent } from "@/lib/types";
import type { Locale, Localized } from "@/lib/i18n/types";

/* ──────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────── */
type ViewMode = "grid" | "list";
type FilterTab = "all" | "published" | "draft" | "pending_review" | "featured";

const STATUS_LABELS: Record<DraftStatus, string> = {
  draft: "پیش‌نویس",
  pending_review: "در انتظار تأیید",
  published: "منتشرشده",
  rejected: "رد شده",
};
const STATUS_COLORS: Record<DraftStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600",
  pending_review: "bg-amber-50 text-amber-700 border border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-600 border border-red-200",
};

const SIZE_LABELS: Record<Portfolio["size"], string> = {
  hero: "هیرو (بزرگ)",
  tall: "بلند",
  wide: "عریض",
  square: "مربع",
};

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
function makeId() {
  return `portfolio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function makeSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function LocalizedField({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: Localized;
  onChange: (v: Localized) => void;
  textarea?: boolean;
}) {
  const C = textarea ? Textarea : Input;
  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-2">
      <Field label={`${label} (فارسی)`}>
        <C
          dir="rtl"
          value={value.fa}
          placeholder="فارسی…"
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, fa: e.target.value })
          }
        />
      </Field>
      <Field label={`${label} (انگلیسی)`}>
        <C
          dir="ltr"
          value={value.en}
          placeholder="English…"
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, en: e.target.value })
          }
        />
      </Field>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Edit Drawer
   ────────────────────────────────────────────────────────────── */
function PortfolioEditDrawer({
  portfolio,
  artists,
  categories,
  locale,
  onSave,
  onClose,
}: {
  portfolio: Portfolio | null;
  artists: Artist[];
  categories: Category[];
  locale: Locale;
  onSave: (p: Portfolio) => void;
  onClose: () => void;
}) {
  const isNew = portfolio === null;
  const [form, setForm] = useState<Portfolio>(
    portfolio ?? {
      id: makeId(),
      slug: "",
      title: { fa: "", en: "" },
      subtitle: { fa: "", en: "" },
      intro: { fa: "", en: "" },
      story: [],
      cover: "",
      gallery: [],
      artistId: null,
      patternIds: [],
      productIds: [],
      client: { fa: "", en: "" },
      location: { fa: "", en: "" },
      year: new Date().getFullYear(),
      scope: { fa: "", en: "" },
      categoryId: categories[0]?.id ?? "",
      featured: false,
      isProject: false,
      size: "square",
      draftStatus: "draft",
    },
  );

  const set = useCallback(<K extends keyof Portfolio>(key: K, val: Portfolio[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  }, []);

  const autoSlug = () => {
    if (!form.slug && form.title.en) set("slug", makeSlug(form.title.en));
  };

  const [galleryInput, setGalleryInput] = useState(form.gallery.join("\n"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* panel */}
      <div className="relative flex w-full max-w-2xl max-h-[92vh] flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border rounded-t-2xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <GalleryHorizontalEnd className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                {isNew ? "پورتفولیوی جدید" : "ویرایش پورتفولیو"}
              </h2>
              {!isNew && (
                <p className="text-xs text-muted">{t(portfolio.title, "fa")}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-background-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status & Flags bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-background-secondary p-4">
            <Field label="وضعیت انتشار" className="min-w-[160px]">
              <Select
                value={form.draftStatus ?? "draft"}
                onChange={(e) => set("draftStatus", e.target.value as DraftStatus)}
              >
                {(Object.entries(STATUS_LABELS) as [DraftStatus, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="اندازه کارت" className="min-w-[140px]">
              <Select
                value={form.size}
                onChange={(e) => set("size", e.target.value as Portfolio["size"])}
              >
                {(Object.entries(SIZE_LABELS) as [Portfolio["size"], string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <div className="flex items-center gap-4 pt-5">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="accent-accent"
                />
                <Star className="h-3.5 w-3.5 text-amber-500" />
                منتخب
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isProject}
                  onChange={(e) => set("isProject", e.target.checked)}
                  className="accent-accent"
                />
                <Layers className="h-3.5 w-3.5 text-accent" />
                پروژه
              </label>
            </div>
          </div>

          {/* Title & Slug */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">اطلاعات پایه</h3>
            <LocalizedField label="عنوان" value={form.title} onChange={(v) => set("title", v)} />
            <LocalizedField label="زیرعنوان" value={form.subtitle} onChange={(v) => set("subtitle", v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="اسلاگ (URL)">
                <Input
                  dir="ltr"
                  value={form.slug}
                  placeholder="my-portfolio-slug"
                  onBlur={autoSlug}
                  onChange={(e) => set("slug", e.target.value)}
                />
              </Field>
              <Field label="سال پروژه">
                <Input
                  type="number"
                  dir="ltr"
                  value={form.year}
                  onChange={(e) => set("year", parseInt(e.target.value) || new Date().getFullYear())}
                />
              </Field>
            </div>
          </div>

          {/* Intro */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">معرفی پروژه</h3>
            <LocalizedField label="متن معرفی" value={form.intro} onChange={(v) => set("intro", v)} textarea />
          </div>

          {/* Cover & Gallery */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">تصاویر</h3>
            <Field label="تصویر کاور (آدرس URL)">
              <Input
                dir="ltr"
                value={form.cover}
                placeholder="/images/portfolios/my-cover.jpg"
                onChange={(e) => set("cover", e.target.value)}
              />
            </Field>
            {form.cover && (
              <div className="mt-2 mb-3 overflow-hidden rounded-lg bg-background-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.cover}
                  alt=""
                  className="h-40 w-full object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
              </div>
            )}
            <Field label="گالری (هر آدرس در یک خط)">
              <Textarea
                dir="ltr"
                rows={3}
                value={galleryInput}
                placeholder={"/images/portfolios/img1.jpg\n/images/portfolios/img2.jpg"}
                onChange={(e) => {
                  setGalleryInput(e.target.value);
                  set("gallery", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean));
                }}
              />
            </Field>
          </div>

          {/* Meta: Client, Location, Scope */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">جزئیات پروژه</h3>
            <LocalizedField label="کارفرما / مشتری" value={form.client} onChange={(v) => set("client", v)} />
            <LocalizedField label="موقعیت مکانی" value={form.location} onChange={(v) => set("location", v)} />
            <LocalizedField label="محدوده کار" value={form.scope} onChange={(v) => set("scope", v)} />
          </div>

          {/* Category & Artist */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">دسته‌بندی و هنرمند</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="دسته‌بندی">
                <Select
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">— بدون دسته‌بندی —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{t(c.name, "fa")}</option>
                  ))}
                </Select>
              </Field>
              <Field label="هنرمند / طراح">
                <Select
                  value={form.artistId ?? ""}
                  onChange={(e) => set("artistId", e.target.value || null)}
                >
                  <option value="">— بدون هنرمند —</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{t(a.name, "fa")}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-background-secondary rounded-b-2xl px-6 py-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            انصراف
          </Button>
          <div className="flex gap-2">
            {!isNew && (
              <Link
                href={href(locale, `/portfolio/${form.slug}`)}
                target="_blank"
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-foreground-secondary hover:bg-white hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                پیش‌نمایش
              </Link>
            )}
            <Button
              size="sm"
              onClick={() => onSave(form)}
              disabled={!form.title.fa || !form.slug}
            >
              {isNew ? "ایجاد پورتفولیو" : "ذخیره تغییرات"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Portfolio Card (Grid view)
   ────────────────────────────────────────────────────────────── */
function PortfolioCardItem({
  p,
  artist,
  category,
  locale,
  onEdit,
  onDelete,
  onToggleFeatured,
  onToggleStatus,
}: {
  p: Portfolio;
  artist: Artist | undefined;
  category: Category | undefined;
  locale: Locale;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onToggleStatus: (s: DraftStatus) => void;
}) {
  const status = p.draftStatus ?? "published";
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Cover */}
      <div className="relative aspect-[16/9] bg-background-secondary overflow-hidden">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.cover}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted/30" />
          </div>
        )}
        {/* Overlay actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white"
            title="ویرایش"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <Link
            href={href(locale, `/portfolio/${p.slug}`)}
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-foreground hover:bg-white"
            title="مشاهده در سایت"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100"
            title="حذف"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLORS[status])}>
            {STATUS_LABELS[status]}
          </span>
        </div>
        {/* Featured star */}
        <button
          onClick={onToggleFeatured}
          className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 hover:bg-white"
          title={p.featured ? "حذف از منتخب" : "افزودن به منتخب"}
        >
          <Star
            className={cn("h-3.5 w-3.5", p.featured ? "fill-amber-400 text-amber-400" : "text-muted")}
          />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
            {t(p.title, "fa") || <span className="text-muted">بدون عنوان</span>}
          </h3>
          <span className="shrink-0 rounded-md bg-background-secondary px-2 py-0.5 text-[10px] font-medium text-muted">
            {p.year}
          </span>
        </div>
        {t(p.subtitle, "fa") && (
          <p className="line-clamp-1 text-xs text-muted">{t(p.subtitle, "fa")}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/60">
          {category && (
            <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[10px] text-foreground-secondary">
              {t(category.name, "fa")}
            </span>
          )}
          {artist && (
            <span className="flex items-center gap-1 rounded-full bg-background-secondary px-2 py-0.5 text-[10px] text-foreground-secondary">
              <User className="h-3 w-3" />
              {t(artist.name, "fa")}
            </span>
          )}
          {p.isProject && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              پروژه
            </span>
          )}
          {t(p.location, "fa") && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted">
              <MapPin className="h-3 w-3" />
              {t(p.location, "fa")}
            </span>
          )}
        </div>

        {/* Quick status toggle */}
        <div className="flex gap-1.5 mt-1">
          {(["published", "draft"] as DraftStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => onToggleStatus(s)}
              className={cn(
                "flex-1 rounded-md py-1 text-[10px] font-medium transition-colors",
                status === s
                  ? s === "published"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-zinc-100 text-zinc-600"
                  : "bg-background-secondary text-muted hover:bg-border",
              )}
            >
              {s === "published" ? "منتشر" : "پیش‌نویس"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Portfolio Row (List view)
   ────────────────────────────────────────────────────────────── */
function PortfolioRowItem({
  p,
  artist,
  category,
  locale,
  onEdit,
  onDelete,
  onToggleFeatured,
}: {
  p: Portfolio;
  artist: Artist | undefined;
  category: Category | undefined;
  locale: Locale;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}) {
  const status = p.draftStatus ?? "published";
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 shadow-sm hover:bg-background-secondary/50">
      {/* Thumb */}
      <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-background-secondary">
        {p.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover} alt="" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-4 w-4 text-muted/30" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{t(p.title, "fa")}</span>
          <span className="shrink-0 rounded-full bg-background-secondary px-1.5 py-0.5 text-[10px] text-muted">
            {p.year}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted">
          {category && <span>{t(category.name, "fa")}</span>}
          {artist && (
            <span className="flex items-center gap-0.5">
              <User className="h-3 w-3" />
              {t(artist.name, "fa")}
            </span>
          )}
          {t(p.location, "fa") && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {t(p.location, "fa")}
            </span>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", STATUS_COLORS[status])}>
          {STATUS_LABELS[status]}
        </span>
        {p.isProject && (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
            پروژه
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onToggleFeatured}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background-secondary"
          title={p.featured ? "حذف از منتخب" : "افزودن به منتخب"}
        >
          <Star className={cn("h-3.5 w-3.5", p.featured ? "fill-amber-400 text-amber-400" : "")} />
        </button>
        <Link
          href={href(locale, `/portfolio/${p.slug}`)}
          target="_blank"
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background-secondary"
          title="مشاهده در سایت"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background-secondary"
          title="ویرایش"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 hover:bg-red-50"
          title="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */
export function PortfoliosManager({
  data,
  update,
  locale,
}: {
  data: SiteContent;
  update: (patch: Partial<SiteContent>) => void;
  locale: Locale;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [editTarget, setEditTarget] = useState<Portfolio | null | "new">(null);

  const portfolios = data.portfolios;
  const artists = data.artists;
  const categories = data.categories;

  /* ── Derived stats ── */
  const stats = {
    total: portfolios.length,
    published: portfolios.filter((p) => (p.draftStatus ?? "published") === "published").length,
    draft: portfolios.filter((p) => p.draftStatus === "draft").length,
    pending: portfolios.filter((p) => p.draftStatus === "pending_review").length,
    featured: portfolios.filter((p) => p.featured).length,
  };

  /* ── Filter & Search ── */
  const filtered = portfolios.filter((p) => {
    const matchTab =
      filterTab === "all" ||
      (filterTab === "published" && (p.draftStatus ?? "published") === "published") ||
      (filterTab === "draft" && p.draftStatus === "draft") ||
      (filterTab === "pending_review" && p.draftStatus === "pending_review") ||
      (filterTab === "featured" && p.featured);

    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t(p.title, "fa").toLowerCase().includes(q) ||
      t(p.title, "en").toLowerCase().includes(q) ||
      t(p.client, "fa").toLowerCase().includes(q) ||
      t(p.location, "fa").toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q);

    return matchTab && matchSearch;
  });

  /* ── Mutations ── */
  const savePortfolio = useCallback(
    (p: Portfolio) => {
      const exists = portfolios.some((x) => x.id === p.id);
      const next = exists
        ? portfolios.map((x) => (x.id === p.id ? p : x))
        : [...portfolios, p];
      update({ portfolios: next });
      setEditTarget(null);
    },
    [portfolios, update],
  );

  const deletePortfolio = useCallback(
    (id: string) => {
      if (!confirm("آیا از حذف این پورتفولیو مطمئن هستید؟")) return;
      update({ portfolios: portfolios.filter((p) => p.id !== id) });
    },
    [portfolios, update],
  );

  const toggleFeatured = useCallback(
    (id: string) => {
      update({
        portfolios: portfolios.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p)),
      });
    },
    [portfolios, update],
  );

  const setStatus = useCallback(
    (id: string, status: DraftStatus) => {
      update({
        portfolios: portfolios.map((p) => (p.id === id ? { ...p, draftStatus: status } : p)),
      });
    },
    [portfolios, update],
  );

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">پورتفولیوها و نمونه‌کارها</h1>
          <p className="mt-0.5 text-xs text-muted">
            معرفی پروژه‌ها، نمونه‌کارها و آثار اجراشده در سایت
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setEditTarget("new")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          پورتفولیوی جدید
        </Button>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "کل پورتفولیوها", value: stats.total, icon: <GalleryHorizontalEnd className="h-4 w-4" />, color: "text-accent" },
          { label: "منتشرشده", value: stats.published, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-600" },
          { label: "پیش‌نویس", value: stats.draft, icon: <Edit3 className="h-4 w-4" />, color: "text-zinc-500" },
          { label: "در انتظار تأیید", value: stats.pending, icon: <Clock className="h-4 w-4" />, color: "text-amber-600" },
          { label: "منتخب", value: stats.featured, icon: <Star className="h-4 w-4" />, color: "text-amber-500" },
        ].map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <div className={cn("shrink-0", s.color)}>{s.icon}</div>
            <div>
              <p className="text-xl font-bold leading-none">{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters & Search ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-white p-1">
          {(
            [
              ["all", "همه"],
              ["published", "منتشرشده"],
              ["draft", "پیش‌نویس"],
              ["pending_review", "در انتظار"],
              ["featured", "منتخب"],
            ] as [FilterTab, string][]
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filterTab === tab
                  ? "bg-[#1e2230] text-white"
                  : "text-foreground-secondary hover:bg-background-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در پورتفولیوها…"
              className="h-8 rounded-lg border border-border bg-white pr-8 pl-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border bg-white p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "grid" ? "bg-[#1e2230] text-white" : "text-muted hover:bg-background-secondary",
              )}
              title="نمای شبکه"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                viewMode === "list" ? "bg-[#1e2230] text-white" : "text-muted hover:bg-background-secondary",
              )}
              title="نمای لیست"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white py-16 text-center">
          <GalleryHorizontalEnd className="h-10 w-10 text-muted/30" />
          <p className="text-sm text-muted">
            {search ? "نتیجه‌ای یافت نشد" : "هنوز پورتفولیویی اضافه نشده است"}
          </p>
          <Button size="sm" variant="outline" onClick={() => setEditTarget("new")}>
            <Plus className="h-4 w-4" />
            ایجاد اولین پورتفولیو
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PortfolioCardItem
              key={p.id}
              p={p}
              artist={artists.find((a) => a.id === p.artistId)}
              category={categories.find((c) => c.id === p.categoryId)}
              locale={locale}
              onEdit={() => setEditTarget(p)}
              onDelete={() => deletePortfolio(p.id)}
              onToggleFeatured={() => toggleFeatured(p.id)}
              onToggleStatus={(s) => setStatus(p.id, s)}
            />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <PortfolioRowItem
              key={p.id}
              p={p}
              artist={artists.find((a) => a.id === p.artistId)}
              category={categories.find((c) => c.id === p.categoryId)}
              locale={locale}
              onEdit={() => setEditTarget(p)}
              onDelete={() => deletePortfolio(p.id)}
              onToggleFeatured={() => toggleFeatured(p.id)}
            />
          ))}
        </ul>
      )}

      {/* ── Edit Drawer ── */}
      {editTarget !== null && (
        <PortfolioEditDrawer
          portfolio={editTarget === "new" ? null : editTarget}
          artists={artists}
          categories={categories}
          locale={locale}
          onSave={savePortfolio}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
