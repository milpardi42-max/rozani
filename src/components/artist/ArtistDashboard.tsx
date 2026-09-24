"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  ExternalLink,
  ImageIcon,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  Trash2,
  TrendingUp,
  TrendingDown,
  Upload,
  User,
  X,
  LayoutGrid,
  Heart,
  DollarSign,
  Layers,
  ChevronRight,
} from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ErrorState, EmptyState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { href, formatPrice } from "@/lib/utils";
import type { Artist, Category, Colorway, Pattern, Product, Space } from "@/lib/types";

type Tab = "patterns" | "products" | "profile" | "stats";

interface ArtistData {
  patterns: Pattern[];
  products: Product[];
  categories: Category[];
  spaces: Space[];
}

type FormMode = "idle" | "new-pattern" | "new-product" | "edit-pattern" | "edit-product";

/* ------------------------------------------------------------------ */
/* Main Dashboard                                                        */
/* ------------------------------------------------------------------ */
export function ArtistDashboard() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const fa = locale === "fa";

  const [data, setData] = useState<ArtistData | null>(null);
  const [tab, setTab] = useState<Tab>("patterns");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("idle");
  const [editTarget, setEditTarget] = useState<Pattern | Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/artist/patterns", { ...SESSION_FETCH });
      if (!r.ok) throw new Error();
      const d = await r.json() as ArtistData & { ok: boolean };
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const deleteItem = async (id: string, type: "pattern" | "product") => {
    if (!confirm(fa ? "حذف شود؟" : "Delete this item?")) return;
    await fetch(`/api/artist/patterns?id=${id}&type=${type}`, { ...SESSION_FETCH, method: "DELETE" });
    void load();
  };

  const handleFormSaved = () => {
    setFormMode("idle");
    setEditTarget(null);
    void load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={fa ? "خطا در بارگذاری اطلاعات." : "Could not load your data."} onRetry={load} />;
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "patterns", label: fa ? `الگوها (${data?.patterns.length ?? 0})` : `Patterns (${data?.patterns.length ?? 0})`, icon: <BarChart3 className="h-4 w-4" /> },
    { id: "products", label: fa ? `محصولات (${data?.products.length ?? 0})` : `Products (${data?.products.length ?? 0})`, icon: <PackagePlus className="h-4 w-4" /> },
    { id: "profile", label: fa ? "پروفایل" : "Profile", icon: <User className="h-4 w-4" /> },
    { id: "stats", label: fa ? "آمار" : "Stats", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background-secondary pt-[calc(var(--announce-h,0px)+var(--header-h))]">
      {/* Top bar */}
      <div className="border-b border-border bg-surface">
        <div className="container-x flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-label text-accent">{fa ? "پورتفولیو و پروژه‌ها" : "Portfolio & projects"}</p>
            <h1 className="mt-1 font-display text-h2">{fa ? `سلام، ${user?.name}` : `Hello, ${user?.name}`}</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditTarget(null); setFormMode("new-pattern"); }}
            >
              <Plus className="h-4 w-4" />
              {fa ? "الگوی جدید" : "New pattern"}
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditTarget(null); setFormMode("new-product"); }}
            >
              <Plus className="h-4 w-4" />
              {fa ? "محصول جدید" : "New product"}
            </Button>
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="container-x pb-24">
        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">

          {/* ---- Sidebar ---- */}
          <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
            <nav className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                {fa ? "بخش‌ها" : "Sections"}
              </p>
              <ul className="pb-2">
                {tabs.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                        tab === t.id
                          ? "bg-accent/8 font-semibold text-accent"
                          : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {t.icon}
                        {t.label}
                      </span>
                      <ChevronRight className={`h-3.5 w-3.5 opacity-40 ${fa ? "rotate-180" : ""}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Mini stats in sidebar */}
            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{fa ? "خلاصه" : "Summary"}</p>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-foreground-secondary">
                      <LayoutGrid className="h-3.5 w-3.5" />
                      {fa ? "الگوها" : "Patterns"}
                    </span>
                    <span className="text-sm font-semibold">{data?.patterns.length ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm text-foreground-secondary">
                      <PackagePlus className="h-3.5 w-3.5" />
                      {fa ? "محصولات" : "Products"}
                    </span>
                    <span className="text-sm font-semibold">{data?.products.length ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ---- Main content ---- */}
          <main>
            {tab === "patterns" && (
              <ItemGrid
                items={data?.patterns ?? []}
                type="pattern"
                fa={fa}
                locale={locale}
                onEdit={(item) => { setEditTarget(item); setFormMode("edit-pattern"); }}
                onDelete={(id) => deleteItem(id, "pattern")}
              />
            )}
            {tab === "products" && (
              <ItemGrid
                items={data?.products ?? []}
                type="product"
                fa={fa}
                locale={locale}
                onEdit={(item) => { setEditTarget(item); setFormMode("edit-product"); }}
                onDelete={(id) => deleteItem(id, "product")}
              />
            )}
            {tab === "profile" && <ProfileEditor fa={fa} />}
            {tab === "stats" && <StatsPanel data={data} fa={fa} locale={locale} />}
          </main>
        </div>
      </div>

      {/* Slide-in Form Panel */}
      {formMode !== "idle" && (
        <FormPanel
          mode={formMode}
          initial={editTarget}
          fa={fa}
          categories={data?.categories ?? []}
          spaces={data?.spaces ?? []}
          onSaved={handleFormSaved}
          onClose={() => { setFormMode("idle"); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item Grid                                                             */
/* ------------------------------------------------------------------ */
function ItemGrid({
  items,
  type,
  fa,
  locale,
  onEdit,
  onDelete,
}: {
  items: (Pattern | Product)[];
  type: "pattern" | "product";
  fa: boolean;
  locale: string;
  onEdit: (item: Pattern | Product) => void;
  onDelete: (id: string) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title={fa ? `هنوز ${type === "pattern" ? "الگویی" : "محصولی"} ندارید.` : `No ${type}s yet.`}
        description={fa ? "اولین آیتم خود را اضافه کنید." : "Add your first item."}
      />
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const image = "image" in item ? item.image : (("colors" in item && item.colors[0]?.image) || "/images/collections/s01.jpg");
        const title = typeof item.title === "object" ? (locale === "fa" ? item.title.fa : item.title.en) : item.title;
        const slug = item.slug;
        const viewPath = type === "pattern" ? `/patterns/${slug}` : `/shop/${slug}`;

        return (
          <li key={item.id} className="group relative overflow-hidden rounded-lg border border-border bg-surface">
            <div className="relative aspect-square overflow-hidden">
              <Image src={image} alt="" fill sizes="280px" className="object-cover transition-transform group-hover:scale-105" />
              {item.isNew && (
                <span className="absolute left-2 top-2">
                  <Badge tone="accent">{fa ? "جدید" : "New"}</Badge>
                </span>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{title}</p>
              <p className="mt-0.5 text-caption text-foreground-secondary" dir="ltr">{item.sku}</p>
              {(() => {
                const dots =
                  type === "pattern" && "colorways" in item && item.colorways?.length
                    ? item.colorways
                    : type === "product" && "colors" in item && item.colors?.length
                      ? item.colors.map((c) => ({ id: c.id, name: c.name, hex: c.hex, image: c.image }))
                      : [];
                if (!dots.length) return null;
                return (
                  <div className="mt-2 flex items-center gap-1.5">
                    {dots.slice(0, 6).map((d) => (
                      <span key={d.id} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: d.hex }} title={typeof d.name === "object" ? d.name.en : ""} />
                    ))}
                    {dots.length > 6 && <span className="text-[10px] text-muted">+{dots.length - 6}</span>}
                  </div>
                );
              })()}
              <p className="mt-1 text-sm font-semibold tabular">
                {formatPrice(item.price, locale as "fa" | "en")}
              </p>
              <div className="mt-3 flex gap-1.5">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {fa ? "ویرایش" : "Edit"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  href={href(locale as "fa" | "en", viewPath)}
                  external
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-error/10 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Stats Panel                                                           */
/* ------------------------------------------------------------------ */
function StatsPanel({ data, fa, locale }: { data: ArtistData | null; fa: boolean; locale: string }) {
  const totalPatterns = data?.patterns.length ?? 0;
  const totalProducts = data?.products.length ?? 0;
  const totalLikes = data?.patterns.reduce((n, p) => n + (p.likes ?? 0), 0) ?? 0;
  const avgPrice =
    totalPatterns > 0
      ? (data?.patterns.reduce((n, p) => n + p.price[locale === "fa" ? "fa" : "en"], 0) ?? 0) / totalPatterns
      : 0;

  const n = (v: number) => locale === "fa" ? v.toLocaleString("fa-IR") : v.toLocaleString("en-US");

  /* Derived: top pattern by likes */
  const topPattern = data?.patterns.reduce<Pattern | null>((top, p) =>
    (p.likes ?? 0) > (top?.likes ?? 0) ? p : top, null);
  const topTitle = topPattern
    ? (locale === "fa" ? topPattern.title?.fa : topPattern.title?.en) ?? "—"
    : "—";

  /* Price distribution */
  const prices = (data?.patterns ?? []).map((p) => p.price[locale === "fa" ? "fa" : "en"]);
  const maxPrice = prices.length ? Math.max(...prices) : 1;

  /* Category breakdown */
  const totalItems = totalPatterns + totalProducts;
  const patternPct = totalItems ? Math.round((totalPatterns / totalItems) * 100) : 0;
  const productPct = 100 - patternPct;

  const kpiCards = [
    {
      label: fa ? "تعداد الگوها" : "Total patterns",
      value: n(totalPatterns),
      icon: <LayoutGrid className="h-5 w-5" />,
      color: "text-accent",
      bg: "bg-accent/10",
      trend: null,
    },
    {
      label: fa ? "تعداد محصولات" : "Total products",
      value: n(totalProducts),
      icon: <PackagePlus className="h-5 w-5" />,
      color: "text-blue",
      bg: "bg-blue/10",
      trend: null,
    },
    {
      label: fa ? "مجموع لایک‌ها" : "Total likes",
      value: n(totalLikes),
      icon: <Heart className="h-5 w-5" />,
      color: "text-error",
      bg: "bg-error/10",
      trend: totalLikes > 0 ? "up" : null,
    },
    {
      label: fa ? "میانگین قیمت الگو" : "Avg pattern price",
      value: locale === "fa" ? `${avgPrice.toLocaleString("fa-IR")} ت` : `$${avgPrice.toFixed(0)}`,
      icon: <DollarSign className="h-5 w-5" />,
      color: "text-success",
      bg: "bg-success/10",
      trend: avgPrice > 0 ? "up" : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <p className="mt-4 font-display text-h2 tabular">{card.value}</p>
            <p className="mt-1 text-caption text-foreground-secondary">{card.label}</p>
            {card.trend && (
              <span className={`absolute end-4 top-4 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.trend === "up" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                {card.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {card.trend === "up" ? (fa ? "رشد" : "Up") : (fa ? "کاهش" : "Down")}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Middle row: breakdown + top pattern */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Content breakdown */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted" />
            <p className="font-semibold">{fa ? "توزیع محتوا" : "Content breakdown"}</p>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-foreground-secondary">
                  <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                  {fa ? "الگوها" : "Patterns"}
                </span>
                <span className="font-semibold tabular">{patternPct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background-secondary">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-700"
                  style={{ width: `${patternPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-foreground-secondary">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue" />
                  {fa ? "محصولات" : "Products"}
                </span>
                <span className="font-semibold tabular">{productPct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background-secondary">
                <div
                  className="h-full rounded-full bg-blue transition-all duration-700"
                  style={{ width: `${productPct}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-5 text-caption text-muted">
            {fa ? `جمع کل: ${n(totalItems)} آیتم` : `Total: ${n(totalItems)} items`}
          </p>
        </div>

        {/* Top pattern */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-error" />
            <p className="font-semibold">{fa ? "محبوب‌ترین الگو" : "Most liked pattern"}</p>
          </div>
          {topPattern ? (
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border">
                <Image
                  src={topPattern.image ?? "/images/collections/s01.jpg"}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{topTitle}</p>
                <p className="text-caption text-foreground-secondary" dir="ltr">{topPattern.sku}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 fill-error text-error" />
                  <span className="text-sm font-semibold text-error tabular">{n(topPattern.likes ?? 0)}</span>
                  <span className="text-caption text-muted">{fa ? "لایک" : "likes"}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-foreground-secondary">{fa ? "هنوز الگویی اضافه نکرده‌اید." : "No patterns yet."}</p>
          )}
        </div>
      </div>

      {/* Price distribution bar chart */}
      {prices.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted" />
            <p className="font-semibold">{fa ? "توزیع قیمت الگوها" : "Pattern price distribution"}</p>
          </div>
          <div className="mt-5 flex items-end gap-1.5 h-20">
            {(data?.patterns ?? []).map((p, i) => {
              const price = p.price[locale === "fa" ? "fa" : "en"];
              const heightPct = maxPrice > 0 ? Math.round((price / maxPrice) * 100) : 4;
              const title = locale === "fa" ? p.title?.fa : p.title?.en;
              return (
                <div
                  key={p.id}
                  title={`${title}: ${locale === "fa" ? `${price.toLocaleString("fa-IR")} ت` : `$${price}`}`}
                  className="group relative flex-1 min-w-0 cursor-default"
                >
                  <div
                    className="w-full rounded-t-sm bg-accent/40 transition-all group-hover:bg-accent"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <div className="pointer-events-none absolute bottom-full mb-1 start-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background group-hover:block">
                    {locale === "fa" ? `${price.toLocaleString("fa-IR")} ت` : `$${price}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted">
            <span>{locale === "fa" ? `کم‌ترین: ${Math.min(...prices).toLocaleString("fa-IR")} ت` : `Min: $${Math.min(...prices)}`}</span>
            <span>{locale === "fa" ? `بیش‌ترین: ${maxPrice.toLocaleString("fa-IR")} ت` : `Max: $${maxPrice}`}</span>
          </div>
        </div>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/* ImageUpload — real drag-and-drop / click-to-upload component        */
/* ------------------------------------------------------------------ */
function ImageUpload({
  name,
  value,
  onChange,
  fa,
  label,
}: {
  name: string;
  value: string;
  onChange: (url: string) => void;
  fa: boolean;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [drag, setDrag] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    setUploadErr("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/artist/upload", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const d = (await r.json()) as { ok: boolean; url?: string; error?: string };
      if (!r.ok || !d.ok || !d.url) {
        const errMap: Record<string, { fa: string; en: string }> = {
          unsupported_type: { fa: "فرمت تصویر پشتیبانی نمی‌شود.", en: "Unsupported image format." },
          file_too_large: { fa: "حجم فایل بیش از ۸ مگابایت است.", en: "File exceeds the 8 MB limit." },
          unauthorized: { fa: "لطفاً ابتدا وارد حساب خود شوید.", en: "Please log in first." },
          too_many_attempts: { fa: "تعداد آپلود زیاد است. کمی صبر کنید.", en: "Too many uploads. Please wait a moment." },
        };
        const msg = errMap[d.error ?? ""] ?? { fa: "آپلود ناموفق بود.", en: "Upload failed." };
        setUploadErr(fa ? msg.fa : msg.en);
      } else {
        onChange(d.url);
      }
    } catch {
      setUploadErr(fa ? "خطای شبکه." : "Network error.");
    } finally {
      setUploading(false);
    }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void upload(file);
    // reset so the same file can be re-selected
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      {/* Drop zone */}
      <div
        className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-colors ${
          drag
            ? "border-accent bg-accent/8"
            : "border-border hover:border-accent/60 hover:bg-background-secondary"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        {/* Preview or placeholder */}
        {value ? (
          <div className="relative h-24 w-full overflow-hidden rounded-lg border border-border">
            <Image
              src={value}
              alt=""
              fill
              sizes="400px"
              className="object-contain"
              onError={() => onChange("")}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2 text-muted">
            {uploading ? (
              <Loader2 className="h-7 w-7 animate-spin text-accent" />
            ) : (
              <Upload className="h-7 w-7 opacity-50" />
            )}
            <p className="text-center text-xs">
              {uploading
                ? (fa ? "در حال آپلود…" : "Uploading…")
                : (fa ? "کلیک کنید یا فایل را اینجا رها کنید" : "Click or drop image here")}
            </p>
            <p className="text-[10px] text-muted">
              {fa ? "JPG · PNG · WebP · GIF — حداکثر ۸ مگابایت" : "JPG · PNG · WebP · GIF — max 8 MB"}
            </p>
          </div>
        )}

        {/* Invisible file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="sr-only"
          onChange={pick}
          disabled={uploading}
        />
        {/* Hidden named input carries the URL for FormData */}
        <input type="hidden" name={name} value={value} />
      </div>

      {uploadErr && (
        <p className="rounded-lg bg-error/10 px-3 py-1.5 text-xs text-error">{uploadErr}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colourway editor (Spoonflower-style multi-colour upload)            */
/* ------------------------------------------------------------------ */
function ColorwayEditor({
  fa,
  initial,
}: {
  fa: boolean;
  initial?: Colorway[] | { id: string; name: { fa: string; en: string }; hex: string; image: string; stock?: number }[];
}) {
  type Row = { nameFa: string; nameEn: string; hex: string; image: string; stock: string };
  const seed: Row[] =
    initial && initial.length
      ? initial.map((c) => ({
          nameFa: c.name?.fa ?? "",
          nameEn: c.name?.en ?? "",
          hex: c.hex ?? "#888888",
          image: ("image" in c ? c.image : "") || "",
          stock: String(("stock" in c ? (c as { stock?: number }).stock : 12) ?? 12),
        }))
      : [{ nameFa: fa ? "اصلی" : "Default", nameEn: "Default", hex: "#8fa08e", image: "", stock: "12" }];

  const [rows, setRows] = useState<Row[]>(seed);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const add = () =>
    setRows((r) => [...r, { nameFa: "", nameEn: "", hex: "#c99a92", image: "", stock: "12" }]);

  const remove = (i: number) => setRows((r) => (r.length <= 1 ? r : r.filter((_, idx) => idx !== i)));

  return (
    <div className="rounded-lg border border-border bg-background-secondary/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{fa ? "رنگ‌بندی‌ها (Colorways)" : "Colourways"}</p>
          <p className="mt-0.5 text-caption text-foreground-secondary">
            {fa
              ? "مثل Spoonflower: هر رنگ یک پیش‌نمایش جدا دارد و روی کارت به‌صورت دایره نمایش داده می‌شود."
              : "Spoonflower-style: each colour has its own preview and shows as a circle on cards."}
          </p>
        </div>
        <button type="button" onClick={add} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-caption font-medium hover:border-foreground">
          <Plus className="h-3.5 w-3.5" />
          {fa ? "افزودن رنگ" : "Add colour"}
        </button>
      </div>
      <input type="hidden" name="colorway_count" value={rows.length} />
      <ul className="mt-4 space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="rounded-md border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full ring-1 ring-border" style={{ background: row.hex || "#ccc" }} />
                <span className="text-caption text-muted">{fa ? `رنگ ${i + 1}` : `Colour ${i + 1}`}{i === 0 ? (fa ? " · پیش‌فرض" : " · default") : ""}</span>
              </div>
              {rows.length > 1 && (
                <button type="button" onClick={() => remove(i)} className="text-caption text-error hover:underline">
                  {fa ? "حذف" : "Remove"}
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input name={`cw_name_fa_${i}`} dir="rtl" placeholder={fa ? "نام فارسی" : "Name (fa)"} value={row.nameFa} onChange={(e) => update(i, { nameFa: e.target.value })} />
              <Input name={`cw_name_en_${i}`} dir="ltr" placeholder="Name (en)" value={row.nameEn} onChange={(e) => update(i, { nameEn: e.target.value })} />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="hex"
                  value={/^#[0-9a-fA-F]{6}$/.test(row.hex) ? row.hex : "#888888"}
                  onChange={(e) => update(i, { hex: e.target.value })}
                  className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <Input name={`cw_hex_${i}`} dir="ltr" placeholder="#8fa08e" value={row.hex} onChange={(e) => update(i, { hex: e.target.value })} className="flex-1" />
              </div>
              <div>
                <ImageUpload
                  name={`cw_image_${i}`}
                  value={row.image}
                  onChange={(url) => update(i, { image: url })}
                  fa={fa}
                  label={fa ? "تصویر رنگ" : "Colour image"}
                />
              </div>
              <Input name={`cw_stock_${i}`} type="number" min={0} dir="ltr" placeholder="Stock" value={row.stock} onChange={(e) => update(i, { stock: e.target.value })} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form Panel (slide-in overlay) — redesigned with sections            */
/* ------------------------------------------------------------------ */
function FormPanel({
  mode,
  initial,
  fa,
  categories,
  spaces,
  onSaved,
  onClose,
}: {
  mode: FormMode;
  initial: Pattern | Product | null;
  fa: boolean;
  categories: Category[];
  spaces: Space[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const isProduct = mode === "new-product" || mode === "edit-product";
  const isEdit = mode === "edit-pattern" || mode === "edit-product";

  const pat = !isProduct && initial ? (initial as Pattern) : null;
  const prod = isProduct && initial ? (initial as Product) : null;

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /* ---- Pricing state (live discount calc) ---- */
  const [priceFaVal, setPriceFaVal] = useState(initial?.price?.fa ?? 0);
  const [priceEnVal, setPriceEnVal] = useState(initial?.price?.en ?? 0);

  // Detect existing discount from compareAt vs price
  const existingDiscount = (() => {
    if (!prod?.compareAt) return 0;
    const base = prod.compareAt.fa;
    const sale = prod.price.fa;
    if (base <= 0 || sale <= 0) return 0;
    return Math.round((1 - sale / base) * 100);
  })();
  const [discountPct, setDiscountPct] = useState<number>(existingDiscount);

  // Derived compare-at values (original price before discount)
  const compareAtFa = discountPct > 0 ? Math.round(priceFaVal / (1 - discountPct / 100)) : 0;
  const compareAtEn = discountPct > 0 ? Math.round((priceEnVal / (1 - discountPct / 100)) * 100) / 100 : 0;

  /* ---- Tag input state ---- */
  const [tags, setTags] = useState<string[]>(pat?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  /* ---- Space selection (pattern only) ---- */
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(pat?.spaceIds ?? []);
  const toggleSpace = (id: string) =>
    setSelectedSpaces((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  /* ---- Sizes (product only) — simple text chips ---- */
  const [sizes, setSizes] = useState<string[]>(
    prod?.sizes?.map((s) => (fa ? s.fa : s.en)) ?? []
  );
  const [sizeInput, setSizeInput] = useState("");
  const addSize = (raw: string) => {
    const s = raw.trim();
    if (s && !sizes.includes(s)) setSizes((p) => [...p, s]);
    setSizeInput("");
  };

  /* ---- Modal ref & keyboard close ---- */
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* ---- Image upload state ---- */
  const [prodImageVal, setProdImageVal] = useState(
    isProduct ? ((initial as Product | null)?.colors?.[0]?.image ?? "") : ""
  );
  const [patImageVal, setPatImageVal] = useState(
    !isProduct ? ((initial as Pattern | null)?.image ?? "") : ""
  );

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);

    const priceFa = Number(fd.get("price_fa")) || 0;
    const priceEn = Number(fd.get("price_en")) || 0;
    const categoryId = String(fd.get("categoryId") || categories[0]?.id || "");
    // compareAt is derived from discount state, not from fd
    const compareFa = discountPct > 0 ? Math.round(priceFa / (1 - discountPct / 100)) : 0;
    const compareEn = discountPct > 0 ? Math.round((priceEn / (1 - discountPct / 100)) * 100) / 100 : 0;

    // Parse colourways from dynamic form rows
    const colorways: Colorway[] = [];
    if (!isProduct) {
      const count = Number(fd.get("colorway_count") || 0);
      for (let i = 0; i < count; i++) {
        const hex = String(fd.get(`cw_hex_${i}`) || "").trim();
        const img = String(fd.get(`cw_image_${i}`) || "").trim();
        const nameFa = String(fd.get(`cw_name_fa_${i}`) || "").trim();
        const nameEn = String(fd.get(`cw_name_en_${i}`) || "").trim();
        if (!hex && !img) continue;
        colorways.push({
          id: `cw-${i}-${Date.now().toString(36)}`,
          name: { fa: nameFa || `رنگ ${i + 1}`, en: nameEn || `Colour ${i + 1}` },
          hex: hex || "#888888",
          image: img || String(fd.get("image") || "/images/collections/s01.jpg"),
          isDefault: i === 0,
        });
      }
    }

    const payload: Record<string, unknown> = {
      _type: isProduct ? "product" : "pattern",
      ...(isEdit && initial ? { id: initial.id } : {}),
      title: { fa: String(fd.get("title_fa") || ""), en: String(fd.get("title_en") || "") },
      description: { fa: String(fd.get("desc_fa") || ""), en: String(fd.get("desc_en") || "") },
      price: { fa: priceFa, en: priceEn },
      // compareAt is always set when a discount is selected (for both pattern and product)
      ...(compareFa > 0 || compareEn > 0 ? { compareAt: { fa: compareFa, en: compareEn } } : { compareAt: null }),
      slug: String(fd.get("slug") || "").toLowerCase().replace(/\s+/g, "-"),
      sku: String(fd.get("sku") || ""),
      categoryId,
      ...(!isProduct ? {
        image: colorways[0]?.image || String(fd.get("image") || "/images/collections/s01.jpg"),
        colorways,
        palette: colorways.map((c) => c.hex),
        spaceIds: selectedSpaces,
        tags,
        specs: {
          repeat: { fa: String(fd.get("repeat_fa") || "تکرار کامل"), en: String(fd.get("repeat_en") || "Full repeat") },
          dpi: String(fd.get("dpi") || "300 DPI"),
          formats: String(fd.get("formats") || "AI · PDF · TIFF"),
          colors: colorways.length || Number(fd.get("color_count") || 1),
          scale: { fa: String(fd.get("scale_fa") || "متوسط"), en: String(fd.get("scale_en") || "Medium") },
        },
      } : {}),
      ...(isProduct ? {
        materials: { fa: String(fd.get("mat_fa") || ""), en: String(fd.get("mat_en") || "") },
        sizes: sizes.map((s) => ({ fa: s, en: s })),
        colors: (() => {
          const count = Number(fd.get("colorway_count") || 0);
          const mainImg = String(fd.get("product_image") || "").trim();
          const cols = [];
          for (let i = 0; i < count; i++) {
            const hex = String(fd.get(`cw_hex_${i}`) || "").trim();
            // use per-color image, fall back to main product image
            const img = String(fd.get(`cw_image_${i}`) || "").trim() || mainImg;
            const nameFa = String(fd.get(`cw_name_fa_${i}`) || "").trim();
            const nameEn = String(fd.get(`cw_name_en_${i}`) || "").trim();
            if (!hex && !img) continue;
            cols.push({
              id: `col-${i}`,
              name: { fa: nameFa || `رنگ ${i + 1}`, en: nameEn || `Colour ${i + 1}` },
              hex: hex || "#888888",
              image: img || "/images/collections/s01.jpg",
              stock: Number(fd.get(`cw_stock_${i}`) || 12),
            });
          }
          // If no colorways were defined, create one default entry using the main image
          if (cols.length === 0 && mainImg) {
            cols.push({
              id: "col-0",
              name: { fa: "پیش‌فرض", en: "Default" },
              hex: "#888888",
              image: mainImg,
              stock: 12,
            });
          }
          return cols;
        })(),
        // store main product image on the product-level image field as well
        image: String(fd.get("product_image") || "").trim() || undefined,
      } : {}),
    };

    try {
      const r = await fetch("/api/artist/patterns", {
        ...SESSION_FETCH,
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error();
      onSaved();
    } catch {
      setErr(fa ? "خطایی رخ داد. دوباره تلاش کنید." : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ---- Section heading helper ---- */
  const SectionHeading = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 border-b border-border pb-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-accent">{icon}</span>
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="ltr"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={modalRef}
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
        dir={fa ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              {isEdit ? (fa ? "ویرایش" : "Edit") : (fa ? "افزودن جدید" : "Add new")}
            </p>
            <h2 className="mt-0.5 font-display text-lg font-semibold">
              {isProduct ? (fa ? "محصول" : "Product") : (fa ? "الگو" : "Pattern")}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-background-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={submit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex flex-col gap-6 p-6">

            {/* ── Section 1: Basic info ─────────────────────── */}
            <div className="space-y-4">
              <SectionHeading icon={<Pencil className="h-3.5 w-3.5" />} label={fa ? "اطلاعات پایه" : "Basic info"} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "عنوان فارسی *" : "Title (fa) *"}>
                  <Input name="title_fa" required dir="rtl" defaultValue={initial?.title?.fa ?? ""} placeholder={fa ? "نام الگو یا محصول" : "Persian title"} />
                </Field>
                <Field label={fa ? "عنوان انگلیسی *" : "Title (en) *"}>
                  <Input name="title_en" required dir="ltr" defaultValue={initial?.title?.en ?? ""} placeholder="English title" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "Slug (اختیاری)" : "Slug (optional)"}>
                  <Input name="slug" dir="ltr" defaultValue={initial?.slug ?? ""} placeholder="my-pattern-name" />
                </Field>
                <Field label={fa ? "SKU (اختیاری)" : "SKU (optional)"}>
                  <Input name="sku" dir="ltr" defaultValue={initial?.sku ?? ""} placeholder={isProduct ? "PROD-001" : "PAT-001"} />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "توضیحات فارسی" : "Description (fa)"}>
                  <Textarea name="desc_fa" dir="rtl" rows={3} defaultValue={initial?.description?.fa ?? ""} placeholder={fa ? "توضیح کوتاه..." : "Persian description"} />
                </Field>
                <Field label={fa ? "توضیحات انگلیسی" : "Description (en)"}>
                  <Textarea name="desc_en" dir="ltr" rows={3} defaultValue={initial?.description?.en ?? ""} placeholder="Short description..." />
                </Field>
              </div>
            </div>

            {/* ── Section 2: Category ───────────────────────── */}
            <div className="space-y-3">
              <SectionHeading icon={<Layers className="h-3.5 w-3.5" />} label={fa ? "دسته‌بندی" : "Category"} />
              <div className="relative">
                <select
                  name="categoryId"
                  defaultValue={initial?.categoryId ?? categories[0]?.id ?? ""}
                  className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2.5 pe-10 text-sm font-medium focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  dir={fa ? "rtl" : "ltr"}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {fa ? cat.name.fa : cat.name.en}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            </div>

            {/* ── Section 3: Spaces (pattern only) ─────────── */}
            {!isProduct && spaces.length > 0 && (
              <div className="space-y-3">
                <SectionHeading icon={<LayoutGrid className="h-3.5 w-3.5" />} label={fa ? "فضاهای کاربرد" : "Spaces"} />
                <div className="flex flex-wrap gap-2">
                  {spaces.map((sp) => {
                    const active = selectedSpaces.includes(sp.id);
                    return (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={() => toggleSpace(sp.id)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                          active
                            ? "border-accent bg-accent/10 font-semibold text-accent"
                            : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground"
                        }`}
                      >
                        {fa ? sp.name.fa : sp.name.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Section 4: Pricing ───────────────────────── */}
            <div className="space-y-4">
              <SectionHeading icon={<DollarSign className="h-3.5 w-3.5" />} label={fa ? "قیمت‌گذاری" : "Pricing"} />

              {/* Base prices */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={fa ? "قیمت (تومان) *" : "Price (IRT) *"}>
                  <Input
                    name="price_fa"
                    type="number"
                    min={0}
                    required
                    dir="ltr"
                    value={priceFaVal}
                    onChange={(e) => setPriceFaVal(Number(e.target.value) || 0)}
                  />
                </Field>
                <Field label={fa ? "قیمت (دلار) *" : "Price (USD) *"}>
                  <Input
                    name="price_en"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                    dir="ltr"
                    value={priceEnVal}
                    onChange={(e) => setPriceEnVal(Number(e.target.value) || 0)}
                  />
                </Field>
              </div>

              {/* Discount dropdown — applies to both pattern and product */}
              <div className="rounded-xl border border-border bg-background-secondary/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{fa ? "درصد تخفیف" : "Discount"}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {fa ? "قیمت قبل از تخفیف محاسبه می‌شود" : "Compare-at price is auto-calculated"}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <select
                      value={discountPct}
                      onChange={(e) => setDiscountPct(Number(e.target.value))}
                      className="appearance-none rounded-lg border border-border bg-background py-2 ps-3 pe-9 text-sm font-semibold focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                      dir="ltr"
                    >
                      <option value={0}>{fa ? "بدون تخفیف" : "No discount"}</option>
                      {[5, 10, 15, 20, 25, 30, 35, 40, 50].map((p) => (
                        <option key={p} value={p}>{p}%</option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-muted">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                </div>

                {/* Live preview */}
                {discountPct > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                    <div className="rounded-lg bg-background p-2.5 text-center">
                      <p className="text-[10px] text-muted">{fa ? "قیمت اصلی (تومان)" : "Original (IRT)"}</p>
                      <p className="mt-1 text-sm font-semibold tabular text-foreground-secondary line-through">
                        {compareAtFa.toLocaleString(fa ? "fa-IR" : "en-US")}
                      </p>
                    </div>
                    <div className="rounded-lg bg-background p-2.5 text-center">
                      <p className="text-[10px] text-muted">{fa ? "قیمت اصلی (دلار)" : "Original (USD)"}</p>
                      <p className="mt-1 text-sm font-semibold tabular text-foreground-secondary line-through">
                        ${compareAtEn.toFixed(2)}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-lg bg-success/10 px-3 py-2 text-center">
                      <p className="text-xs font-semibold text-success">
                        {fa
                          ? `${discountPct}٪ تخفیف — مشتری ${priceFaVal.toLocaleString("fa-IR")} تومان می‌پردازد`
                          : `${discountPct}% off — customer pays $${priceEnVal.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 5a: Product image ─────────────────── */}
            {isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<ImageIcon className="h-3.5 w-3.5" />} label={fa ? "تصویر محصول" : "Product image"} />
                <ImageUpload
                  name="product_image"
                  value={prodImageVal}
                  onChange={setProdImageVal}
                  fa={fa}
                />
                <p className="text-[11px] text-muted">
                  {fa
                    ? "در صورت خالی بودن، از تصویر اولین رنگ‌بندی استفاده می‌شود."
                    : "If left empty, the first colourway image is used."}
                </p>
              </div>
            )}

            {/* ── Section 5b: Pattern-only — image & specs ──── */}
            {!isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<BarChart3 className="h-3.5 w-3.5" />} label={fa ? "تصویر و مشخصات فنی" : "Image & technical specs"} />
                <ImageUpload
                  name="image"
                  value={patImageVal}
                  onChange={setPatImageVal}
                  fa={fa}
                  label={fa ? "تصویر اصلی الگو" : "Main pattern image"}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={fa ? "نوع تکرار (فا)" : "Repeat type (fa)"}>
                    <Input name="repeat_fa" dir="rtl" defaultValue={pat?.specs?.repeat?.fa ?? "تکرار کامل"} />
                  </Field>
                  <Field label={fa ? "نوع تکرار (en)" : "Repeat type (en)"}>
                    <Input name="repeat_en" dir="ltr" defaultValue={pat?.specs?.repeat?.en ?? "Full repeat"} />
                  </Field>
                  <Field label="DPI">
                    <Input name="dpi" dir="ltr" defaultValue={pat?.specs?.dpi ?? "300 DPI"} placeholder="300 DPI" />
                  </Field>
                  <Field label={fa ? "فرمت‌ها" : "Formats"}>
                    <Input name="formats" dir="ltr" defaultValue={pat?.specs?.formats ?? "AI · PDF · TIFF"} placeholder="AI · PDF · TIFF" />
                  </Field>
                  <Field label={fa ? "مقیاس (فا)" : "Scale (fa)"}>
                    <Input name="scale_fa" dir="rtl" defaultValue={pat?.specs?.scale?.fa ?? "متوسط"} />
                  </Field>
                  <Field label={fa ? "مقیاس (en)" : "Scale (en)"}>
                    <Input name="scale_en" dir="ltr" defaultValue={pat?.specs?.scale?.en ?? "Medium"} />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Section 6: Product-only — materials & sizes  */}
            {isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<PackagePlus className="h-3.5 w-3.5" />} label={fa ? "جزئیات محصول" : "Product details"} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={fa ? "متریال (فارسی)" : "Material (fa)"}>
                    <Input name="mat_fa" dir="rtl" defaultValue={prod?.materials?.fa ?? ""} placeholder={fa ? "مثال: پارچه پنبه‌ای" : "e.g. Cotton fabric"} />
                  </Field>
                  <Field label={fa ? "متریال (انگلیسی)" : "Material (en)"}>
                    <Input name="mat_en" dir="ltr" defaultValue={prod?.materials?.en ?? ""} placeholder="e.g. Cotton fabric" />
                  </Field>
                </div>
                {/* Sizes chip input */}
                <Field label={fa ? "سایزها" : "Sizes"}>
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background p-2">
                    {sizes.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                        {s}
                        <button type="button" onClick={() => setSizes((p) => p.filter((x) => x !== s))} className="rounded-full hover:text-error">×</button>
                      </span>
                    ))}
                    <input
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addSize(sizeInput); } }}
                      onBlur={() => { if (sizeInput.trim()) addSize(sizeInput); }}
                      placeholder={fa ? "سایز + Enter" : "Size + Enter"}
                      className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                      dir={fa ? "rtl" : "ltr"}
                    />
                  </div>
                </Field>
              </div>
            )}

            {/* ── Section 7: Tags (pattern only) ───────────── */}
            {!isProduct && (
              <div className="space-y-3">
                <SectionHeading icon={<TrendingUp className="h-3.5 w-3.5" />} label={fa ? "برچسب‌ها" : "Tags"} />
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-background p-2">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-background-secondary px-2.5 py-0.5 text-xs font-medium">
                      #{t}
                      <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="rounded-full text-muted hover:text-error">×</button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
                    onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
                    placeholder={fa ? "برچسب + Enter" : "Tag + Enter"}
                    className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                    dir={fa ? "rtl" : "ltr"}
                  />
                </div>
                <p className="text-[11px] text-muted">{fa ? "با Enter یا کاما جدا کنید" : "Separate with Enter or comma"}</p>
              </div>
            )}

            {/* ── Section 8: Colorways ─────────────────────── */}
            <div className="space-y-3">
              <SectionHeading icon={<Heart className="h-3.5 w-3.5" />} label={fa ? "رنگ‌بندی‌ها" : "Colourways"} />
              <ColorwayEditor
                fa={fa}
                initial={
                  isProduct
                    ? ((initial as Product | null)?.colors?.map((c) => ({
                        id: c.id,
                        name: c.name,
                        hex: c.hex,
                        image: c.image,
                        stock: c.stock,
                      })) as Colorway[] | undefined)
                    : ((initial as Pattern | null)?.colorways ?? undefined)
                }
              />
            </div>

          </div>

          {/* ── Sticky footer ────────────────────────────────── */}
          <div className="shrink-0 border-t border-border bg-surface px-6 py-4">
            {err && <p className="mb-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? (fa ? "ذخیره تغییرات" : "Save changes") : (fa ? "ایجاد" : "Create")}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>{fa ? "لغو" : "Cancel"}</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile Editor                                                        */
/* ------------------------------------------------------------------ */
function ProfileEditor({ fa }: { fa: boolean }) {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  // Upload state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/artist/profile", { ...SESSION_FETCH });
        if (!r.ok) throw new Error();
        const d = (await r.json()) as { ok: boolean; artist: Artist | null };
        if (d.artist) {
          setArtist(d.artist);
          setAvatarUrl(d.artist.avatar ?? "");
          setCoverUrl(d.artist.cover ?? "");
          setTags(d.artist.tags ?? []);
        }
      } catch {
        setErr(fa ? "خطا در بارگذاری پروفایل." : "Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fa]);

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t)) setTags((p) => [...p, t]);
    setTagInput("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: { fa: String(fd.get("name_fa") || ""), en: String(fd.get("name_en") || "") },
      profession: { fa: String(fd.get("profession_fa") || ""), en: String(fd.get("profession_en") || "") },
      bio: { fa: String(fd.get("bio_fa") || ""), en: String(fd.get("bio_en") || "") },
      location: { fa: String(fd.get("location_fa") || ""), en: String(fd.get("location_en") || "") },
      social: {
        instagram: String(fd.get("instagram") || "") || undefined,
        behance: String(fd.get("behance") || "") || undefined,
        website: String(fd.get("website") || "") || undefined,
      },
      avatar: avatarUrl || undefined,
      cover: coverUrl || undefined,
      tags,
      licenseType: (fd.get("licenseType") as Artist["licenseType"]) ?? "standard",
    };
    try {
      const r = await fetch("/api/artist/profile", {
        ...SESSION_FETCH,
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = (await r.json()) as { ok: boolean; error?: string; artist?: Artist };
      if (!d.ok) {
        setErr(
          d.error === "slug_taken"
            ? (fa ? "این نام قبلاً استفاده شده است. نام دیگری انتخاب کنید." : "This name is already taken. Choose another.")
            : (fa ? "خطا در ذخیره‌سازی." : "Could not save profile."),
        );
      } else {
        if (d.artist) setArtist(d.artist);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setErr(fa ? "خطای شبکه." : "Network error.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-secondary">
        {fa ? "پروفایل هنرمند یافت نشد." : "Artist profile not found."}
      </div>
    );
  }

  const statusColor =
    artist.status === "approved"
      ? "bg-green-50 text-green-700 border-green-200"
      : artist.status === "rejected"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-yellow-50 text-yellow-700 border-yellow-200";

  const statusLabel = artist.status === "approved"
    ? (fa ? "تأیید شده" : "Approved")
    : artist.status === "rejected"
      ? (fa ? "رد شده" : "Rejected")
      : (fa ? "در انتظار تأیید ادمین" : "Pending admin approval");

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${statusColor}`}>
        {fa ? "وضعیت پروفایل:" : "Profile status:"} {statusLabel}
        {artist.status === "pending" && (
          <span className="mr-2 text-xs font-normal opacity-75">
            {fa ? "پس از تأیید ادمین، پروفایل شما در سایت نمایش داده می‌شود." : "Your profile will be visible after admin approval."}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-6 space-y-6">
        <h2 className="font-semibold text-foreground">{fa ? "ویرایش پروفایل" : "Edit Profile"}</h2>

        {/* Avatar & Cover */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground-secondary">{fa ? "تصویر پروفایل" : "Avatar"}</p>
            {avatarUrl && (
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-border">
                <Image src={avatarUrl} alt="avatar" fill className="object-cover" />
              </div>
            )}
            <ImageUpload
              name="avatar"
              value={avatarUrl}
              onChange={setAvatarUrl}
              fa={fa}
              label={fa ? "آپلود تصویر پروفایل" : "Upload avatar"}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground-secondary">{fa ? "تصویر کاور" : "Cover image"}</p>
            {coverUrl && (
              <div className="relative h-20 w-full overflow-hidden rounded-lg border border-border">
                <Image src={coverUrl} alt="cover" fill className="object-cover" />
              </div>
            )}
            <ImageUpload
              name="cover"
              value={coverUrl}
              onChange={setCoverUrl}
              fa={fa}
              label={fa ? "آپلود کاور" : "Upload cover"}
            />
          </div>
        </div>

        {/* Name */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={fa ? "نام (فارسی)" : "Name (fa)"}>
            <Input name="name_fa" dir="rtl" required defaultValue={artist.name.fa} />
          </Field>
          <Field label={fa ? "نام (انگلیسی)" : "Name (en)"}>
            <Input name="name_en" dir="ltr" required defaultValue={artist.name.en} />
          </Field>
        </div>

        {/* Profession */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={fa ? "تخصص (فارسی)" : "Profession (fa)"}>
            <Input name="profession_fa" dir="rtl" defaultValue={artist.profession.fa} />
          </Field>
          <Field label={fa ? "تخصص (انگلیسی)" : "Profession (en)"}>
            <Input name="profession_en" dir="ltr" defaultValue={artist.profession.en} />
          </Field>
        </div>

        {/* Bio */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={fa ? "بیوگرافی (فارسی)" : "Bio (fa)"}>
            <Textarea name="bio_fa" dir="rtl" rows={4} defaultValue={artist.bio.fa} placeholder={fa ? "درباره خودتان بنویسید…" : "Write about yourself…"} />
          </Field>
          <Field label={fa ? "بیوگرافی (انگلیسی)" : "Bio (en)"}>
            <Textarea name="bio_en" dir="ltr" rows={4} defaultValue={artist.bio.en} placeholder="Write about yourself…" />
          </Field>
        </div>

        {/* Location */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={fa ? "شهر (فارسی)" : "City (fa)"}>
            <Input name="location_fa" dir="rtl" defaultValue={artist.location.fa} />
          </Field>
          <Field label={fa ? "شهر (انگلیسی)" : "City (en)"}>
            <Input name="location_en" dir="ltr" defaultValue={artist.location.en} />
          </Field>
        </div>

        {/* Social */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Instagram">
            <Input name="instagram" dir="ltr" placeholder="username" defaultValue={artist.social?.instagram ?? ""} />
          </Field>
          <Field label="Behance">
            <Input name="behance" dir="ltr" placeholder="username" defaultValue={artist.social?.behance ?? ""} />
          </Field>
          <Field label="Website">
            <Input name="website" type="url" dir="ltr" placeholder="https://..." defaultValue={artist.social?.website ?? ""} />
          </Field>
        </div>

        {/* Tags */}
        <Field label={fa ? "برچسب‌ها" : "Tags"}>
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-background p-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                {t}
                <button type="button" onClick={() => setTags((p) => p.filter((x) => x !== t))} className="rounded-full hover:text-error">×</button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
              placeholder={fa ? "برچسب + Enter" : "Tag + Enter"}
              className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              dir={fa ? "rtl" : "ltr"}
            />
          </div>
        </Field>

        {/* License type */}
        <Field label={fa ? "نوع لایسنس" : "License type"}>
          <select
            name="licenseType"
            defaultValue={artist.licenseType ?? "standard"}
            className="w-full appearance-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            dir={fa ? "rtl" : "ltr"}
          >
            <option value="standard">{fa ? "استاندارد" : "Standard"}</option>
            <option value="exclusive">{fa ? "اختصاصی" : "Exclusive"}</option>
            <option value="custom">{fa ? "سفارشی" : "Custom"}</option>
          </select>
        </Field>

        {/* Revenue share (read-only display) */}
        {artist.revenueSharePct !== undefined && (
          <div className="rounded-xl border border-border bg-background-secondary px-4 py-3 text-sm">
            <span className="text-foreground-secondary">{fa ? "سهم فروش شما:" : "Your revenue share:"}</span>
            <span className="mr-2 font-semibold text-foreground">{artist.revenueSharePct}٪</span>
            <span className="text-xs text-muted">{fa ? "(توسط ادمین تنظیم می‌شود)" : "(set by admin)"}</span>
          </div>
        )}

        {err && <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{err}</p>}
        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {fa ? "پروفایل با موفقیت ذخیره شد." : "Profile saved successfully."}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {fa ? "ذخیره پروفایل" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
