"use client";

import { useRef, useState, useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GalleryHorizontalEnd,
  Globe,
  Home,
  Image,
  Link2,
  Loader2,
  Monitor,
  Package,
  Palette,
  Pencil,
  Percent,
  Plus,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Type,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn, slugify, t } from "@/lib/utils";
import type {
  Artist,
  Category,
  EducationItem,
  HomeSection,
  HomeSectionKey,
  Pattern,
  Portfolio,
  Product,
  SiteContent,
  Space,
  Story,
} from "@/lib/types";

/* ══════════════════════════════════════════════════════════
   helpers
   ══════════════════════════════════════════════════════════ */
const L = (fa: string, en: string) => ({ fa, en });

function toman(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ه`;
  return `${n}`;
}
function pct(price: number, compare: number) {
  return Math.round(((compare - price) / compare) * 100);
}
function uid() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ══════════════════════════════════════════════════════════
   متادیتای بخش‌ها
   ══════════════════════════════════════════════════════════ */
const SECTION_META: Record<HomeSectionKey, { label: string; icon: React.ReactNode; desc: string }> = {
  hero:        { label: "هیرو (بنر اصلی)",      icon: <Image className="h-4 w-4" />,               desc: "بنر تمام‌صفحه با عنوان، CTA و رسانه" },
  discovery:   { label: "کشف الگو",             icon: <Palette className="h-4 w-4" />,             desc: "معرفی کتابخانه الگوهای سایت" },
  trending:    { label: "پرطرفدارها",           icon: <Zap className="h-4 w-4" />,                 desc: "الگوهایی با پرچم trending" },
  bestSellers: { label: "پرفروش‌ترین‌ها",       icon: <Star className="h-4 w-4" />,                desc: "الگوها و محصولات با پرچم bestSeller" },
  newPatterns: { label: "الگوهای جدید",         icon: <Sparkles className="h-4 w-4" />,            desc: "الگوهایی با پرچم isNew" },
  artists:     { label: "هنرمندان منتخب",       icon: <Users className="h-4 w-4" />,               desc: "هنرمندان با پرچم featured" },
  portfolios:  { label: "پورتفولیوهای منتخب",  icon: <GalleryHorizontalEnd className="h-4 w-4" />, desc: "پروژه‌های featured" },
  styles:      { label: "کاوش بر اساس سبک",    icon: <Tag className="h-4 w-4" />,                 desc: "دسته‌بندی‌های featured" },
  spaces:      { label: "کاوش بر اساس فضا",    icon: <Home className="h-4 w-4" />,                desc: "فضاهای ثابت سایت" },
  exclusive:   { label: "کالکشن اختصاصی",      icon: <ShoppingBag className="h-4 w-4" />,         desc: "محصولات بدون artistId (site-owned)" },
  projects:    { label: "پروژه‌های منتخب",      icon: <GalleryHorizontalEnd className="h-4 w-4" />, desc: "پورتفولیوهایی با isProject=true" },
  education:   { label: "آکادمی",               icon: <BookOpen className="h-4 w-4" />,            desc: "دوره‌ها و آموزش‌های featured" },
  b2b:         { label: "پروژه‌های سازمانی",   icon: <Package className="h-4 w-4" />,             desc: "بنر ثابت B2B" },
  custom:      { label: "تولید سفارشی",         icon: <Package className="h-4 w-4" />,             desc: "بنر ثابت سفارش اختصاصی" },
  stories:     { label: "روایت هنرمندان",       icon: <BookOpen className="h-4 w-4" />,            desc: "مقالات و داستان‌های هنرمندان" },
  newsletter:  { label: "خبرنامه",              icon: <Sparkles className="h-4 w-4" />,            desc: "فرم عضویت در خبرنامه" },
};

/* ══════════════════════════════════════════════════════════
   Modal پایه
   ══════════════════════════════════════════════════════════ */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background-secondary"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ── فیلدهای فرم ── */
function FRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-foreground-secondary">{label}</label>
      {children}
    </div>
  );
}
function FInput({ value, onChange, dir = "rtl", placeholder }: { value: string; onChange: (v: string) => void; dir?: "rtl" | "ltr"; placeholder?: string }) {
  return <input dir={dir} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />;
}
function FTextarea({ value, onChange, dir = "rtl" }: { value: string; onChange: (v: string) => void; dir?: "rtl" | "ltr" }) {
  return <textarea dir={dir} rows={3} value={value} onChange={e => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none" />;
}
function FNumber({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />;
}
function FCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-accent" />
      {label}
    </label>
  );
}
function SaveBtn({ onClick, label = "ذخیره" }: { onClick: () => void; label?: string }) {
  return <button onClick={onClick} className="rounded-lg bg-[#1e2230] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a3045]">{label}</button>;
}
function CancelBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-background-secondary">انصراف</button>;
}

/* ══════════════════════════════════════════════════════════
   کامپوننت اصلی
   ══════════════════════════════════════════════════════════ */
export function HomeSectionsManager({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const list = useMemo(() => data.homeSections.slice().sort((a, b) => a.order - b.order), [data.homeSections]);
  const [expanded, setExpanded] = useState<HomeSectionKey | null>("hero");

  const move = (i: number, dir: -1 | 1) => {
    const next = list.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    update({ homeSections: next.map((s, k) => ({ ...s, order: k + 1 })) });
  };
  const toggle = (key: HomeSectionKey) =>
    update({ homeSections: list.map((x) => (x.key === key ? { ...x, enabled: !x.enabled } : x)) });

  const enabledCount = list.filter((s) => s.enabled).length;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-white px-5 py-4 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">بخش‌های صفحه اصلی</h2>
            <p className="mt-0.5 text-xs text-muted">{enabledCount} از {list.length} بخش فعال · هر بخش را باز کنید تا محتوا را ببینید و ویرایش کنید</p>
          </div>
          <div className="flex gap-1.5">
            <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-xs font-medium text-success">{enabledCount} فعال</span>
            <span className="rounded-full border border-border bg-background-secondary px-2.5 py-1 text-xs font-medium text-muted">{list.length - enabledCount} مخفی</span>
          </div>
        </div>
      </div>
      {list.map((section, i) => {
        const meta = SECTION_META[section.key];
        const isOpen = expanded === section.key;
        return (
          <SectionRow key={section.key} section={section} meta={meta} index={i} total={list.length} isOpen={isOpen} data={data} update={update}
            onToggle={() => toggle(section.key)} onMoveUp={() => move(i, -1)} onMoveDown={() => move(i, 1)} onExpand={() => setExpanded(isOpen ? null : section.key)} />
        );
      })}
    </div>
  );
}

/* ── ردیف بخش ── */
function SectionRow({ section, meta, index, total, isOpen, data, update, onToggle, onMoveUp, onMoveDown, onExpand }: {
  section: HomeSection; meta: { label: string; icon: React.ReactNode; desc: string };
  index: number; total: number; isOpen: boolean; data: SiteContent;
  update: (p: Partial<SiteContent>) => void;
  onToggle: () => void; onMoveUp: () => void; onMoveDown: () => void; onExpand: () => void;
}) {
  const count = getSectionCount(section.key, data);
  return (
    <div className={cn("rounded-xl border bg-white shadow-soft", section.enabled ? "border-border" : "border-border/50 opacity-70", isOpen && "ring-2 ring-accent/20")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background-secondary text-xs font-bold text-foreground-secondary">{index + 1}</div>
        <button className="flex min-w-0 flex-1 items-center gap-2 text-start" onClick={onExpand}>
          <span className="text-muted">{meta.icon}</span>
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", !section.enabled && "line-through text-muted")}>{meta.label}</p>
            <p className="truncate text-xs text-muted">{meta.desc}</p>
          </div>
          {count > 0 && <span className="mr-1 shrink-0 rounded-full border border-border bg-background-secondary px-2 py-0.5 text-[10px] font-medium text-muted">{count}</span>}
          {isOpen ? <ChevronUp className="mr-auto h-4 w-4 shrink-0 text-muted" /> : <ChevronDown className="mr-auto h-4 w-4 shrink-0 text-muted" />}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onMoveUp} disabled={index === 0} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background-secondary disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background-secondary disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button onClick={onToggle} className={cn("flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium transition-colors", section.enabled ? "border-success/30 bg-success/10 text-success" : "border-border bg-background-secondary text-muted")}>
            {section.enabled ? <><Eye className="h-3 w-3" />نمایش</> : <><EyeOff className="h-3 w-3" />مخفی</>}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="border-t border-border bg-[#fafbfc] px-4 py-4">
          <SectionContent sectionKey={section.key} data={data} update={update} />
        </div>
      )}
    </div>
  );
}

function getSectionCount(key: HomeSectionKey, data: SiteContent): number {
  switch (key) {
    case "trending":    return data.patterns.filter(p => p.trending).length;
    case "bestSellers": return data.patterns.filter(p => p.bestSeller).length;
    case "newPatterns": return data.patterns.filter(p => p.isNew).length;
    case "artists":     return data.artists.filter(a => a.featured).length;
    case "portfolios":  return data.portfolios.filter(p => p.featured).length;
    case "projects":    return data.portfolios.filter(p => p.isProject).length;
    case "styles":      return data.categories.filter(c => c.featured).length;
    case "spaces":      return data.spaces.length;
    case "exclusive":   return data.products.filter(p => !p.artistId).length;
    case "education":   return data.education.filter(e => e.featured).length;
    case "discovery":   return data.patterns.length;
    default: return 0;
  }
}

/* ══════════════════════════════════════════════════════════
   محتوای هر بخش با CRUD
   ══════════════════════════════════════════════════════════ */
function SectionContent({ sectionKey, data, update }: { sectionKey: HomeSectionKey; data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  switch (sectionKey) {
    case "hero":        return <HeroEditor data={data} update={update} />;
    case "discovery":
    case "trending":
    case "bestSellers":
    case "newPatterns": return <PatternsEditor sectionKey={sectionKey} data={data} update={update} />;
    case "artists":     return <ArtistsEditor data={data} update={update} />;
    case "portfolios":
    case "projects":    return <PortfoliosEditor sectionKey={sectionKey} data={data} update={update} />;
    case "styles":      return <StylesEditor data={data} update={update} />;
    case "spaces":      return <SpacesEditor data={data} update={update} />;
    case "exclusive":   return <ProductsEditor sectionKey={sectionKey} data={data} update={update} />;
    case "education":   return <EducationEditor data={data} update={update} />;
    case "stories":     return <StoriesEditor data={data} update={update} />;
    case "b2b": case "custom": case "newsletter":
      return <StaticBannerInfo sectionKey={sectionKey} />;
    default: return null;
  }
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر هیرو
   ══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
   آپلودر تصویر با پیش‌نمایش
   ══════════════════════════════════════════════════════════ */
function ImageUploadCard({
  src, index, total,
  onMoveUp, onMoveDown, onRemove,
}: {
  src: string; index: number; total: number;
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-white shadow-soft transition-all duration-200",
        hovered ? "border-accent/60 shadow-medium" : "border-border",
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* تصویر */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#0d1117]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`اسلاید ${index + 1}`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.15"; }}
        />
        {/* overlay شماره اسلاید */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-[11px] font-bold text-white">
          {index + 1}
        </span>
        {/* دکمه حذف */}
        <button
          type="button"
          aria-label="حذف تصویر"
          onClick={onRemove}
          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500/90 text-white opacity-0 shadow transition-opacity duration-150 hover:bg-red-600 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* مسیر فایل */}
      <div className="px-2.5 pb-2 pt-2">
        <p className="truncate text-[10px] font-mono text-muted" dir="ltr">{src}</p>
      </div>

      {/* کنترل ترتیب */}
      <div className="flex items-center justify-between border-t border-border/50 px-2 py-1.5">
        <span className="text-[10px] font-medium text-muted">اسلاید {index + 1} از {total}</span>
        <div className="flex gap-0.5">
          <button type="button" aria-label="انتقال به بالا" disabled={index === 0} onClick={onMoveUp}
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-background-secondary disabled:opacity-30 transition-colors">
            <ArrowUp className="h-3 w-3" />
          </button>
          <button type="button" aria-label="انتقال به پایین" disabled={index === total - 1} onClick={onMoveDown}
            className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-background-secondary disabled:opacity-30 transition-colors">
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر هیرو — نسخه حرفه‌ای
   ══════════════════════════════════════════════════════════ */
function HeroEditor({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const h = data.hero;
  const set = (patch: Partial<typeof h>) => update({ hero: { ...h, ...patch } });

  /* ── state ─────────────────────────────────────── */
  const [newImg, setNewImg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const newImgRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const images: string[] = h.images ?? (h.image ? [h.image] : []);

  /* ── عملیات تصویر ─────────────────────────────── */
  const addImage = () => {
    const url = newImg.trim();
    if (!url) return;
    set({ images: [...images, url] });
    setNewImg("");
    newImgRef.current?.focus();
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    set({ images: next.length > 0 ? next : undefined });
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const next = images.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    set({ images: next });
  };

  /* ── آپلود فایل ────────────────────────────────── */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/artist/upload", { method: "POST", body: form, credentials: "include" });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!json.ok || !json.url) throw new Error(json.error ?? "خطا در آپلود");
      set({ images: [...images, json.url] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const parallaxEnabled = h.parallaxEnabled !== false;
  const interactiveEnabled = h.interactiveEnabled !== false;
  const sliderMode = h.sliderMode === true;

  return (
    <div className="space-y-6">

      {/* ══════════════════════════════════════
          بخش اول: محتوای متنی
          ══════════════════════════════════════ */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
        {/* هدر بخش */}
        <div className="flex items-center gap-2 border-b border-border bg-[#f7f8fa] px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/8 text-foreground">
            <Type className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">محتوای متنی بنر</p>
            <p className="text-[10px] text-muted">عنوان، توضیحات و لینک دکمه‌های CTA</p>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* سرعنوان */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1 w-4 rounded-full bg-accent" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">سرعنوان کوچک (eyebrow)</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-green-500/15 text-[9px] font-bold text-green-700">FA</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">فارسی</label>
                </div>
                <FInput value={h.eyebrow.fa} onChange={v => set({ eyebrow: { ...h.eyebrow, fa: v } })} placeholder="e.g. طراحی منحصربه‌فرد" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-500/15 text-[9px] font-bold text-blue-700">EN</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">انگلیسی</label>
                </div>
                <FInput dir="ltr" value={h.eyebrow.en} onChange={v => set({ eyebrow: { ...h.eyebrow, en: v } })} placeholder="e.g. Exclusive Design" />
              </div>
            </div>
          </div>

          {/* عنوان خط اول */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1 w-4 rounded-full bg-purple-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">عنوان اصلی — خط اول</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-green-500/15 text-[9px] font-bold text-green-700">FA</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">فارسی</label>
                </div>
                <FInput value={h.titleA.fa} onChange={v => set({ titleA: { ...h.titleA, fa: v } })} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-500/15 text-[9px] font-bold text-blue-700">EN</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">انگلیسی</label>
                </div>
                <FInput dir="ltr" value={h.titleA.en} onChange={v => set({ titleA: { ...h.titleA, en: v } })} />
              </div>
            </div>
          </div>

          {/* عنوان خط دوم */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1 w-4 rounded-full bg-purple-400" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">عنوان اصلی — خط دوم</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-green-500/15 text-[9px] font-bold text-green-700">FA</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">فارسی</label>
                </div>
                <FInput value={h.titleB.fa} onChange={v => set({ titleB: { ...h.titleB, fa: v } })} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-500/15 text-[9px] font-bold text-blue-700">EN</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">انگلیسی</label>
                </div>
                <FInput dir="ltr" value={h.titleB.en} onChange={v => set({ titleB: { ...h.titleB, en: v } })} />
              </div>
            </div>
          </div>

          {/* توضیحات */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1 w-4 rounded-full bg-amber-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">توضیحات (description)</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-green-500/15 text-[9px] font-bold text-green-700">FA</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">فارسی</label>
                </div>
                <FTextarea value={h.description.fa} onChange={v => set({ description: { ...h.description, fa: v } })} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-500/15 text-[9px] font-bold text-blue-700">EN</span>
                  <label className="text-[10px] font-medium text-foreground-secondary">انگلیسی</label>
                </div>
                <FTextarea dir="ltr" value={h.description.en} onChange={v => set({ description: { ...h.description, en: v } })} />
              </div>
            </div>
          </div>

          {/* لینک دکمه‌ها */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1 w-4 rounded-full bg-sky-500" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">لینک دکمه‌های CTA</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground-secondary">دکمه اول (CTA اصلی)</label>
                <div className="relative">
                  <Link2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <FInput dir="ltr" value={h.ctaHref} onChange={v => set({ ctaHref: v })} placeholder="/fa/shop" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-foreground-secondary">دکمه دوم</label>
                <div className="relative">
                  <Link2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                  <FInput dir="ltr" value={h.cta2Href} onChange={v => set({ cta2Href: v })} placeholder="/fa/about" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          بخش دوم: تصاویر پس‌زمینه
          ══════════════════════════════════════ */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
        {/* هدر */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-[#f7f8fa] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/8 text-foreground">
              <Image className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">تصاویر پس‌زمینه اسلایدشو</p>
              <p className="text-[10px] text-muted">هر تصویر یک اسلاید می‌سازد — ترتیب قابل تنظیم است</p>
            </div>
          </div>
          <span className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
            images.length > 0
              ? "border-success/30 bg-success/10 text-success"
              : "border-border bg-background-secondary text-muted"
          )}>
            {images.length} اسلاید
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* کارت‌های تصویر */}
          {images.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((src, i) => (
                <ImageUploadCard
                  key={`${src}-${i}`}
                  src={src}
                  index={i}
                  total={images.length}
                  onMoveUp={() => moveImage(i, -1)}
                  onMoveDown={() => moveImage(i, 1)}
                  onRemove={() => removeImage(i)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background-secondary/40 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-secondary">
                <Image className="h-5 w-5 text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground-secondary">هیچ تصویری اضافه نشده</p>
                <p className="mt-0.5 text-xs text-muted">اولین تصویر را اپلود یا آدرس آن را وارد کنید</p>
              </div>
            </div>
          )}

          {/* خط جداکننده */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] uppercase tracking-wider text-muted">افزودن تصویر جدید</span></div>
          </div>

          {/* آپلود فایل */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* آپلود از دستگاه */}
            <div
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors",
                uploading
                  ? "border-accent/60 bg-accent/5"
                  : "border-border hover:border-accent/50 hover:bg-accent/5",
              )}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={handleFileUpload} />
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <p className="text-xs font-medium text-accent">در حال آپلود...</p>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
                    <Upload className="h-4.5 w-4.5 text-muted" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">آپلود از دستگاه</p>
                    <p className="mt-0.5 text-[10px] text-muted">JPG · PNG · WebP · AVIF · حداکثر ۸ مگابایت</p>
                  </div>
                </>
              )}
            </div>

            {/* افزودن با URL */}
            <div className="flex flex-col justify-center gap-2 rounded-xl border border-border bg-background-secondary/40 p-4">
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted" />
                <p className="text-[11px] font-semibold text-foreground-secondary">آدرس مستقیم (URL)</p>
              </div>
              <input
                ref={newImgRef}
                dir="ltr"
                value={newImg}
                onChange={e => setNewImg(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addImage()}
                placeholder="/images/hero/hero-bg-05.jpg"
                className="h-9 w-full rounded-lg border border-border bg-white px-3 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
              <button
                type="button"
                onClick={addImage}
                disabled={!newImg.trim()}
                className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-foreground text-xs font-semibold text-background hover:bg-foreground/90 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                افزودن تصویر
              </button>
            </div>
          </div>

          {/* خطای آپلود */}
          {uploadError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <X className="h-3.5 w-3.5 shrink-0" />
              {uploadError}
              <button onClick={() => setUploadError(null)} className="mr-auto text-red-500 hover:text-red-700"><X className="h-3 w-3" /></button>
            </div>
          )}

          {/* ویدیو پس‌زمینه */}
          <div className="border-t border-border/60 pt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1 w-4 rounded-full bg-rose-400" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">ویدیو پس‌زمینه (اختیاری)</p>
            </div>
            <p className="mb-2 text-[10px] text-muted">در صورت وارد کردن ویدیو، به‌جای تصاویر نمایش داده می‌شود</p>
            <FInput dir="ltr" value={h.video ?? ""} onChange={v => set({ video: v || undefined })} placeholder="/videos/hero.mp4" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          بخش سوم: تنظیمات رفتار
          ══════════════════════════════════════ */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b border-border bg-[#f7f8fa] px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/8 text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-foreground">تنظیمات رفتار و نمایش</p>
            <p className="text-[10px] text-muted">اسلایدر، پارالاکس و کنترل تعاملی</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <HsmToggleRow
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            label="حالت اسلایدر (تایمر خودکار)"
            desc="تصاویر با تایمر جابجا می‌شوند نه اسکرول."
            checked={sliderMode}
            onChange={v => set({ sliderMode: v })}
          />
          <HsmToggleRow
            icon={<Monitor className="h-3.5 w-3.5" />}
            label="افکت پارالاکس اسکرول"
            desc="حرکت ملایم لایه پس‌زمینه هنگام اسکرول."
            checked={parallaxEnabled}
            onChange={v => set({ parallaxEnabled: v })}
          />
          <HsmToggleRow
            icon={<Zap className="h-3.5 w-3.5" />}
            label="کنترل تعاملی اسلاید"
            desc="کاربر می‌تواند روی نوار پیشرفت کلیک کند."
            checked={interactiveEnabled}
            onChange={v => set({ interactiveEnabled: v })}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════
          بخش چهارم: الگوهای پیش‌نمایش
          ══════════════════════════════════════ */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-soft">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-[#f7f8fa] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/8 text-foreground">
              <Palette className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground">الگوهای پیش‌نمایش</p>
              <p className="text-[10px] text-muted">الگوهایی که در کارت شناور سمت راست هیرو نمایش داده می‌شوند</p>
            </div>
          </div>
          {h.featuredPatternIds.length > 0 && (
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
              {h.featuredPatternIds.length} انتخاب‌شده
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.patterns.map(p => {
              const on = h.featuredPatternIds.includes(p.id);
              const order = h.featuredPatternIds.indexOf(p.id);
              return (
                <button key={p.id} type="button"
                  onClick={() => set({ featuredPatternIds: on ? h.featuredPatternIds.filter(x => x !== p.id) : [...h.featuredPatternIds, p.id] })}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-xl border p-2.5 text-start transition-all",
                    on
                      ? "border-accent/40 bg-accent/5 ring-1 ring-accent/20"
                      : "border-border hover:border-accent/30 bg-white hover:bg-accent/3",
                  )}>
                  {/* تصویر پیش‌نمایش */}
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{t(p.title, "fa")}</p>
                    <p className="text-[10px] text-muted font-mono" dir="ltr">{p.sku}</p>
                  </div>
                  {on ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                      {order + 1}
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted group-hover:border-accent/40 group-hover:text-accent">
                      +
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {h.featuredPatternIds.length > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-success/20 bg-success/8 px-3 py-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-success" />
              <p className="text-[11px] text-success font-medium">
                {h.featuredPatternIds.length} الگو انتخاب شده — ترتیب انتخاب برابر ترتیب نمایش در کارت است
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ردیف تاگل مخصوص HomeSectionsManager */
function HsmToggleRow({ icon, label, desc, checked, onChange }: {
  icon: React.ReactNode; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
      checked ? "border-foreground/20 bg-foreground/5" : "border-border bg-white",
    )}>
      <span className={cn("shrink-0", checked ? "text-foreground" : "text-muted")}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted">{desc}</p>
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn("relative h-4 w-7 shrink-0 rounded-full transition-colors duration-200", checked ? "bg-foreground" : "bg-border")}>
        <span className={cn("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-[left] duration-200", checked ? "left-[14px]" : "left-0.5")} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر الگوها
   ══════════════════════════════════════════════════════════ */
function PatternsEditor({ sectionKey, data, update }: { sectionKey: HomeSectionKey; data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<Pattern | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const flagMap: Record<string, keyof Pattern> = {
    trending: "trending", bestSellers: "bestSeller", newPatterns: "isNew", discovery: "featured",
  };
  const flag = flagMap[sectionKey] as keyof Pattern | undefined;

  const filtered = flag
    ? data.patterns.filter(p => Boolean(p[flag]))
    : data.patterns;

  const setPatterns = (patterns: Pattern[]) => update({ patterns });

  const deletePattern = (id: string) => {
    if (!confirm("این الگو حذف شود؟")) return;
    setPatterns(data.patterns.filter(p => p.id !== id));
  };
  const savePattern = (p: Pattern) => {
    setPatterns(data.patterns.map(x => x.id === p.id ? p : x));
    setEditTarget(null);
  };
  const addPattern = (p: Pattern) => {
    setPatterns([...data.patterns, p]);
    setShowAdd(false);
  };
  const toggleFlag = (id: string, f: keyof Pattern) => {
    setPatterns(data.patterns.map(p => p.id === id ? { ...p, [f]: !p[f] } : p));
  };

  const titleLabel: Record<string, string> = { trending: "پرطرفدار", bestSellers: "پرفروش", newPatterns: "جدید", discovery: "همه الگوها" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title={titleLabel[sectionKey] ?? "الگوها"} count={filtered.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]">
          <Plus className="h-3.5 w-3.5" />افزودن الگو
        </button>
      </div>
      {filtered.length === 0 ? <EmptyNote msg="الگویی با این پرچم ندارید." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(p => (
            <PatternCard key={p.id} pattern={p}
              onEdit={() => setEditTarget(p)}
              onDelete={() => deletePattern(p.id)}
              onToggleFlag={flag ? () => toggleFlag(p.id, flag) : undefined}
              flagLabel={flag ? { trending: "پرطرفدار", bestSeller: "پرفروش", isNew: "جدید", featured: "منتخب" }[flag as string] : undefined}
              flagActive={flag ? Boolean(p[flag]) : undefined}
            />
          ))}
        </div>
      )}
      {editTarget && <PatternEditModal pattern={editTarget} data={data} onSave={savePattern} onClose={() => setEditTarget(null)} />}
      {showAdd && <PatternEditModal pattern={newPattern(data)} data={data} onSave={addPattern} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function newPattern(data: SiteContent): Pattern {
  const id = uid();
  return {
    id, sku: `RA-PT-${Date.now().toString().slice(-4)}`, slug: `new-pattern-${id}`,
    title: L("الگوی جدید", "New Pattern"), description: L("", ""),
    image: "/images/patterns/p01.jpg", gallery: [], categoryId: data.categories[0]?.id ?? "",
    spaceIds: [], artistId: null, price: { fa: 1500000, en: 40 },
    specs: { repeat: L("۶۴ سانتی‌متر", "64 cm"), dpi: "300 DPI", formats: "AI · PDF · TIFF", colors: 4, scale: L("متوسط", "Medium") },
    palette: [], colorways: [], tags: [], featured: false, trending: false, bestSeller: false, isNew: true,
    createdAt: new Date().toISOString().slice(0, 10), likes: 0,
  };
}

function PatternCard({ pattern: p, onEdit, onDelete, onToggleFlag, flagLabel, flagActive }: {
  pattern: Pattern; onEdit: () => void; onDelete: () => void;
  onToggleFlag?: () => void; flagLabel?: string; flagActive?: boolean;
}) {
  const img = p.colorways?.find(c => c.isDefault)?.image ?? p.colorways?.[0]?.image ?? p.image;
  const hasDiscount = false;
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft hover:shadow-medium transition-shadow">
      <div className="relative aspect-square overflow-hidden bg-background-secondary">
        <img src={img} alt={t(p.title, "fa")} className="h-full w-full object-cover" />
        <div className="absolute right-2 top-2 flex flex-wrap gap-1">
          {p.isNew && <Badge color="green">جدید</Badge>}
          {p.trending && <Badge color="blue">پرطرفدار</Badge>}
          {p.bestSeller && <Badge color="amber">پرفروش</Badge>}
          {p.featured && <Badge color="purple">منتخب</Badge>}
        </div>
        {p.colorways && p.colorways.length > 1 && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            {p.colorways.slice(0, 4).map(cw => <span key={cw.id} className="h-4 w-4 rounded-full border border-white/70 shadow-sm" style={{ background: cw.hex }} />)}
            {p.colorways.length > 4 && <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/70 bg-white/80 text-[8px] font-bold">{`+${p.colorways.length - 4}`}</span>}
          </div>
        )}
        {/* دکمه‌های عملیات روی هاور */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="p-3">
        <p className="font-mono text-[10px] text-muted">{p.sku}</p>
        <p className="mt-0.5 text-sm font-semibold leading-tight text-foreground">{t(p.title, "fa")}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{t(p.description, "fa")}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground">{toman(p.price.fa)} تومان</p>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted">{p.specs.colors} رنگ</span>
        </div>
        {/* دکمه‌های پرچم */}
        <div className="mt-2 flex flex-wrap gap-1">
          {(["featured", "trending", "bestSeller", "isNew"] as (keyof Pattern)[]).map(f => {
            const labels: Record<string, string> = { featured: "منتخب", trending: "پرطرفدار", bestSeller: "پرفروش", isNew: "جدید" };
            const on = Boolean(p[f]);
            return (
              <button key={String(f)} onClick={() => {/* no-op — via edit modal */}}
                className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", on ? "border-accent bg-accent/10 text-accent" : "border-border text-muted opacity-50")}>
                {labels[String(f)]}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs text-foreground-secondary hover:bg-background-secondary"><Pencil className="h-3 w-3" />ویرایش</button>
          <button onClick={onDelete} className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" />حذف</button>
        </div>
      </div>
    </div>
  );
}

function PatternEditModal({ pattern, data, onSave, onClose, isNew }: { pattern: Pattern; data: SiteContent; onSave: (p: Pattern) => void; onClose: () => void; isNew?: boolean }) {
  const [p, setP] = useState<Pattern>({ ...pattern });
  const set = (patch: Partial<Pattern>) => setP(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن الگوی جدید" : `ویرایش: ${t(p.title, "fa")}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="عنوان (فارسی)"><FInput value={p.title.fa} onChange={v => set({ title: { ...p.title, fa: v } })} /></FRow>
          <FRow label="عنوان (انگلیسی)"><FInput dir="ltr" value={p.title.en} onChange={v => set({ title: { ...p.title, en: v } })} /></FRow>
          <FRow label="توضیح (فارسی)"><FTextarea value={p.description.fa} onChange={v => set({ description: { ...p.description, fa: v } })} /></FRow>
          <FRow label="توضیح (انگلیسی)"><FTextarea dir="ltr" value={p.description.en} onChange={v => set({ description: { ...p.description, en: v } })} /></FRow>
          <FRow label="SKU"><FInput dir="ltr" value={p.sku} onChange={v => set({ sku: v })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={p.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="تصویر اصلی"><FInput dir="ltr" value={p.image} onChange={v => set({ image: v })} /></FRow>
          <FRow label="قیمت (تومان)"><FNumber value={p.price.fa} onChange={v => set({ price: { ...p.price, fa: v } })} /></FRow>
          <FRow label="قیمت (دلار)"><FNumber value={p.price.en} onChange={v => set({ price: { ...p.price, en: v } })} /></FRow>
          <FRow label="دسته‌بندی">
            <select value={p.categoryId} onChange={e => set({ categoryId: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
              {data.categories.map(c => <option key={c.id} value={c.id}>{t(c.name, "fa")}</option>)}
            </select>
          </FRow>
          <FRow label="تعداد رنگ"><FNumber value={p.specs.colors} onChange={v => set({ specs: { ...p.specs, colors: v } })} /></FRow>
          <FRow label="تکرار (فارسی)"><FInput value={p.specs.repeat.fa} onChange={v => set({ specs: { ...p.specs, repeat: { ...p.specs.repeat, fa: v } } })} /></FRow>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FCheck label="منتخب" checked={p.featured} onChange={v => set({ featured: v })} />
          <FCheck label="پرطرفدار" checked={p.trending} onChange={v => set({ trending: v })} />
          <FCheck label="پرفروش" checked={p.bestSeller} onChange={v => set({ bestSeller: v })} />
          <FCheck label="جدید" checked={p.isNew} onChange={v => set({ isNew: v })} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(p)} label={isNew ? "افزودن" : "ذخیره تغییرات"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر محصولات
   ══════════════════════════════════════════════════════════ */
function ProductsEditor({ sectionKey, data, update }: { sectionKey: HomeSectionKey; data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const products = sectionKey === "exclusive" ? data.products.filter(p => !p.artistId) : data.products;
  const setProducts = (products: Product[]) => update({ products });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="محصولات" count={products.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"><Plus className="h-3.5 w-3.5" />افزودن محصول</button>
      </div>
      {products.length === 0 ? <EmptyNote msg="محصولی ندارید." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} onEdit={() => setEditTarget(p)} onDelete={() => { if (confirm("حذف شود؟")) setProducts(data.products.filter(x => x.id !== p.id)); }} />
          ))}
        </div>
      )}
      {editTarget && <ProductEditModal product={editTarget} data={data} onSave={prod => { setProducts(data.products.map(x => x.id === prod.id ? prod : x)); setEditTarget(null); }} onClose={() => setEditTarget(null)} />}
      {showAdd && <ProductEditModal product={newProduct(data)} data={data} onSave={prod => { setProducts([...data.products, prod]); setShowAdd(false); }} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function newProduct(data: SiteContent): Product {
  const id = uid();
  return {
    id, sku: `RA-WP-${Date.now().toString().slice(-4)}`, slug: `new-product-${id}`,
    title: L("محصول جدید", "New Product"), description: L("", ""),
    categoryId: data.categories[0]?.id ?? "", patternId: null, artistId: null,
    price: { fa: 2000000, en: 75 }, colors: [], sizes: [], specs: [], materials: L("", ""),
    featured: false, bestSeller: false, isNew: true, order: data.products.length + 1,
  };
}

function ProductCard({ product: p, onEdit, onDelete }: { product: Product; onEdit: () => void; onDelete: () => void }) {
  const img = p.colors[0]?.image ?? "/images/patterns/p01.jpg";
  const hasDis = p.compareAt && p.compareAt.fa > p.price.fa;
  const dp = hasDis ? pct(p.price.fa, p.compareAt!.fa) : 0;
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft hover:shadow-medium transition-shadow">
      <div className="relative aspect-[4/3] overflow-hidden bg-background-secondary">
        <img src={img} alt={t(p.title, "fa")} className="h-full w-full object-cover" />
        {hasDis && <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white"><Percent className="h-3 w-3" />{dp}٪</div>}
        <div className="absolute right-2 top-2 flex flex-wrap gap-1">
          {p.isNew && <Badge color="green">جدید</Badge>}
          {p.bestSeller && <Badge color="amber">پرفروش</Badge>}
          {p.featured && <Badge color="purple">منتخب</Badge>}
          {!p.artistId && <Badge color="blue">سایت</Badge>}
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="p-3">
        <p className="font-mono text-[10px] text-muted">{p.sku}</p>
        <p className="mt-0.5 text-sm font-semibold leading-tight text-foreground">{t(p.title, "fa")}</p>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted">{t(p.description, "fa")}</p>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-sm font-bold text-foreground">{toman(p.price.fa)} تومان</p>
          {hasDis && <p className="text-xs text-muted line-through">{toman(p.compareAt!.fa)}</p>}
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs text-foreground-secondary hover:bg-background-secondary"><Pencil className="h-3 w-3" />ویرایش</button>
          <button onClick={onDelete} className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" />حذف</button>
        </div>
      </div>
    </div>
  );
}

function ProductEditModal({ product, data, onSave, onClose, isNew }: { product: Product; data: SiteContent; onSave: (p: Product) => void; onClose: () => void; isNew?: boolean }) {
  const [p, setP] = useState<Product>({ ...product });
  const set = (patch: Partial<Product>) => setP(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن محصول جدید" : `ویرایش: ${t(p.title, "fa")}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="عنوان (فارسی)"><FInput value={p.title.fa} onChange={v => set({ title: { ...p.title, fa: v } })} /></FRow>
          <FRow label="عنوان (انگلیسی)"><FInput dir="ltr" value={p.title.en} onChange={v => set({ title: { ...p.title, en: v } })} /></FRow>
          <FRow label="توضیح (فارسی)"><FTextarea value={p.description.fa} onChange={v => set({ description: { ...p.description, fa: v } })} /></FRow>
          <FRow label="توضیح (انگلیسی)"><FTextarea dir="ltr" value={p.description.en} onChange={v => set({ description: { ...p.description, en: v } })} /></FRow>
          <FRow label="SKU"><FInput dir="ltr" value={p.sku} onChange={v => set({ sku: v })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={p.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="قیمت (تومان)"><FNumber value={p.price.fa} onChange={v => set({ price: { ...p.price, fa: v } })} /></FRow>
          <FRow label="قیمت اصلی / تخفیف (تومان)"><FNumber value={p.compareAt?.fa ?? 0} onChange={v => set({ compareAt: { fa: v, en: p.compareAt?.en ?? 0 } })} /></FRow>
          <FRow label="قیمت (دلار)"><FNumber value={p.price.en} onChange={v => set({ price: { ...p.price, en: v } })} /></FRow>
          <FRow label="دسته‌بندی">
            <select value={p.categoryId} onChange={e => set({ categoryId: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
              {data.categories.map(c => <option key={c.id} value={c.id}>{t(c.name, "fa")}</option>)}
            </select>
          </FRow>
          <FRow label="متریال (فارسی)"><FInput value={p.materials.fa} onChange={v => set({ materials: { ...p.materials, fa: v } })} /></FRow>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FCheck label="منتخب" checked={p.featured} onChange={v => set({ featured: v })} />
          <FCheck label="پرفروش" checked={p.bestSeller} onChange={v => set({ bestSeller: v })} />
          <FCheck label="جدید" checked={p.isNew} onChange={v => set({ isNew: v })} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(p)} label={isNew ? "افزودن" : "ذخیره"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر هنرمندان
   ══════════════════════════════════════════════════════════ */
function ArtistsEditor({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<Artist | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const featured = data.artists.filter(a => a.featured);
  const setArtists = (artists: Artist[]) => update({ artists });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="هنرمندان منتخب" count={featured.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"><Plus className="h-3.5 w-3.5" />افزودن هنرمند</button>
      </div>
      {featured.length === 0 ? <EmptyNote msg="هیچ هنرمند منتخبی ندارید." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.artists.map(a => (
            <ArtistCard key={a.id} artist={a}
              onEdit={() => setEditTarget(a)}
              onDelete={() => { if (confirm("حذف شود؟")) setArtists(data.artists.filter(x => x.id !== a.id)); }}
              onToggleFeatured={() => setArtists(data.artists.map(x => x.id === a.id ? { ...x, featured: !x.featured } : x))}
            />
          ))}
        </div>
      )}
      {editTarget && <ArtistEditModal artist={editTarget} onSave={a => { setArtists(data.artists.map(x => x.id === a.id ? a : x)); setEditTarget(null); }} onClose={() => setEditTarget(null)} />}
      {showAdd && <ArtistEditModal artist={newArtist()} onSave={a => { setArtists([...data.artists, a]); setShowAdd(false); }} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function newArtist(): Artist {
  const id = uid();
  return {
    id, slug: `artist-${id}`, name: L("هنرمند جدید", "New Artist"), profession: L("", ""),
    bio: L("", ""), avatar: "/images/artists/niloufar-rad.jpg", cover: "/images/artists/cover-niloufar.jpg",
    location: L("تهران", "Tehran"), social: {}, featured: true, followers: 0, rating: 5, reviewsCount: 0,
  };
}

function ArtistCard({ artist: a, onEdit, onDelete, onToggleFeatured }: { artist: Artist; onEdit: () => void; onDelete: () => void; onToggleFeatured: () => void }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft">
      <div className="relative h-24 overflow-hidden bg-background-secondary">
        <img src={a.cover} alt={t(a.name, "fa")} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50" />
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="relative -mt-8 px-4 pb-4">
        <img src={a.avatar} alt={t(a.name, "fa")} className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-medium" />
        <p className="mt-1 font-semibold text-foreground">{t(a.name, "fa")}</p>
        <p className="text-xs text-muted">{t(a.profession, "fa")}</p>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>⭐ {a.rating}</span>
            <span>{a.followers.toLocaleString("fa-IR")}</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={onToggleFeatured} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", a.featured ? "border-accent bg-accent/10 text-accent" : "border-border text-muted")}>
              {a.featured ? "منتخب" : "غیرمنتخب"}
            </button>
            <button onClick={onEdit} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground-secondary hover:bg-background-secondary"><Pencil className="h-3 w-3" /></button>
            <button onClick={onDelete} className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistEditModal({ artist, onSave, onClose, isNew }: { artist: Artist; onSave: (a: Artist) => void; onClose: () => void; isNew?: boolean }) {
  const [a, setA] = useState<Artist>({ ...artist });
  const set = (patch: Partial<Artist>) => setA(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن هنرمند جدید" : `ویرایش: ${t(a.name, "fa")}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="نام (فارسی)"><FInput value={a.name.fa} onChange={v => set({ name: { ...a.name, fa: v } })} /></FRow>
          <FRow label="نام (انگلیسی)"><FInput dir="ltr" value={a.name.en} onChange={v => set({ name: { ...a.name, en: v } })} /></FRow>
          <FRow label="حرفه (فارسی)"><FInput value={a.profession.fa} onChange={v => set({ profession: { ...a.profession, fa: v } })} /></FRow>
          <FRow label="حرفه (انگلیسی)"><FInput dir="ltr" value={a.profession.en} onChange={v => set({ profession: { ...a.profession, en: v } })} /></FRow>
          <FRow label="بیوگرافی (فارسی)"><FTextarea value={a.bio.fa} onChange={v => set({ bio: { ...a.bio, fa: v } })} /></FRow>
          <FRow label="بیوگرافی (انگلیسی)"><FTextarea dir="ltr" value={a.bio.en} onChange={v => set({ bio: { ...a.bio, en: v } })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={a.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="شهر (فارسی)"><FInput value={a.location.fa} onChange={v => set({ location: { ...a.location, fa: v } })} /></FRow>
          <FRow label="تصویر آواتار"><FInput dir="ltr" value={a.avatar} onChange={v => set({ avatar: v })} /></FRow>
          <FRow label="تصویر کاور"><FInput dir="ltr" value={a.cover} onChange={v => set({ cover: v })} /></FRow>
          <FRow label="اینستاگرام"><FInput dir="ltr" value={a.social.instagram ?? ""} onChange={v => set({ social: { ...a.social, instagram: v || undefined } })} /></FRow>
          <FRow label="بهنس"><FInput dir="ltr" value={a.social.behance ?? ""} onChange={v => set({ social: { ...a.social, behance: v || undefined } })} /></FRow>
          <FRow label="دنبال‌کننده"><FNumber value={a.followers} onChange={v => set({ followers: v })} /></FRow>
          <FRow label="امتیاز"><FNumber value={a.rating} onChange={v => set({ rating: v })} /></FRow>
        </div>
        <FCheck label="هنرمند منتخب (نمایش در صفحه اصلی)" checked={a.featured} onChange={v => set({ featured: v })} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(a)} label={isNew ? "افزودن" : "ذخیره"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر پورتفولیوها
   ══════════════════════════════════════════════════════════ */
function PortfoliosEditor({ sectionKey, data, update }: { sectionKey: HomeSectionKey; data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<Portfolio | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const filtered = sectionKey === "projects" ? data.portfolios.filter(p => p.isProject) : data.portfolios.filter(p => p.featured);
  const setPortfolios = (portfolios: Portfolio[]) => update({ portfolios });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title={sectionKey === "projects" ? "پروژه‌ها" : "پورتفولیوهای منتخب"} count={filtered.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"><Plus className="h-3.5 w-3.5" />افزودن</button>
      </div>
      {filtered.length === 0 ? <EmptyNote msg="موردی ندارید." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <PortfolioCard key={p.id} portfolio={p}
              onEdit={() => setEditTarget(p)}
              onDelete={() => { if (confirm("حذف شود؟")) setPortfolios(data.portfolios.filter(x => x.id !== p.id)); }}
              onToggle={(field) => setPortfolios(data.portfolios.map(x => x.id === p.id ? { ...x, [field]: !x[field] } : x))}
            />
          ))}
        </div>
      )}
      {editTarget && <PortfolioEditModal portfolio={editTarget} data={data} onSave={pf => { setPortfolios(data.portfolios.map(x => x.id === pf.id ? pf : x)); setEditTarget(null); }} onClose={() => setEditTarget(null)} />}
      {showAdd && <PortfolioEditModal portfolio={newPortfolio(data)} data={data} onSave={pf => { setPortfolios([...data.portfolios, pf]); setShowAdd(false); }} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function newPortfolio(data: SiteContent): Portfolio {
  const id = uid();
  return {
    id, slug: `project-${id}`, title: L("پروژه جدید", "New Project"), subtitle: L("", ""), intro: L("", ""),
    story: [], cover: "/images/portfolios/pf-penthouse.jpg", gallery: [],
    artistId: null, patternIds: [], productIds: [],
    client: L("", ""), location: L("تهران", "Tehran"), year: new Date().getFullYear(),
    scope: L("", ""), categoryId: data.categories[0]?.id ?? "",
    featured: true, isProject: true, size: "square",
  };
}

function PortfolioCard({ portfolio: p, onEdit, onDelete, onToggle }: { portfolio: Portfolio; onEdit: () => void; onDelete: () => void; onToggle: (f: "featured" | "isProject") => void }) {
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft">
      <div className="relative aspect-video overflow-hidden bg-background-secondary">
        <img src={p.cover} alt={t(p.title, "fa")} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60" />
        <div className="absolute bottom-0 right-0 p-3">
          <p className="text-sm font-bold text-white">{t(p.title, "fa")}</p>
          <p className="text-xs text-white/70">{t(p.location, "fa")} · {p.year}</p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="px-3 py-3">
        <p className="line-clamp-2 text-xs text-muted">{t(p.intro, "fa")}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button onClick={() => onToggle("featured")} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", p.featured ? "border-accent bg-accent/10 text-accent" : "border-border text-muted")}>منتخب</button>
          <button onClick={() => onToggle("isProject")} className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", p.isProject ? "border-blue-400 bg-blue-50 text-blue-600" : "border-border text-muted")}>پروژه</button>
          <button onClick={onEdit} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground-secondary hover:bg-background-secondary"><Pencil className="h-3 w-3" /></button>
          <button onClick={onDelete} className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>
    </div>
  );
}

function PortfolioEditModal({ portfolio, data, onSave, onClose, isNew }: { portfolio: Portfolio; data: SiteContent; onSave: (p: Portfolio) => void; onClose: () => void; isNew?: boolean }) {
  const [p, setP] = useState<Portfolio>({ ...portfolio });
  const set = (patch: Partial<Portfolio>) => setP(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن پروژه جدید" : `ویرایش: ${t(p.title, "fa")}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="عنوان (فارسی)"><FInput value={p.title.fa} onChange={v => set({ title: { ...p.title, fa: v } })} /></FRow>
          <FRow label="عنوان (انگلیسی)"><FInput dir="ltr" value={p.title.en} onChange={v => set({ title: { ...p.title, en: v } })} /></FRow>
          <FRow label="مقدمه (فارسی)"><FTextarea value={p.intro.fa} onChange={v => set({ intro: { ...p.intro, fa: v } })} /></FRow>
          <FRow label="مقدمه (انگلیسی)"><FTextarea dir="ltr" value={p.intro.en} onChange={v => set({ intro: { ...p.intro, en: v } })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={p.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="تصویر کاور"><FInput dir="ltr" value={p.cover} onChange={v => set({ cover: v })} /></FRow>
          <FRow label="کارفرما (فارسی)"><FInput value={p.client.fa} onChange={v => set({ client: { ...p.client, fa: v } })} /></FRow>
          <FRow label="مکان (فارسی)"><FInput value={p.location.fa} onChange={v => set({ location: { ...p.location, fa: v } })} /></FRow>
          <FRow label="سال"><FNumber value={p.year} onChange={v => set({ year: v })} /></FRow>
          <FRow label="دسته‌بندی">
            <select value={p.categoryId} onChange={e => set({ categoryId: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
              {data.categories.map(c => <option key={c.id} value={c.id}>{t(c.name, "fa")}</option>)}
            </select>
          </FRow>
        </div>
        <div className="flex gap-4">
          <FCheck label="منتخب" checked={p.featured} onChange={v => set({ featured: v })} />
          <FCheck label="پروژه سازمانی" checked={p.isProject} onChange={v => set({ isProject: v })} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(p)} label={isNew ? "افزودن" : "ذخیره"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر سبک‌ها (Categories)
   ══════════════════════════════════════════════════════════ */
function StylesEditor({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const cats = data.categories.slice().sort((a, b) => a.order - b.order);
  const setCats = (categories: Category[]) => update({ categories });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="سبک‌ها / دسته‌بندی‌ها" count={cats.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"><Plus className="h-3.5 w-3.5" />افزودن سبک</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map(c => {
          const patCount = data.patterns.filter(p => p.categoryId === c.id).length;
          return (
            <div key={c.id} className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft">
              <div className="relative aspect-video overflow-hidden">
                <img src={c.image} alt={t(c.name, "fa")} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50" />
                <p className="absolute bottom-2 right-3 text-sm font-bold text-white">{t(c.name, "fa")}</p>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setEditTarget(c)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (patCount > 0) { alert("این سبک در الگوها استفاده می‌شود."); return; } if (confirm("حذف شود؟")) setCats(data.categories.filter(x => x.id !== c.id)); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="line-clamp-1 text-xs text-muted">{t(c.description, "fa")}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-muted">{patCount} الگو</span>
                  <div className="flex gap-1">
                    <button onClick={() => setCats(data.categories.map(x => x.id === c.id ? { ...x, featured: !x.featured } : x))}
                      className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", c.featured ? "border-accent bg-accent/10 text-accent" : "border-border text-muted")}>
                      {c.featured ? "منتخب" : "عادی"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {editTarget && <CategoryEditModal category={editTarget} onSave={c => { setCats(data.categories.map(x => x.id === c.id ? c : x)); setEditTarget(null); }} onClose={() => setEditTarget(null)} />}
      {showAdd && <CategoryEditModal category={newCategory(data)} onSave={c => { setCats([...data.categories, c]); setShowAdd(false); }} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function newCategory(data: SiteContent): Category {
  const id = uid();
  return { id, slug: `new-${id}`, name: L("دسته جدید", "New Category"), description: L("", ""), image: "/images/collections/s01.jpg", featured: true, order: data.categories.length + 1 };
}

function CategoryEditModal({ category, onSave, onClose, isNew }: { category: Category; onSave: (c: Category) => void; onClose: () => void; isNew?: boolean }) {
  const [c, setC] = useState<Category>({ ...category });
  const set = (patch: Partial<Category>) => setC(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن سبک جدید" : `ویرایش: ${t(c.name, "fa")}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="نام (فارسی)"><FInput value={c.name.fa} onChange={v => set({ name: { ...c.name, fa: v }, slug: isNew ? slugify(v) : c.slug })} /></FRow>
          <FRow label="نام (انگلیسی)"><FInput dir="ltr" value={c.name.en} onChange={v => set({ name: { ...c.name, en: v } })} /></FRow>
          <FRow label="توضیح (فارسی)"><FTextarea value={c.description.fa} onChange={v => set({ description: { ...c.description, fa: v } })} /></FRow>
          <FRow label="توضیح (انگلیسی)"><FTextarea dir="ltr" value={c.description.en} onChange={v => set({ description: { ...c.description, en: v } })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={c.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="تصویر"><FInput dir="ltr" value={c.image} onChange={v => set({ image: v })} /></FRow>
        </div>
        <FCheck label="نمایش در صفحه اصلی (featured)" checked={c.featured} onChange={v => set({ featured: v })} />
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(c)} label={isNew ? "افزودن" : "ذخیره"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر فضاها
   ══════════════════════════════════════════════════════════ */
function SpacesEditor({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<Space | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const setSpaces = (spaces: Space[]) => update({ spaces });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="فضاها" count={data.spaces.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"><Plus className="h-3.5 w-3.5" />افزودن فضا</button>
      </div>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {data.spaces.map(s => (
          <div key={s.id} className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft">
            <div className="relative aspect-square overflow-hidden">
              <img src={s.image} alt={t(s.name, "fa")} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50" />
              <p className="absolute bottom-2 right-2 text-xs font-bold text-white">{t(s.name, "fa")}</p>
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setEditTarget(s)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => { if (confirm("حذف شود؟")) setSpaces(data.spaces.filter(x => x.id !== s.id)); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editTarget && <SpaceEditModal space={editTarget} onSave={s => { setSpaces(data.spaces.map(x => x.id === s.id ? s : x)); setEditTarget(null); }} onClose={() => setEditTarget(null)} />}
      {showAdd && <SpaceEditModal space={{ id: uid(), slug: `space-${uid()}`, name: L("فضای جدید", "New Space"), image: "/images/portfolios/pf-bedroom.jpg", order: data.spaces.length + 1 }} onSave={s => { setSpaces([...data.spaces, s]); setShowAdd(false); }} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function SpaceEditModal({ space, onSave, onClose, isNew }: { space: Space; onSave: (s: Space) => void; onClose: () => void; isNew?: boolean }) {
  const [s, setS] = useState<Space>({ ...space });
  const set = (patch: Partial<Space>) => setS(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن فضا" : `ویرایش: ${t(s.name, "fa")}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="نام (فارسی)"><FInput value={s.name.fa} onChange={v => set({ name: { ...s.name, fa: v } })} /></FRow>
          <FRow label="نام (انگلیسی)"><FInput dir="ltr" value={s.name.en} onChange={v => set({ name: { ...s.name, en: v } })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={s.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="تصویر"><FInput dir="ltr" value={s.image} onChange={v => set({ image: v })} /></FRow>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(s)} label={isNew ? "افزودن" : "ذخیره"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر آموزش
   ══════════════════════════════════════════════════════════ */
function EducationEditor({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<EducationItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const featured = data.education.filter(e => e.featured);
  const setEdu = (education: EducationItem[]) => update({ education });
  const diffLabel: Record<string, string> = { beginner: "مقدماتی", intermediate: "متوسط", advanced: "پیشرفته" };
  const typeLabel: Record<string, string> = { course: "دوره", tutorial: "آموزش", article: "مقاله", path: "مسیر" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="آموزش‌های منتخب" count={featured.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"><Plus className="h-3.5 w-3.5" />افزودن آموزش</button>
      </div>
      {featured.length === 0 ? <EmptyNote msg="آموزش منتخبی ندارید." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.education.map(e => (
            <div key={e.id} className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft">
              <div className="relative aspect-video overflow-hidden bg-background-secondary">
                <img src={e.image} alt={t(e.title, "fa")} className="h-full w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <Badge color="blue">{typeLabel[e.type] ?? e.type}</Badge>
                  <Badge color="purple">{diffLabel[e.difficulty] ?? e.difficulty}</Badge>
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setEditTarget(e)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm("حذف شود؟")) setEdu(data.education.filter(x => x.id !== e.id)); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-foreground">{t(e.title, "fa")}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{t(e.excerpt, "fa")}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-muted"><span>{e.durationMin} دقیقه</span><span>{e.lessons} درس</span></div>
                  <div className="flex gap-1">
                    <button onClick={() => setEdu(data.education.map(x => x.id === e.id ? { ...x, featured: !x.featured } : x))}
                      className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", e.featured ? "border-accent bg-accent/10 text-accent" : "border-border text-muted")}>
                      {e.featured ? "منتخب" : "عادی"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editTarget && <EducationEditModal item={editTarget} data={data} onSave={item => { setEdu(data.education.map(x => x.id === item.id ? item : x)); setEditTarget(null); }} onClose={() => setEditTarget(null)} />}
      {showAdd && <EducationEditModal item={newEducation(data)} data={data} onSave={item => { setEdu([...data.education, item]); setShowAdd(false); }} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function newEducation(data: SiteContent): EducationItem {
  const id = uid();
  return {
    id, slug: `course-${id}`, type: "course", title: L("دوره جدید", "New Course"), excerpt: L("", ""), body: L("", ""),
    image: "/images/patterns/p01.jpg", authorId: data.artists[0]?.id ?? "", difficulty: "beginner",
    durationMin: 60, lessons: 5, categoryId: data.categories[0]?.id ?? "",
    patternIds: [], productIds: [], featured: true, popular: false,
    publishedAt: new Date().toISOString().slice(0, 10),
  };
}

function EducationEditModal({ item, data, onSave, onClose, isNew }: { item: EducationItem; data: SiteContent; onSave: (e: EducationItem) => void; onClose: () => void; isNew?: boolean }) {
  const [e, setE] = useState<EducationItem>({ ...item });
  const set = (patch: Partial<EducationItem>) => setE(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن آموزش جدید" : `ویرایش: ${t(e.title, "fa")}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="عنوان (فارسی)"><FInput value={e.title.fa} onChange={v => set({ title: { ...e.title, fa: v } })} /></FRow>
          <FRow label="عنوان (انگلیسی)"><FInput dir="ltr" value={e.title.en} onChange={v => set({ title: { ...e.title, en: v } })} /></FRow>
          <FRow label="خلاصه (فارسی)"><FTextarea value={e.excerpt.fa} onChange={v => set({ excerpt: { ...e.excerpt, fa: v } })} /></FRow>
          <FRow label="خلاصه (انگلیسی)"><FTextarea dir="ltr" value={e.excerpt.en} onChange={v => set({ excerpt: { ...e.excerpt, en: v } })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={e.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="تصویر"><FInput dir="ltr" value={e.image} onChange={v => set({ image: v })} /></FRow>
          <FRow label="نوع">
            <select value={e.type} onChange={ev => set({ type: ev.target.value as EducationItem["type"] })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
              <option value="course">دوره</option><option value="tutorial">آموزش</option><option value="article">مقاله</option><option value="path">مسیر</option>
            </select>
          </FRow>
          <FRow label="سطح">
            <select value={e.difficulty} onChange={ev => set({ difficulty: ev.target.value as EducationItem["difficulty"] })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
              <option value="beginner">مقدماتی</option><option value="intermediate">متوسط</option><option value="advanced">پیشرفته</option>
            </select>
          </FRow>
          <FRow label="مدت (دقیقه)"><FNumber value={e.durationMin} onChange={v => set({ durationMin: v })} /></FRow>
          <FRow label="تعداد درس"><FNumber value={e.lessons} onChange={v => set({ lessons: v })} /></FRow>
        </div>
        <div className="flex gap-4">
          <FCheck label="منتخب" checked={e.featured} onChange={v => set({ featured: v })} />
          <FCheck label="محبوب" checked={e.popular} onChange={v => set({ popular: v })} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(e)} label={isNew ? "افزودن" : "ذخیره"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   ویرایشگر داستان‌ها
   ══════════════════════════════════════════════════════════ */
function StoriesEditor({ data, update }: { data: SiteContent; update: (p: Partial<SiteContent>) => void }) {
  const [editTarget, setEditTarget] = useState<Story | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const setStories = (stories: Story[]) => update({ stories });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="داستان‌های هنرمندان" count={data.stories.length} />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"><Plus className="h-3.5 w-3.5" />افزودن داستان</button>
      </div>
      {data.stories.length === 0 ? <EmptyNote msg="داستانی ثبت نشده." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.stories.map(s => (
            <div key={s.id} className="group overflow-hidden rounded-xl border border-border bg-white shadow-soft">
              <div className="relative aspect-video overflow-hidden bg-background-secondary">
                <img src={s.image} alt={t(s.title, "fa")} className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button onClick={() => setEditTarget(s)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-foreground hover:bg-accent hover:text-white"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm("حذف شود؟")) setStories(data.stories.filter(x => x.id !== s.id)); }} className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-error hover:bg-error hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm">{t(s.title, "fa")}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{t(s.excerpt, "fa")}</p>
                <p className="mt-1.5 text-[10px] text-muted">{new Date(s.publishedAt).toLocaleDateString("fa-IR")}</p>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setEditTarget(s)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs text-foreground-secondary hover:bg-background-secondary"><Pencil className="h-3 w-3" />ویرایش</button>
                  <button onClick={() => { if (confirm("حذف شود؟")) setStories(data.stories.filter(x => x.id !== s.id)); }} className="flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" />حذف</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {editTarget && <StoryEditModal story={editTarget} data={data} onSave={s => { setStories(data.stories.map(x => x.id === s.id ? s : x)); setEditTarget(null); }} onClose={() => setEditTarget(null)} />}
      {showAdd && <StoryEditModal story={{ id: uid(), slug: `story-${uid()}`, artistId: data.artists[0]?.id ?? "", title: L("داستان جدید", "New Story"), excerpt: L("", ""), body: L("", ""), image: "/images/patterns/p01.jpg", publishedAt: new Date().toISOString().slice(0, 10) }} data={data} onSave={s => { setStories([...data.stories, s]); setShowAdd(false); }} onClose={() => setShowAdd(false)} isNew />}
    </div>
  );
}

function StoryEditModal({ story, data, onSave, onClose, isNew }: { story: Story; data: SiteContent; onSave: (s: Story) => void; onClose: () => void; isNew?: boolean }) {
  const [s, setS] = useState<Story>({ ...story });
  const set = (patch: Partial<Story>) => setS(prev => ({ ...prev, ...patch }));
  return (
    <Modal title={isNew ? "افزودن داستان جدید" : `ویرایش: ${t(s.title, "fa")}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <FRow label="عنوان (فارسی)"><FInput value={s.title.fa} onChange={v => set({ title: { ...s.title, fa: v } })} /></FRow>
          <FRow label="عنوان (انگلیسی)"><FInput dir="ltr" value={s.title.en} onChange={v => set({ title: { ...s.title, en: v } })} /></FRow>
          <FRow label="خلاصه (فارسی)"><FTextarea value={s.excerpt.fa} onChange={v => set({ excerpt: { ...s.excerpt, fa: v } })} /></FRow>
          <FRow label="خلاصه (انگلیسی)"><FTextarea dir="ltr" value={s.excerpt.en} onChange={v => set({ excerpt: { ...s.excerpt, en: v } })} /></FRow>
          <FRow label="Slug"><FInput dir="ltr" value={s.slug} onChange={v => set({ slug: v })} /></FRow>
          <FRow label="تصویر"><FInput dir="ltr" value={s.image} onChange={v => set({ image: v })} /></FRow>
          <FRow label="هنرمند">
            <select value={s.artistId} onChange={e => set({ artistId: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent">
              {data.artists.map(a => <option key={a.id} value={a.id}>{t(a.name, "fa")}</option>)}
            </select>
          </FRow>
          <FRow label="تاریخ انتشار"><FInput dir="ltr" value={s.publishedAt} onChange={v => set({ publishedAt: v })} placeholder="2025-01-01" /></FRow>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <CancelBtn onClick={onClose} />
          <SaveBtn onClick={() => onSave(s)} label={isNew ? "افزودن" : "ذخیره"} />
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   بنر ثابت
   ══════════════════════════════════════════════════════════ */
function StaticBannerInfo({ sectionKey }: { sectionKey: HomeSectionKey }) {
  const map: Record<string, { title: string; desc: string }> = {
    b2b:        { title: "بنر پروژه‌های سازمانی", desc: "این یک بنر ثابت است. برای ویرایش متن، به تب «بنرها» بروید." },
    custom:     { title: "بنر تولید سفارشی",     desc: "این یک بنر ثابت است. برای ویرایش متن، به تب «بنرها» بروید." },
    newsletter: { title: "فرم خبرنامه",           desc: "این بخش یک فرم ثابت است و محتوای قابل ویرایش در پنل ندارد." },
  };
  const info = map[sectionKey]!;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      <div>
        <p className="font-semibold text-blue-800">{info.title}</p>
        <p className="mt-0.5 text-blue-700">{info.desc}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   کامپوننت‌های کمکی
   ══════════════════════════════════════════════════════════ */
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">{title}</p>
      {count !== undefined && <span className="rounded-full border border-border bg-background-secondary px-2 py-0.5 text-[10px] font-medium text-muted">{count}</span>}
    </div>
  );
}

function Badge({ color, children, className }: { color: "green" | "blue" | "amber" | "purple" | "red"; children: React.ReactNode; className?: string }) {
  const colors = { green: "bg-green-500/90 text-white", blue: "bg-blue-500/90 text-white", amber: "bg-amber-500/90 text-white", purple: "bg-purple-500/90 text-white", red: "bg-red-500/90 text-white" };
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", colors[color], className)}>{children}</span>;
}

function EmptyNote({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-background-secondary/50 p-4 text-sm text-muted">
      <span className="text-base">📭</span>{msg}
    </div>
  );
}
