"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  BookOpen,
  CalendarClock,
  Check,
  ChevronLeft,
  FileText,
  Frame,
  GalleryHorizontalEnd,
  Home,
  Image,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  ArrowUpLeft,
  SlidersHorizontal,
  Tag,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";
import { LiveDashboard } from "@/components/admin/LiveDashboard";
import { HomeSectionsManager } from "@/components/admin/HomeSectionsManager";
import { PatternsManager } from "@/components/admin/PatternsManager";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { BuyersManager } from "@/components/admin/BuyersManager";
import { ArtistsSignupManager } from "@/components/admin/ArtistsSignupManager";
import { ArtistsManager } from "@/components/admin/ArtistsManager";
import { PortfoliosManager } from "@/components/admin/PortfoliosManager";
import { AcademyManager } from "@/components/admin/AcademyManager";
import { ReservationsManager } from "@/components/admin/ReservationsManager";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { Badge } from "@/components/ui/Badge";
import { SESSION_FETCH } from "@/lib/http";
import { cn, href, slugify, t } from "@/lib/utils";
import type { AnnouncementBarConfig, AnnouncementBarDirection, AnnouncementBarKind, AnnouncementBarMotion, AnnouncementBarTransition, Banner, Category, EducationItem, HeroContent, HomeSectionKey, SeoMeta, SiteContent } from "@/lib/types";
import type { Localized } from "@/lib/i18n/types";

type Section =
  | "dashboard"
  | "buyers"
  | "reservations"
  | "artists-signup"
  | "home"
  | "hero"
  | "categories"
  | "patterns"
  | "products"
  | "artists"
  | "portfolios"
  | "education"
  | "banners"
  | "seo"
  | "announcement-bars"
  | "marketplace";

/* برچسب‌های فارسی بخش‌های صفحه اصلی */
const SECTION_LABELS: Record<HomeSectionKey, string> = {
  hero: "هیرو (بنر اصلی)",
  discovery: "کشف الگو",
  trending: "پرطرفدارها",
  bestSellers: "پرفروش‌ترین‌ها",
  newPatterns: "الگوهای جدید",
  artists: "هنرمندان منتخب",
  portfolios: "پورتفولیوهای منتخب",
  styles: "کاوش بر اساس سبک",
  spaces: "کاوش بر اساس فضا",
  exclusive: "کالکشن اختصاصی",
  projects: "پروژه‌های منتخب",
  education: "آکادمی",
  b2b: "پروژه‌های سازمانی",
  custom: "تولید سفارشی",
  stories: "روایت هنرمندان",
  newsletter: "خبرنامه",
};

const REDIRECT_GRACE_MS = 300;

class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

async function adminFetch<T>(init?: RequestInit): Promise<T> {
  const r = await fetch("/api/admin/content", { ...SESSION_FETCH, ...init });
  if (r.status === 401) throw new UnauthorizedError();
  if (!r.ok) throw new Error(`admin/content → ${r.status}`);
  return (await r.json()) as T;
}

/* ============================================================
   تعریف منوی کناری
   ============================================================ */
interface NavGroup {
  label: string;
  /** `href` turns an entry into a link to another admin screen (own route). */
  items: { id: Section; label: string; icon: React.ReactNode; badge?: string; href?: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "نمای کلی",
    items: [{ id: "dashboard", label: "داشبورد", icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
  {
    label: "ثبت‌نام‌کننده‌ها",
    items: [
      { id: "buyers", label: "خریداران", icon: <ShoppingBag className="h-4 w-4" /> },
      { id: "reservations", label: "رزرو رویدادها", icon: <CalendarClock className="h-4 w-4" /> },
      { id: "artists-signup", label: "هنرمندان / طراحان", icon: <Palette className="h-4 w-4" /> },
    ],
  },
  {
    label: "محتوا",
    items: [
      { id: "home", label: "صفحه اصلی", icon: <Home className="h-4 w-4" /> },
      { id: "hero", label: "بنر هیرو", icon: <Image className="h-4 w-4" /> },
      { id: "banners", label: "بنرها", icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    label: "کاتالوگ",
    items: [
      {
        id: "marketplace",
        label: "فایل دیجیتال (فروشگاه)",
        icon: <Sparkles className="h-4 w-4" />,
        href: "/admin/fa/marketplace",
      },
      { id: "categories", label: "دسته‌بندی‌ها", icon: <Tag className="h-4 w-4" /> },
      { id: "patterns", label: "پترن‌ها", icon: <Palette className="h-4 w-4" /> },
      { id: "products", label: "محصولات", icon: <ShoppingBag className="h-4 w-4" /> },
    ],
  },
  {
    label: "جامعه",
    items: [
      { id: "artists", label: "هنرمندان", icon: <Users className="h-4 w-4" /> },
      { id: "portfolios", label: "پورتفولیوها", icon: <GalleryHorizontalEnd className="h-4 w-4" /> },
      { id: "education", label: "آکادمی", icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
  {
    label: "تنظیمات",
    items: [
      { id: "seo", label: "متادیتای SEO", icon: <Settings2 className="h-4 w-4" /> },
      { id: "announcement-bars", label: "نوار اعلان", icon: <Megaphone className="h-4 w-4" /> },
    ],
  },
];

/* ============================================================
   پوسته اصلی پنل ادمین
   ============================================================ */
export function AdminApp() {
  const { user, ready } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const [data, setData] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<Section>("dashboard");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [dirty, setDirty] = useState(false);
  const [loadError, setLoadError] = useState<"unauthorized" | "error" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingArtistCount, setPendingArtistCount] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      setData(await adminFetch<SiteContent>({ signal }));
    } catch (e) {
      if (signal?.aborted) return;
      setLoadError(e instanceof UnauthorizedError ? "unauthorized" : "error");
    }
  }, []);

  /** Fetch pending artist count for the sidebar badge */
  const loadPendingCount = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await fetch("/api/admin/artists", { credentials: "include", cache: "no-store", signal });
      if (!r.ok) return;
      const j = (await r.json()) as { ok: boolean; artists: { status?: string }[] };
      const count = (j.artists ?? []).filter((a) => !a.status || a.status === "pending").length;
      setPendingArtistCount(count);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    if (!ready || user !== null || loadError === "unauthorized") return;
    const id = window.setTimeout(
      () => router.replace(`/admin/${locale}/login`),
      REDIRECT_GRACE_MS,
    );
    return () => window.clearTimeout(id);
  }, [ready, user, loadError, router, locale]);

  useEffect(() => {
    if (!ready || user?.role !== "admin") return;
    const ac = new AbortController();
    void load(ac.signal);
    void loadPendingCount(ac.signal);
    return () => ac.abort();
  }, [ready, user, load, loadPendingCount]);

  const update = useCallback((patch: Partial<SiteContent>) => {
    setData((d) => (d ? { ...d, ...patch } : d));
    setDirty(true);
  }, []);

  const save = async () => {
    if (!data) return;
    setStatus("saving");
    try {
      await adminFetch<{ ok: true }>({
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      setStatus("ok");
      setDirty(false);
      router.refresh();
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        setStatus("idle");
        setLoadError("unauthorized");
      } else {
        setStatus("error");
      }
    }
  };

  const reset = async () => {
    if (!confirm("آیا مطمئن هستید؟ تمام تغییرات ادمین حذف شده و محتوای اولیه بازگردانده می‌شود."))
      return;
    try {
      await adminFetch<{ ok: true }>({ method: "DELETE" });
      setData(await adminFetch<SiteContent>());
      setDirty(false);
      setLoadError(null);
      router.refresh();
    } catch (e) {
      if (e instanceof UnauthorizedError) setLoadError("unauthorized");
      else setStatus("error");
    }
  };

  if (user && user.role !== "admin") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-8">
        <ErrorState message="این حساب کاربری دسترسی ادمین ندارد. با ایمیل admin@… وارد شوید." />
      </div>
    );
  }

  const activeLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === section)?.label ?? "داشبورد";

  return (
    <div className="flex min-h-screen bg-[#f0f2f5]" dir="rtl">
      {/* پوشش پس‌زمینه (موبایل) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── نوار کناری ── */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-64 flex-col bg-[#1e2230] text-white transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        {/* برند */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white">
            <Frame className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">رزی آتلیه</p>
            <p className="text-[11px] text-white/50">پنل مدیریت</p>
          </div>
          <button className="mr-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* منو */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = section === item.id;
                const classes = cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent/90 text-white font-medium"
                    : "text-white/65 hover:bg-white/[0.08] hover:text-white",
                );
                if (item.href) {
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      className={classes}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="shrink-0 text-white/50">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                      <ArrowUpLeft className="mr-auto h-3.5 w-3.5 text-white/40" />
                    </a>
                  );
                }
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={classes}
                  >
                    <span className={cn("shrink-0", active ? "text-white" : "text-white/50")}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {(item.badge || (item.id === "artists-signup" && pendingArtistCount > 0)) && (
                      <span className="mr-auto rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {item.id === "artists-signup" ? pendingArtistCount : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* پاورقی کاربر */}
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/30 text-xs font-semibold text-accent">
              {user?.name?.charAt(0) ?? "م"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user?.name ?? "ادمین"}</p>
              <p className="truncate text-[11px] text-white/40">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={() => router.push(`/admin/${locale}/login`)}
              className="text-white/40 hover:text-white"
              title="خروج از حساب"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── ناحیه محتوای اصلی ── */}
      <div className="flex min-w-0 flex-1 flex-col lg:mr-64">
        {/* نوار بالا */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#e2e6ea] bg-white px-4 md:px-6">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-secondary lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* مسیرنما */}
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <span className="hidden text-foreground-secondary sm:inline">مدیریت</span>
            <ChevronLeft className="hidden h-3.5 w-3.5 text-muted sm:inline" />
            <span className="truncate font-medium text-foreground">{activeLabel}</span>
          </div>

          <div className="mr-auto flex items-center gap-2">
            {/* وضعیت ذخیره */}
            {status === "ok" && (
              <span className="hidden items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                ذخیره شد
              </span>
            )}
            {status === "error" && (
              <span className="rounded-full bg-error/10 px-3 py-1 text-xs font-medium text-error">
                خطا در ذخیره
              </span>
            )}
            {dirty && status === "idle" && (
              <span className="hidden rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning sm:inline">
                تغییرات ذخیره نشده
              </span>
            )}

            <button className="flex h-8 w-8 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-secondary">
              <Bell className="h-4 w-4" />
            </button>

            <button className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-foreground-secondary hover:bg-background-secondary">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">جستجو…</span>
            </button>

            <button
              onClick={reset}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-foreground-secondary hover:bg-background-secondary"
              title="بازگرداندن به محتوای اولیه"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">بازنشانی</span>
            </button>

            <button
              onClick={save}
              disabled={!dirty || status === "saving"}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                dirty && status !== "saving"
                  ? "bg-[#1e2230] text-white hover:bg-[#2a3045]"
                  : "cursor-not-allowed bg-[#1e2230]/30 text-white/50",
              )}
            >
              <Save className="h-3.5 w-3.5" />
              {status === "saving" ? "در حال ذخیره…" : "ذخیره"}
            </button>
          </div>
        </header>

        {/* بدنه صفحه */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {loadError === "unauthorized" ? (
            <div className="max-w-lg space-y-3">
              <ErrorState
                message="سرور ۴۰۱ برگرداند — نشست ادمین منقضی شده. دوباره وارد شوید."
                onRetry={() => void load()}
              />
              <p className="text-center text-sm text-muted">
                <Link
                  href={`/admin/${locale}/login`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  رفتن به صفحه ورود
                </Link>
              </p>
            </div>
          ) : loadError === "error" ? (
            <ErrorState
              message="ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید."
              onRetry={() => void load()}
            />
          ) : !data ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : (
            <div key={section} className="anim-fade-up">
              {section === "dashboard" && <LiveDashboard data={data} setSection={setSection} />}
              {section === "buyers" && <BuyersManager />}
              {section === "reservations" && <ReservationsManager />}
              {section === "artists-signup" && <ArtistsSignupManager />}
              {section === "home" && <HomeSectionsManager data={data} update={update} />}
              {section === "hero" && (
                <HeroEditor
                  hero={data.hero}
                  patterns={data.patterns}
                  onChange={(hero) => update({ hero })}
                />
              )}
              {section === "categories" && <CategoriesEditor data={data} update={update} />}
              {section === "patterns" && (
                <PatternsManager data={data} update={update} />
              )}
              {section === "products" && (
                <ProductsManager data={data} update={update} />
              )}
              {section === "artists" && (
                <ArtistsManager data={data} update={update} locale={locale} />
              )}
              {section === "portfolios" && (
                <PortfoliosManager data={data} update={update} locale={locale} />
              )}
              {section === "education" && (
                <AcademyManager data={data} update={update} locale={locale} />
              )}
              {section === "banners" && (
                <BannersEditor
                  banners={data.banners}
                  onChange={(banners) => update({ banners })}
                />
              )}
              {section === "seo" && (
                <SeoEditor seo={data.seo} onChange={(seo) => update({ seo })} />
              )}
              {section === "announcement-bars" && (
                <AnnouncementBarsManager
                  bars={data.announcementBars ?? []}
                  education={data.education}
                  onChange={(announcementBars) => update({ announcementBars })}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ============================================================
   بخش‌های صفحه اصلی
   ============================================================ */
/* ============================================================
   ویرایشگر هیرو
   ============================================================ */
function HeroEditor({
  hero,
  patterns,
  onChange,
}: {
  hero: HeroContent;
  patterns: SiteContent["patterns"];
  onChange: (h: HeroContent) => void;
}) {
  const set = <K extends keyof HeroContent>(k: K, v: HeroContent[K]) =>
    onChange({ ...hero, [k]: v });

  /* new bg image URL input state */
  const [newImg, setNewImg] = useState("");
  const newImgRef = useRef<HTMLInputElement>(null);

  const images: string[] = hero.images ?? (hero.image ? [hero.image] : []);

  const addImage = () => {
    const url = newImg.trim();
    if (!url) return;
    set("images", [...images, url]);
    setNewImg("");
    newImgRef.current?.focus();
  };

  const removeImage = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    set("images", next.length > 0 ? next : undefined);
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    const next = images.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    set("images", next);
  };

  /* toggle helpers */
  const parallaxEnabled = hero.parallaxEnabled !== false;
  const interactiveEnabled = hero.interactiveEnabled !== false;
  const sliderMode = hero.sliderMode === true;

  return (
    <div className="space-y-6">
      {/* ── متن ── */}
      <Card title="متن بنر هیرو" desc="عنوان اصلی و توضیح نمایش داده‌شده در بنر بالای صفحه.">
        <LocalizedField label="سرعنوان کوچک" value={hero.eyebrow} onChange={(v) => set("eyebrow", v)} />
        <LocalizedField label="عنوان خط اول" value={hero.titleA} onChange={(v) => set("titleA", v)} />
        <LocalizedField label="عنوان خط دوم" value={hero.titleB} onChange={(v) => set("titleB", v)} />
        <LocalizedField label="توضیحات" value={hero.description} onChange={(v) => set("description", v)} textarea />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="لینک دکمه اول (CTA)">
            <Input dir="ltr" value={hero.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} />
          </Field>
          <Field label="لینک دکمه دوم">
            <Input dir="ltr" value={hero.cta2Href} onChange={(e) => set("cta2Href", e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* ── تصاویر پس‌زمینه ── */}
      <Card
        title="تصاویر پس‌زمینه هیرو"
        desc="هر تصویر یک اسلاید می‌سازد. ترتیب با دکمه‌های جابجایی تغییر می‌کند."
        action={
          <span className="rounded-full border border-border bg-background-secondary px-2.5 py-1 text-xs font-medium text-muted">
            {images.length} تصویر
          </span>
        }
      >
        {/* پیش‌نمایش تصاویر موجود */}
        {images.length > 0 && (
          <div className="mb-4 space-y-2">
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-background-secondary p-2"
              >
                {/* تصویر پیش‌نمایش */}
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-[#0d1117]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`تصویر ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = "0";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/40">
                    {i + 1}
                  </div>
                </div>
                {/* مسیر */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground" dir="ltr">{src}</p>
                  <p className="mt-0.5 text-[11px] text-muted">اسلاید {i + 1}</p>
                </div>
                {/* ابزار */}
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="بالا"
                    disabled={i === 0}
                    onClick={() => moveImage(i, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-background hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="پایین"
                    disabled={i === images.length - 1}
                    onClick={() => moveImage(i, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-background hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="حذف"
                    onClick={() => removeImage(i)}
                    className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* افزودن تصویر جدید */}
        <div className="flex gap-2">
          <input
            ref={newImgRef}
            dir="ltr"
            value={newImg}
            onChange={(e) => setNewImg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addImage()}
            placeholder="/images/hero/hero-bg-05.jpg"
            className="h-11 flex-1 rounded-md border border-border bg-surface px-3.5 text-sm text-foreground placeholder:text-muted transition-[border-color,box-shadow] duration-200 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
          />
          <button
            type="button"
            onClick={addImage}
            disabled={!newImg.trim()}
            className="flex h-11 items-center gap-1.5 rounded-md border border-border bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            افزودن
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          اگر ۲ یا بیشتر تصویر داشته باشید، حالت اسلایدشو فعال می‌شود. تصویر اول به‌عنوان fallback نمایش داده می‌شود.
        </p>

        {/* مسیر ویدیو */}
        <div className="mt-4 border-t border-border pt-4">
          <Field label="مسیر ویدیو پس‌زمینه (اختیاری — جایگزین تصاویر می‌شود)">
            <Input
              dir="ltr"
              value={hero.video ?? ""}
              onChange={(e) => set("video", e.target.value || undefined)}
              placeholder="/videos/hero.mp4"
            />
          </Field>
        </div>
      </Card>

      {/* ── تنظیمات نمایش ── */}
      <Card
        title="تنظیمات نمایش و رفتار"
        desc="حالت اسلایدر، پارالاکس و تعاملی‌بودن کارت الگو."
      >
        <div className="space-y-3">
          {/* slider mode */}
          <ToggleRow
            icon={<SlidersHorizontal className="h-4 w-4" />}
            label="حالت اسلایدر (تایمر خودکار)"
            desc="تصاویر به‌جای حرکت با اسکرول، با تایمر خودکار جابجا می‌شوند."
            checked={sliderMode}
            onChange={(v) => set("sliderMode", v)}
          />
          {/* parallax */}
          <ToggleRow
            icon={<Monitor className="h-4 w-4" />}
            label="افکت پارالاکس اسکرول"
            desc="حرکت ملایم لایه پس‌زمینه هنگام اسکرول (غیرفعال = کمتر پردازش)."
            checked={parallaxEnabled}
            onChange={(v) => set("parallaxEnabled", v)}
          />
          {/* interactive */}
          <ToggleRow
            icon={<Zap className="h-4 w-4" />}
            label="کنترل تعاملی اسلاید"
            desc="کاربر می‌تواند روی نوار پیشرفت کلیک کند تا اسلاید انتخاب کند."
            checked={interactiveEnabled}
            onChange={(v) => set("interactiveEnabled", v)}
          />
        </div>
      </Card>

      {/* ── الگوهای پیش‌نمایش ── */}
      <Card
        title="الگوهای پیش‌نمایش (کارت سمت راست)"
        desc="الگوهایی که در کارت شناور سمت راست هیرو نمایش داده می‌شوند. ترتیب انتخاب اهمیت دارد."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((p) => {
            const on = hero.featuredPatternIds.includes(p.id);
            const order = hero.featuredPatternIds.indexOf(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  set(
                    "featuredPatternIds",
                    on
                      ? hero.featuredPatternIds.filter((x) => x !== p.id)
                      : [...hero.featuredPatternIds, p.id],
                  )
                }
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl border p-3 text-start transition-all",
                  on
                    ? "border-foreground bg-foreground/5 ring-1 ring-foreground/20"
                    : "border-border hover:border-foreground-secondary",
                )}
              >
                {/* پیش‌نمایش تصویر */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t(p.title, "fa")}</p>
                  <p className="text-[11px] text-muted" dir="ltr">{p.sku}</p>
                </div>
                {on && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
                    {order + 1}
                  </span>
                )}
                {!on && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] text-muted group-hover:border-foreground-secondary">
                    +
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {hero.featuredPatternIds.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2">
            <Check className="h-3.5 w-3.5 shrink-0 text-success" />
            <p className="text-xs text-muted">
              {hero.featuredPatternIds.length} الگو انتخاب شده — ترتیب انتخاب = ترتیب نمایش در کارت
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── ردیف تاگل ── */
function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        checked ? "border-foreground/20 bg-foreground/5" : "border-border bg-background-secondary",
      )}
    >
      <div className={cn("mt-0.5 shrink-0", checked ? "text-foreground" : "text-muted")}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-foreground" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left] duration-200",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

/* ============================================================
   ویرایشگر دسته‌بندی‌ها
   ============================================================ */
function CategoriesEditor({
  data,
  update,
}: {
  data: SiteContent;
  update: (p: Partial<SiteContent>) => void;
}) {
  const cats = data.categories.slice().sort((a, b) => a.order - b.order);
  const setCat = (id: string, patch: Partial<Category>) =>
    update({ categories: data.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const move = (id: string, dir: -1 | 1) => {
    const sorted = data.categories.slice().sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === id);
    const j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    const next = sorted.map((c, i) => ({
      ...c,
      order: i === idx ? sorted[j].order : i === j ? sorted[idx].order : c.order,
    }));
    update({ categories: next });
  };

  const add = () => {
    const id = `c-${Date.now().toString(36)}`;
    update({
      categories: [
        ...data.categories,
        {
          id,
          slug: `new-${id}`,
          name: { fa: "دسته جدید", en: "New category" },
          description: { fa: "", en: "" },
          image: "/images/collections/s01.jpg",
          featured: false,
          order: data.categories.length + 1,
        },
      ],
    });
  };
  const remove = (id: string) => {
    if (data.patterns.some((p) => p.categoryId === id))
      return alert("این دسته‌بندی در الگوها استفاده می‌شود و قابل حذف نیست.");
    update({ categories: data.categories.filter((c) => c.id !== id) });
  };

  return (
    <Card
      title="دسته‌بندی‌ها / سبک‌ها"
      desc="مدیریت ساختار سبک‌شناسی که توسط الگوها، محصولات و بخش سبک‌ها استفاده می‌شود."
      action={
        <Button size="sm" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
          افزودن دسته
        </Button>
      }
    >
      {cats.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background-secondary">
            <Tag className="h-5 w-5 text-muted" />
          </div>
          <p className="text-sm font-medium text-foreground">هنوز دسته‌ای ایجاد نشده</p>
          <p className="text-xs text-muted">با کلیک روی «افزودن دسته» اولین دسته‌بندی را بسازید.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cats.map((c, idx) => {
            const patternCount = data.patterns.filter((p) => p.categoryId === c.id).length;
            return (
              <li
                key={c.id}
                className="overflow-hidden rounded-xl border border-border bg-background"
              >
                {/* ── نوار بالایی: پیش‌نمایش + شناسه + کنترل‌ها ── */}
                <div className="flex items-center gap-3 border-b border-border bg-background-secondary/50 px-4 py-2.5">
                  {/* تصویر پیش‌نمایش */}
                  <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-[#0d1117]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.image}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0";
                      }}
                    />
                  </div>

                  {/* نام + ترتیب */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.name.fa || "بدون نام"}
                    </p>
                    <p className="truncate text-[11px] text-muted" dir="ltr">
                      /{c.slug}
                    </p>
                  </div>

                  {/* بج الگوها */}
                  <Badge tone="outline">{patternCount} الگو</Badge>

                  {/* ترتیب */}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="بالا"
                      disabled={idx === 0}
                      onClick={() => move(c.id, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-background hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="پایین"
                      disabled={idx === cats.length - 1}
                      onClick={() => move(c.id, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-background hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => remove(c.id)}
                      className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* ── بدنه: فیلدها ── */}
                <div className="p-4">
                  {/* نام دوزبانه */}
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <Field label="نام (فارسی)">
                      <Input
                        dir="rtl"
                        value={c.name.fa}
                        onChange={(e) => setCat(c.id, { name: { ...c.name, fa: e.target.value } })}
                      />
                    </Field>
                    <Field label="نام (انگلیسی)">
                      <Input
                        dir="ltr"
                        value={c.name.en}
                        onChange={(e) =>
                          setCat(c.id, {
                            name: { ...c.name, en: e.target.value },
                            slug: c.slug.startsWith("new-") ? slugify(e.target.value) : c.slug,
                          })
                        }
                      />
                    </Field>
                  </div>

                  {/* توضیحات دوزبانه */}
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <Field label="توضیحات (فارسی)">
                      <Input
                        dir="rtl"
                        value={c.description?.fa ?? ""}
                        onChange={(e) =>
                          setCat(c.id, {
                            description: { ...(c.description ?? { fa: "", en: "" }), fa: e.target.value },
                          })
                        }
                      />
                    </Field>
                    <Field label="توضیحات (انگلیسی)">
                      <Input
                        dir="ltr"
                        value={c.description?.en ?? ""}
                        onChange={(e) =>
                          setCat(c.id, {
                            description: { ...(c.description ?? { fa: "", en: "" }), en: e.target.value },
                          })
                        }
                      />
                    </Field>
                  </div>

                  {/* Slug + تصویر */}
                  <div className="mb-3 grid gap-3 sm:grid-cols-2">
                    <Field label="Slug (URL)">
                      <Input
                        dir="ltr"
                        value={c.slug}
                        onChange={(e) => setCat(c.id, { slug: e.target.value })}
                        placeholder="category-slug"
                      />
                    </Field>
                    <Field label="مسیر تصویر">
                      <Input
                        dir="ltr"
                        value={c.image}
                        onChange={(e) => setCat(c.id, { image: e.target.value })}
                        placeholder="/images/collections/..."
                      />
                    </Field>
                  </div>

                  {/* نمایش در صفحه اصلی */}
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary/60 px-3 py-2.5">
                    <input
                      type="checkbox"
                      id={`featured-${c.id}`}
                      checked={c.featured}
                      onChange={(e) => setCat(c.id, { featured: e.target.checked })}
                      className="accent-accent h-4 w-4 shrink-0"
                    />
                    <label
                      htmlFor={`featured-${c.id}`}
                      className="flex-1 cursor-pointer text-sm text-foreground"
                    >
                      نمایش در صفحه اصلی
                    </label>
                    {c.featured && (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                        فعال
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/* ============================================================
   لیست پرچم‌ها (جنریک)
   ============================================================ */
function FlagList<T extends { id: string; order?: number }>({
  title,
  items,
  label,
  flags,
  flagLabels,
  onChange,
  viewHref,
  orderable,
}: {
  title: string;
  items: T[];
  label: (i: T) => string;
  flags: (keyof T & string)[];
  flagLabels: Partial<Record<string, string>>;
  onChange: (items: T[]) => void;
  viewHref: (i: T) => string;
  orderable?: boolean;
}) {
  const sorted = orderable
    ? items.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : items;
  const move = (i: number, dir: -1 | 1) => {
    const next = sorted.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next.map((x, k) => ({ ...x, order: k + 1 })));
  };
  return (
    <Card title={title} desc="پرچم‌هایی که انتخاب محتوای صفحه اصلی و نشان‌ها را کنترل می‌کنند.">
      <ul className="divide-y divide-border">
        {sorted.map((it, i) => (
          <li
            key={it.id}
            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              {orderable && (
                <div className="flex shrink-0 flex-col">
                  <IconBtn label="بالا" onClick={() => move(i, -1)}>
                    <ArrowUp className="h-3 w-3" />
                  </IconBtn>
                  <IconBtn label="پایین" onClick={() => move(i, 1)}>
                    <ArrowDown className="h-3 w-3" />
                  </IconBtn>
                </div>
              )}
              <Link
                href={viewHref(it)}
                target="_blank"
                className="truncate text-sm hover:text-accent hover:underline underline-offset-4"
              >
                {label(it)}
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {flags.map((f) => {
                const on = Boolean(it[f]);
                return (
                  <button
                    key={f}
                    onClick={() =>
                      onChange(items.map((x) => (x.id === it.id ? { ...x, [f]: !on } : x)))
                    }
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      on
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-foreground-secondary hover:border-foreground-secondary",
                    )}
                  >
                    {flagLabels[f] ?? f}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ============================================================
   ویرایشگر بنرها
   ============================================================ */
function BannersEditor({
  banners,
  onChange,
}: {
  banners: Banner[];
  onChange: (b: Banner[]) => void;
}) {
  const set = (id: string, patch: Partial<Banner>) =>
    onChange(banners.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  return (
    <Card
      title="بنرها"
      desc="بنرهای تبلیغاتی که در صفحات مختلف سایت نمایش داده می‌شوند."
      action={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...banners,
              {
                id: `b-${Date.now().toString(36)}`,
                title: { fa: "", en: "" },
                text: { fa: "", en: "" },
                href: "/shop",
                enabled: true,
                placement: "shop",
              },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          افزودن بنر
        </Button>
      }
    >
      <ul className="space-y-4">
        {banners.map((b) => (
          <li key={b.id} className="rounded-lg border border-border bg-background p-4">
            <div className="mb-2 flex items-center justify-between">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  b.enabled
                    ? "bg-success/10 text-success"
                    : "bg-background-secondary text-muted",
                )}
              >
                {b.enabled ? "فعال" : "غیرفعال"}
              </span>
              <IconBtn label="حذف" onClick={() => onChange(banners.filter((x) => x.id !== b.id))}>
                <Trash2 className="h-3.5 w-3.5" />
              </IconBtn>
            </div>
            <LocalizedField label="عنوان" value={b.title} onChange={(v) => set(b.id, { title: v })} />
            <LocalizedField label="متن" value={b.text} onChange={(v) => set(b.id, { text: v })} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="لینک">
                <Input dir="ltr" value={b.href} onChange={(e) => set(b.id, { href: e.target.value })} />
              </Field>
              <Field label="محل نمایش">
                <Select
                  value={b.placement}
                  onChange={(e) =>
                    set(b.id, { placement: e.target.value as Banner["placement"] })
                  }
                >
                  <option value="top">بالای سایت</option>
                  <option value="shop">فروشگاه</option>
                  <option value="academy">آکادمی</option>
                </Select>
              </Field>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={b.enabled}
                    onChange={(e) => set(b.id, { enabled: e.target.checked })}
                    className="accent-accent"
                  />
                  فعال
                </label>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ============================================================
   مدیریت نوارهای اعلان — طراحی مجدد
   ============================================================ */
const KIND_META: Record<AnnouncementBarKind, { label: string; icon: string; defaultBg: string; defaultText: string; desc: string }> = {
  "live-webinar": { label: "وبینار زنده", icon: "🔴", defaultBg: "#dc2626", defaultText: "#ffffff", desc: "فقط زمانی نمایش داده می‌شود که یک وبینار در حال پخش باشد" },
  webinar:        { label: "وبینار",      icon: "📡", defaultBg: "#1a1a2e", defaultText: "#ffffff", desc: "اطلاع‌رسانی وبینار با متن دلخواه" },
  sale:           { label: "حراجی",      icon: "🏷️", defaultBg: "#b91c1c", defaultText: "#ffffff", desc: "تخفیف و حراجی ویژه" },
  custom:         { label: "سفارشی",     icon: "📢", defaultBg: "#1e2230", defaultText: "#ffffff", desc: "هر پیام دلخواه دیگری" },
};

const TRANSITION_META: Record<AnnouncementBarTransition, { label: string; desc: string }> = {
  "slide-down": { label: "اسلاید",   desc: "ورود نرم از راست یا چپ" },
  "fade":       { label: "محو",      desc: "fade in" },
  "blur-in":    { label: "بلر",      desc: "از تار به واضح" },
  "bounce":     { label: "باونس",    desc: "با اثر جهش" },
};

const DIRECTION_META: Record<AnnouncementBarDirection, string> = {
  rtl: "راست به چپ",
  ltr: "چپ به راست",
};

const MOTION_META: Record<AnnouncementBarMotion, { label: string; desc: string }> = {
  animated: { label: "متحرک", desc: "حرکت کامل و واضح" },
  soft: { label: "نیمه‌متحرک", desc: "حرکت کوتاه و ظریف" },
  static: { label: "ثابت", desc: "بدون انیمیشن ورود" },
};

const ANNOUNCEMENT_ANIMATION_CLASSES: Record<AnnouncementBarTransition, string> = {
  "slide-down": "ab-transition-slide-down",
  fade: "ab-transition-fade",
  "blur-in": "ab-transition-blur-in",
  bounce: "ab-transition-bounce",
};

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1",
        checked ? "bg-success" : "bg-border"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
          checked ? "-translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

function pickLiveEvent(education: EducationItem[]): EducationItem | null {
  const live = education.find(
    (e) => (e.type === "webinar" || e.type === "workshop") && e.liveEvent?.status === "live"
  );
  if (live) return live;
  const now = Date.now();
  return (
    education
      .filter(
        (e) =>
          (e.type === "webinar" || e.type === "workshop") &&
          e.liveEvent?.status === "scheduled" &&
          e.liveEvent?.startsAt &&
          new Date(e.liveEvent.startsAt).getTime() > now
      )
      .sort(
        (a, b) =>
          new Date(a.liveEvent!.startsAt).getTime() -
          new Date(b.liveEvent!.startsAt).getTime()
      )[0] ?? null
  );
}

function AnnouncementBarsManager({
  bars,
  education,
  onChange,
}: {
  bars: AnnouncementBarConfig[];
  education: EducationItem[];
  onChange: (b: AnnouncementBarConfig[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const set = (id: string, patch: Partial<AnnouncementBarConfig>) =>
    onChange(bars.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const addBar = (kind: AnnouncementBarKind) => {
    const id = `ab-${Date.now().toString(36)}`;
    const meta = KIND_META[kind];
    const defaultMessages: Record<AnnouncementBarKind, { fa: string; en: string }> = {
      "live-webinar": { fa: "وبینار زنده!", en: "Live now!" },
      webinar:        { fa: "وبینار جدید — همین حالا ثبت‌نام کنید!", en: "New webinar — register now!" },
      sale:           { fa: "حراجی ویژه — تا ۴۰٪ تخفیف!", en: "Special sale — up to 40% off!" },
      custom:         { fa: "پیام خود را اینجا بنویسید.", en: "Write your message here." },
    };
    const defaultCTA: Record<AnnouncementBarKind, { fa: string; en: string }> = {
      "live-webinar": { fa: "ورود به رویداد", en: "Join now" },
      webinar:        { fa: "ثبت‌نام", en: "Register" },
      sale:           { fa: "مشاهده تخفیف‌ها", en: "Shop sale" },
      custom:         { fa: "بیشتر بدانید", en: "Learn more" },
    };
    const defaultHref: Record<AnnouncementBarKind, string> = {
      "live-webinar": "",
      webinar: "/academy",
      sale: "/shop",
      custom: "/",
    };
    const newBar: AnnouncementBarConfig = {
      id,
      kind,
      enabled: false,
      message: defaultMessages[kind],
      href: defaultHref[kind],
      ctaLabel: defaultCTA[kind],
      bgColor: meta.defaultBg,
      textColor: meta.defaultText,
      transition: "slide-down",
      direction: "rtl",
      motion: "animated",
    };
    onChange([...bars, newBar]);
    setExpandedId(id);
  };

  const liveEvent = pickLiveEvent(education);
  const isLiveNow = liveEvent?.liveEvent?.status === "live";

  // Determine what's actually showing:
  // - live-webinar bar enabled but no live event → waiting (not showing)
  // - live-webinar bar enabled + live event → showing
  // - other enabled bar → showing
  const enabledBar = bars.find((b) => b.enabled);
  const actuallyShowing = (() => {
    if (!enabledBar) return "nothing" as const;
    if (enabledBar.kind === "live-webinar") return isLiveNow ? "live-webinar" as const : "waiting" as const;
    return "config" as const;
  })();

  return (
    <div className="space-y-5">

      {/* ══ کارت وضعیت فعلی ══ */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white",
            actuallyShowing === "nothing" || actuallyShowing === "waiting"
              ? "bg-[#94a3b8]"
              : "bg-success"
          )}>
            <Monitor className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">وضعیت نوار بالای سایت</p>
            <p className="text-xs text-muted">
              {actuallyShowing === "nothing" && "هیچ نواری فعال نیست"}
              {actuallyShowing === "waiting" && "نوار «وبینار زنده» فعال است — منتظر شروع پخش"}
              {actuallyShowing === "live-webinar" && `نوار وبینار زنده — ${liveEvent?.title.fa}`}
              {actuallyShowing === "config" && `نوار «${KIND_META[enabledBar!.kind].label}» در حال نمایش`}
            </p>
          </div>
          <div className="shrink-0">
            {actuallyShowing === "nothing" && (
              <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-medium text-muted">خاموش</span>
            )}
            {actuallyShowing === "waiting" && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                انتظار
              </span>
            )}
            {(actuallyShowing === "live-webinar" || actuallyShowing === "config") && (
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                زنده
              </span>
            )}
          </div>
        </div>

        {/* پیش‌نمایش */}
        <div className="p-4">
          {/* نوار وبینار زنده در حال پخش */}
          {actuallyShowing === "live-webinar" && enabledBar && liveEvent && (() => {
            const bg = enabledBar.bgColor || KIND_META["live-webinar"].defaultBg;
            const fg = enabledBar.textColor || KIND_META["live-webinar"].defaultText;
            const dest = enabledBar.href || `/fa/academy/${liveEvent.slug}`;
            return (
              <a href={dest} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.005] hover:shadow-md"
                style={{ backgroundColor: bg, color: fg }}
              >
                <span className="relative me-0.5 flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: fg }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fg }} />
                </span>
                <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${fg}25`, color: fg }}>
                  🔴 زنده
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {enabledBar.message?.fa && <span className="opacity-75">{enabledBar.message.fa} </span>}
                  <span className="font-semibold">{liveEvent.title.fa}</span>
                </span>
                <span className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${fg}25`, color: fg }}>
                  {enabledBar.ctaLabel?.fa || "ورود به رویداد"} →
                </span>
              </a>
            );
          })()}

          {/* نوار وبینار زنده فعال ولی هنوز رویداد live نیست */}
          {actuallyShowing === "waiting" && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="mt-0.5 shrink-0 text-lg leading-none">⏳</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">نوار «وبینار زنده» آماده‌ست</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  این نوار به محض اینکه یک وبینار در پنل آکادمی با وضعیت «زنده» تنظیم شود، به صورت خودکار در سایت نمایش داده می‌شود.
                </p>
                {liveEvent && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    نزدیک‌ترین رویداد: <span className="font-semibold">{liveEvent.title.fa}</span>
                    {" "}({liveEvent.liveEvent?.status === "scheduled" ? "برنامه‌ریزی شده" : liveEvent.liveEvent?.status})
                  </p>
                )}
              </div>
            </div>
          )}

          {/* نوار معمولی فعال */}
          {actuallyShowing === "config" && enabledBar && (() => {
            const bg = enabledBar.bgColor || KIND_META[enabledBar.kind].defaultBg;
            const fg = enabledBar.textColor || KIND_META[enabledBar.kind].defaultText;
            return (
              <a href={enabledBar.href || "#"} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-[1.005] hover:shadow-md"
                style={{ backgroundColor: bg, color: fg }}
              >
                <span className="relative me-0.5 flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: fg }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fg }} />
                </span>
                <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${fg}20`, color: fg }}>
                  {KIND_META[enabledBar.kind].label}
                </span>
                <span className="min-w-0 flex-1 truncate">{enabledBar.message?.fa || "(بدون متن)"}</span>
                {enabledBar.ctaLabel?.fa && (
                  <span className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${fg}25`, color: fg }}>
                    {enabledBar.ctaLabel.fa} ←
                  </span>
                )}
              </a>
            );
          })()}

          {actuallyShowing === "nothing" && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-7 text-center">
              <p className="text-2xl">🔕</p>
              <p className="text-sm font-medium text-muted">هیچ نواری فعال نیست</p>
              <p className="text-xs text-muted/70">یکی از نوارهای زیر را فعال کنید تا نمایش داده شود.</p>
            </div>
          )}
        </div>
      </div>

      {/* ══ لیست نوارها ══ */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft">
        {/* هدر با دکمه‌های افزودن */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">نوارهای اعلان</p>
            <p className="mt-0.5 text-xs text-muted">فقط یک نوار می‌تواند هم‌زمان فعال باشد.</p>
          </div>
          <div className="flex items-center gap-2">
            {(Object.keys(KIND_META) as AnnouncementBarKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => addBar(k)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background-secondary px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:border-accent hover:text-accent transition-colors"
              >
                <span>{KIND_META[k].icon}</span>
                {KIND_META[k].label}
              </button>
            ))}
          </div>
        </div>

        {bars.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-3xl">📭</p>
            <p className="text-sm font-medium text-muted">هنوز نواری اضافه نشده</p>
            <p className="text-xs text-muted/70">از دکمه‌های بالا یک نوار جدید اضافه کنید.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {bars.map((b) => {
              const meta = KIND_META[b.kind];
              const bg = b.bgColor || meta.defaultBg;
              const fg = b.textColor || meta.defaultText;
              const msgFa = b.kind === "live-webinar"
                ? (b.message?.fa ? `${b.message.fa} [نام وبینار]` : "[نام وبینار خودکار]")
                : (b.message?.fa || "(بدون متن)");
              const rowStatus = (() => {
                if (!b.enabled) return "off" as const;
                if (b.kind === "live-webinar") return isLiveNow ? "live" as const : "waiting" as const;
                return "live" as const;
              })();
              const isExpanded = expandedId === b.id;

              return (
                <li key={b.id} className={cn(rowStatus === "live" && "bg-success/5")}>
                  {/* ── ردیف اصلی ── */}
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    {/* نوار رنگ */}
                    <div
                      className="h-10 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: bg }}
                    />

                    {/* اطلاعات */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-muted">{meta.icon} {meta.label}</span>
                        {rowStatus === "live" && (
                          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-success" />
                            نمایش زنده
                          </span>
                        )}
                        {rowStatus === "waiting" && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                            <span className="h-1 w-1 rounded-full bg-amber-400" />
                            منتظر پخش
                          </span>
                        )}
                        {rowStatus === "off" && (
                          <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[10px] text-muted">غیرفعال</span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-foreground/80">{msgFa}</p>
                    </div>

                    {/* Toggle + expand + delete */}
                    <div className="flex shrink-0 items-center gap-3">
                      <ToggleSwitch
                        checked={b.enabled}
                        onChange={(v) => set(b.id, { enabled: v })}
                        label={b.enabled ? "غیرفعال کردن نوار" : "فعال کردن نوار"}
                      />
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-background-secondary hover:text-foreground",
                          isExpanded && "bg-background-secondary text-foreground"
                        )}
                        title="ویرایش"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                      <IconBtn label="حذف" onClick={() => onChange(bars.filter((x) => x.id !== b.id))}>
                        <Trash2 className="h-3.5 w-3.5 text-error/70 hover:text-error" />
                      </IconBtn>
                    </div>
                  </div>

                  {/* ── فرم گسترش‌یافته ── */}
                  {isExpanded && (
                    <div className="border-t border-border bg-[#fafbfc] px-5 pb-5 pt-4 space-y-4">

                      {/* پیش‌نمایش زنده */}
                      {/* پیش‌نمایش زنده */}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">پیش‌نمایش</p>
                        <a
                          href={b.href || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:opacity-90",
                            ANNOUNCEMENT_ANIMATION_CLASSES[b.transition ?? "slide-down"],
                            `ab-direction-${b.direction ?? "rtl"}`,
                            `ab-motion-${b.motion ?? "animated"}`,
                          )}
                          style={{ backgroundColor: bg, color: fg }}
                        >
                          <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: fg }} />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fg }} />
                          </span>
                          <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: `${fg}20`, color: fg }}>
                            {b.kind === "live-webinar" ? "🔴 زنده" : meta.label}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {b.kind === "live-webinar" ? (
                              <>
                                {b.message?.fa && <span className="opacity-70">{b.message.fa} </span>}
                                <span className="font-semibold italic opacity-50">[نام وبینار زنده]</span>
                              </>
                            ) : (
                              <span className="opacity-90">{b.message?.fa || "(بدون متن)"}</span>
                            )}
                          </span>
                          {b.ctaLabel?.fa && (
                            <span className="shrink-0 rounded-lg px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${fg}25`, color: fg }}>
                              {b.ctaLabel.fa} →
                            </span>
                          )}
                        </a>
                        {b.kind === "live-webinar" && (
                          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
                            <span>ℹ️</span>
                            عنوان وبینار به صورت خودکار از رویداد زنده آکادمی گرفته می‌شود.
                          </p>
                        )}
                      </div>

                      {/* نوع + انیمیشن ورود */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">نوع نوار</p>
                          <div className="flex flex-wrap gap-1.5">
                            {(Object.keys(KIND_META) as AnnouncementBarKind[]).map((k) => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => {
                                  const m = KIND_META[k];
                                  set(b.id, { kind: k, bgColor: m.defaultBg, textColor: m.defaultText });
                                }}
                                className={cn(
                                  "flex flex-col items-center gap-1 rounded-xl border px-2.5 py-2 text-xs transition-all",
                                  b.kind === k
                                    ? "border-accent bg-accent/5 font-semibold text-accent"
                                    : "border-border text-muted hover:border-accent/50 hover:text-foreground"
                                )}
                                title={KIND_META[k].desc}
                              >
                                <span className="text-sm">{KIND_META[k].icon}</span>
                                <span className="leading-tight">{KIND_META[k].label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">انیمیشن ورود</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(Object.keys(TRANSITION_META) as AnnouncementBarTransition[]).map((tr) => (
                              <button
                                key={tr}
                                type="button"
                                onClick={() => set(b.id, { transition: tr })}
                                className={cn(
                                  "rounded-xl border px-2.5 py-2 text-right text-xs transition-all",
                                  (b.transition ?? "slide-down") === tr
                                    ? "border-accent bg-accent/5 font-semibold text-accent"
                                    : "border-border text-muted hover:border-accent/50 hover:text-foreground"
                                )}
                              >
                                <span className="block font-medium">{TRANSITION_META[tr].label}</span>
                                <span className="block text-[10px] opacity-70">{TRANSITION_META[tr].desc}</span>
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            {(Object.keys(MOTION_META) as AnnouncementBarMotion[]).map((motion) => (
                              <button
                                key={motion}
                                type="button"
                                onClick={() => set(b.id, { motion })}
                                className={cn(
                                  "rounded-xl border px-2 py-2 text-right text-xs transition-all",
                                  (b.motion ?? "animated") === motion
                                    ? "border-accent bg-accent/5 font-semibold text-accent"
                                    : "border-border text-muted hover:border-accent/50 hover:text-foreground"
                                )}
                              >
                                <span className="block font-medium">{MOTION_META[motion].label}</span>
                                <span className="block text-[10px] opacity-70">{MOTION_META[motion].desc}</span>
                              </button>
                            ))}
                          </div>
                          <div className="mt-3">
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">جهت حرکت</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {(Object.keys(DIRECTION_META) as AnnouncementBarDirection[]).map((direction) => (
                                <button
                                  key={direction}
                                  type="button"
                                  onClick={() => set(b.id, { direction })}
                                  className={cn(
                                    "rounded-xl border px-2.5 py-2 text-xs transition-all",
                                    (b.direction ?? "rtl") === direction
                                      ? "border-accent bg-accent/5 font-semibold text-accent"
                                      : "border-border text-muted hover:border-accent/50 hover:text-foreground"
                                  )}
                                >
                                  {direction === "rtl" ? "← " : "→ "}{DIRECTION_META[direction]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* پیام / پیشوند */}
                      <LocalizedField
                        label={b.kind === "live-webinar" ? "پیشوند پیام (قبل از نام وبینار)" : "متن پیام"}
                        value={b.message}
                        onChange={(v) => set(b.id, { message: v })}
                      />

                      {/* دکمه CTA */}
                      <LocalizedField
                        label="متن دکمه CTA"
                        value={b.ctaLabel ?? { fa: "", en: "" }}
                        onChange={(v) => set(b.id, { ctaLabel: v })}
                      />

                      {/* لینک + رنگ‌ها */}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label={b.kind === "live-webinar" ? "لینک (خالی = خودکار)" : "لینک (href)"}>
                          <Input
                            dir="ltr"
                            value={b.href}
                            placeholder={b.kind === "live-webinar" ? "خودکار (لینک رویداد)" : "/shop"}
                            onChange={(e) => set(b.id, { href: e.target.value })}
                          />
                        </Field>

                        <Field label="رنگ پس‌زمینه">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={b.bgColor || meta.defaultBg}
                              onChange={(e) => set(b.id, { bgColor: e.target.value })}
                              className="h-8 w-10 cursor-pointer rounded border border-border p-0.5"
                            />
                            <Input
                              dir="ltr"
                              value={b.bgColor || ""}
                              placeholder={meta.defaultBg}
                              onChange={(e) => set(b.id, { bgColor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </Field>

                        <Field label="رنگ متن">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={b.textColor || meta.defaultText}
                              onChange={(e) => set(b.id, { textColor: e.target.value })}
                              className="h-8 w-10 cursor-pointer rounded border border-border p-0.5"
                            />
                            <Input
                              dir="ltr"
                              value={b.textColor || ""}
                              placeholder={meta.defaultText}
                              onChange={(e) => set(b.id, { textColor: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </Field>
                      </div>

                      {/* تاریخ انقضا */}
                      <Field label="تاریخ پایان نمایش (اختیاری)">
                        <Input
                          dir="ltr"
                          type="datetime-local"
                          value={b.expiresAt ? b.expiresAt.slice(0, 16) : ""}
                          onChange={(e) =>
                            set(b.id, {
                              expiresAt: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : undefined,
                            })
                          }
                        />
                      </Field>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ویرایشگر SEO
   ============================================================ */
function SeoEditor({
  seo,
  onChange,
}: {
  seo: SeoMeta[];
  onChange: (s: SeoMeta[]) => void;
}) {
  const set = (path: string, patch: Partial<SeoMeta>) =>
    onChange(seo.map((s) => (s.path === path ? { ...s, ...patch } : s)));
  return (
    <Card
      title="متادیتای SEO"
      desc="عنوان و توضیح هر صفحه به دو زبان فارسی و انگلیسی."
    >
      <ul className="space-y-4">
        {seo.map((s) => (
          <li key={s.path} className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-muted" />
              <code className="font-mono text-xs text-muted">{s.path}</code>
            </div>
            <LocalizedField
              label="عنوان"
              value={s.title}
              onChange={(v) => set(s.path, { title: v })}
            />
            <LocalizedField
              label="توضیحات"
              value={s.description}
              onChange={(v) => set(s.path, { description: v })}
              textarea
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ============================================================
   کامپوننت‌های پایه
   ============================================================ */
function Card({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-soft">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-foreground-secondary hover:bg-background-secondary hover:text-foreground"
    >
      {children}
    </button>
  );
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
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, fa: e.target.value })
          }
        />
      </Field>
      <Field label={`${label} (انگلیسی)`}>
        <C
          dir="ltr"
          value={value.en}
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) =>
            onChange({ ...value, en: e.target.value })
          }
        />
      </Field>
    </div>
  );
}
