"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  GalleryHorizontalEnd,
  Package,
  Palette,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  Truck,
  Users,
  XCircle,
  AlertTriangle,
  Map,
  Newspaper,
  Library,
  UserCheck,
  UserX,
  Paintbrush,
  Layout,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SiteContent } from "@/lib/types";

/* ─── تایپ‌ها ─── */
interface DailyPoint { date: string; revenue: number; count: number }
interface RecentOrder {
  id: string; name: string; email: string;
  total: { fa: number; en: number };
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  lines: { title: string; qty: number }[];
}
interface LiveStats {
  totalOrders: number; pendingOrders: number;
  totalRevenue: number; todayRevenue: number;
  statusCount: Record<string, number>;
}
interface DashPayload {
  stats: LiveStats;
  dailyRevenue: DailyPoint[];
  recentOrders: RecentOrder[];
}
interface PublicUser {
  id: string; name: string; email: string;
  role: "user" | "artist" | "admin";
  createdAt: string;
}

/* ─── بخش‌ها ─── */
type Section =
  | "dashboard" | "buyers" | "artists-signup"
  | "home" | "hero" | "categories"
  | "patterns" | "products" | "artists" | "portfolios"
  | "education" | "banners" | "seo";

/* ─── کمکی‌ها ─── */
function farsiNum(n: number) {
  return n.toLocaleString("fa-IR");
}
function tomanFormat(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} هزار`;
  return `${n}`;
}
function tomanFull(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} میلیون تومان`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} هزار تومان`;
  return `${n} تومان`;
}
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "همین الان";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  return `${Math.floor(diff / 86400)} روز پیش`;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: "در انتظار",      color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",   icon: <Clock className="h-3 w-3" /> },
  confirmed: { label: "تأیید شده",      color: "text-blue-600",    bg: "bg-blue-50 border-blue-200",     icon: <CheckCircle2 className="h-3 w-3" /> },
  shipped:   { label: "ارسال شد",       color: "text-purple-600",  bg: "bg-purple-50 border-purple-200", icon: <Truck className="h-3 w-3" /> },
  delivered: { label: "تحویل داده شد",  color: "text-green-600",   bg: "bg-green-50 border-green-200",   icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: "لغو شده",        color: "text-red-500",     bg: "bg-red-50 border-red-200",       icon: <XCircle className="h-3 w-3" /> },
};

/* ─── MiniSparkline ─── */
function Sparkline({ points, color = "#b5713a" }: { points: number[]; color?: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const W = 120, H = 36, pad = 2;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
  const ys = points.map((v) => H - pad - ((v - min) / (max - min + 1)) * (H - pad * 2));
  const poly = xs.map((x, i) => `${x},${ys[i]}`).join(" ");
  const area = `M${xs[0]},${H} ` + xs.map((x, i) => `L${x},${ys[i]}`).join(" ") + ` L${xs[xs.length - 1]},${H} Z`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#", "")})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill={color} />
    </svg>
  );
}

/* ─── BarChart هفتگی ─── */
function WeeklyChart({ data }: { data: DailyPoint[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const dayNames = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
  return (
    <div className="flex h-32 items-end gap-1.5 pt-2">
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        const isToday = i === data.length - 1;
        return (
          <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-1">
            <div className="pointer-events-none absolute bottom-full mb-1.5 hidden whitespace-nowrap rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs shadow-medium group-hover:block" style={{ zIndex: 10 }}>
              <p className="font-semibold text-foreground">{tomanFull(d.revenue)}</p>
              <p className="text-muted">{d.count} سفارش</p>
            </div>
            <div className="relative w-full overflow-hidden rounded-t-md" style={{ height: `${Math.max(pct, 4)}%` }}>
              <div className={cn("absolute inset-0 transition-all duration-700", isToday ? "bg-accent" : "bg-[#1e2230]/15 group-hover:bg-[#1e2230]/25")} />
              {isToday && <div className="absolute inset-0 animate-pulse bg-accent/30" />}
            </div>
            <span className={cn("text-[10px]", isToday ? "font-bold text-accent" : "text-muted")}>
              {dayNames[i % 7]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Donut وضعیت سفارشات ─── */
function StatusDonut({ statusCount }: { statusCount: Record<string, number> }) {
  const total = Object.values(statusCount).reduce((s, v) => s + v, 0);
  if (total === 0) return <div className="flex h-24 items-center justify-center text-xs text-muted">سفارشی ثبت نشده</div>;

  const colors: Record<string, string> = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#10b981",
    cancelled: "#ef4444",
  };

  const R = 36, cx = 44, cy = 44, stroke = 10;
  const circumference = 2 * Math.PI * R;
  let offset = 0;
  const slices = Object.entries(statusCount)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => {
      const pct = v / total;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const s = { key: k, dash, gap, offset, color: colors[k] ?? "#94a3b8" };
      offset += dash;
      return s;
    });

  return (
    <div className="flex items-center gap-4">
      <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0 -rotate-90">
        {slices.map((s) => (
          <circle
            key={s.key}
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.offset}
            strokeLinecap="butt"
          />
        ))}
        <circle cx={cx} cy={cy} r={R - stroke / 2 - 2} fill="#f7f8fa" />
      </svg>
      <div className="flex flex-col gap-1.5 text-[11px]">
        {Object.entries(statusCount).map(([k, v]) => {
          const s = STATUS_MAP[k];
          if (!s) return null;
          return (
            <div key={k} className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colors[k] ?? "#94a3b8" }} />
              <span className="text-muted">{s.label}</span>
              <span className="font-semibold text-foreground">{farsiNum(v)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── پالس آنلاین ─── */
function OnlinePulse() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
    </span>
  );
}

/* ─── CountUp ─── */
function CountUp({ to, duration = 800 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(p * to));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [to, duration]);
  return <>{farsiNum(val)}</>;
}

/* ─── ProgressBar ─── */
function ProgressBar({ value, max, color = "bg-accent" }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-secondary">
      <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─── ContentMetric card ─── */
function ContentCard({
  icon, label, total, featured, sub, color, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  featured?: number;
  sub?: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-xl border border-border bg-white p-4 shadow-soft transition-all hover:border-accent/30 hover:shadow-medium text-right w-full"
    >
      <div className="flex items-center justify-between">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", color)}>
          {icon}
        </div>
        <span className="text-2xl font-bold tabular-nums text-foreground">{farsiNum(total)}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground">{label}</p>
        {featured !== undefined && (
          <div className="mt-1.5">
            <ProgressBar value={featured} max={total} color="bg-amber-400" />
            <p className="mt-1 text-[10px] text-muted">{farsiNum(featured)} ویژه از {farsiNum(total)}</p>
          </div>
        )}
        {sub && <p className="mt-1 text-[10px] text-muted">{sub}</p>}
      </div>
    </button>
  );
}

/* ─── SectionHealthRow ─── */
function SectionHealthRow({ label, enabled, total }: { label: string; enabled: boolean; total: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className={cn("h-2 w-2 shrink-0 rounded-full", enabled ? "bg-green-500" : "bg-red-400")} />
      <span className="flex-1 text-foreground">{label}</span>
      <span className="text-muted">{enabled ? "فعال" : "غیرفعال"}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════
   کامپوننت اصلی داشبورد
   ════════════════════════════════════════════════ */
export function LiveDashboard({
  data,
  setSection,
}: {
  data: SiteContent;
  setSection: (s: Section) => void;
}) {
  const [live, setLive] = useState<DashPayload | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json() as { ok: boolean } & DashPayload;
        if (d.ok) { setLive(d); setLastUpdated(new Date()); }
      }
      if (usersRes.ok) {
        const d = await usersRes.json() as { ok: boolean; users: PublicUser[] };
        if (d.ok) setUsers(d.users);
      }
    } finally {
      setLoading(false);
      if (showSpin) setTimeout(() => setRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(() => fetchStats(), 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── محاسبات محتوا ── */
  const enabledSections = data.homeSections.filter((s) => s.enabled).length;
  const revenuePoints   = live?.dailyRevenue.map((d) => d.revenue) ?? [];
  const countPoints     = live?.dailyRevenue.map((d) => d.count) ?? [];

  const todayCount     = live?.dailyRevenue.at(-1)?.count ?? 0;
  const yesterdayCount = live?.dailyRevenue.at(-2)?.count ?? 0;
  const countDelta = yesterdayCount === 0 ? null : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);

  const todayRev     = live?.dailyRevenue.at(-1)?.revenue ?? 0;
  const yesterdayRev = live?.dailyRevenue.at(-2)?.revenue ?? 0;
  const revDelta = yesterdayRev === 0 ? null : Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100);

  /* ── آمار کاربران ── */
  const totalUsers   = users.length;
  const artistUsers  = users.filter((u) => u.role === "artist").length;
  const normalUsers  = users.filter((u) => u.role === "user").length;
  const recentUsers  = users.filter((u) => {
    const d = new Date(u.createdAt);
    return (Date.now() - d.getTime()) < 7 * 24 * 3600 * 1000;
  }).length;

  /* ── آمار محتوا ── */
  const featuredPatterns  = data.patterns.filter((p) => p.featured).length;
  const trendingPatterns  = data.patterns.filter((p) => p.trending).length;
  const newPatterns       = data.patterns.filter((p) => p.isNew).length;
  const featuredProducts  = data.products.filter((p) => p.featured).length;
  const featuredArtists   = data.artists.filter((a) => a.featured).length;
  const featuredPortfolios = data.portfolios.filter((p) => p.featured).length;
  const featuredEdu       = data.education.filter((e) => e.featured).length;
  const enabledBanners    = data.banners.filter((b) => b.enabled).length;

  /* ── هشدارهای محتوا ── */
  const warnings: string[] = [];
  if (data.patterns.some((p) => !p.image)) warnings.push("برخی پترن‌ها تصویر ندارند");
  if (data.products.some((p) => p.colors.length === 0)) warnings.push("برخی محصولات رنگ ندارند");
  if (data.artists.filter((a) => a.featured).length === 0) warnings.push("هیچ هنرمند ویژه‌ای تعریف نشده");
  if (data.banners.filter((b) => b.enabled).length === 0) warnings.push("هیچ بنر فعالی وجود ندارد");
  if (data.homeSections.filter((s) => s.enabled).length < 3) warnings.push("کمتر از ۳ بخش صفحه اصلی فعال است");

  return (
    <div className="space-y-6">

      {/* ── نوار بالا ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">داشبورد مدیریت</h1>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
            <OnlinePulse />
            <span>آنلاین · به‌روز‌رسانی خودکار هر ۳۰ ثانیه</span>
            {lastUpdated && (
              <span className="text-muted/60">· آخرین بار: {timeAgo(lastUpdated.toISOString())}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => fetchStats(true)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground-secondary shadow-soft hover:bg-background-secondary transition-colors",
            refreshing && "opacity-60 pointer-events-none",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          به‌روز‌رسانی
        </button>
      </div>

      {/* ── هشدارها ── */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold text-amber-700">هشدارهای محتوا ({warnings.length})</p>
          </div>
          <ul className="space-y-1">
            {warnings.map((w) => (
              <li key={w} className="flex items-center gap-2 text-xs text-amber-700">
                <span className="h-1 w-1 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── متریک‌های اصلی (سفارشات) ── */}
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground-secondary">آمار سفارشات</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* سفارشات امروز */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted">سفارشات امروز</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {loading ? <span className="animate-pulse text-muted">—</span> : <CountUp to={todayCount} />}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Sparkline points={countPoints} color="#3b82f6" />
              {countDelta !== null && (
                <span className={cn("flex items-center gap-0.5 text-xs font-medium", countDelta >= 0 ? "text-green-600" : "text-red-500")}>
                  {countDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(countDelta)}٪ نسبت به دیروز
                </span>
              )}
            </div>
          </div>

          {/* درآمد امروز */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted">درآمد امروز</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {loading ? <span className="animate-pulse text-muted">—</span> : tomanFormat(todayRev)}
                  {!loading && <span className="mr-1 text-sm font-medium text-muted">ت</span>}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Sparkline points={revenuePoints} color="#b5713a" />
              {revDelta !== null && (
                <span className={cn("flex items-center gap-0.5 text-xs font-medium", revDelta >= 0 ? "text-green-600" : "text-red-500")}>
                  {revDelta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {Math.abs(revDelta)}٪ نسبت به دیروز
                </span>
              )}
            </div>
          </div>

          {/* جمع کل درآمد */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted">کل درآمد</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {loading ? <span className="animate-pulse text-muted">—</span> : tomanFormat(live?.stats.totalRevenue ?? 0)}
                  {!loading && <span className="mr-1 text-sm font-medium text-muted">ت</span>}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <BarChart2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-background-secondary px-2 py-0.5 text-[10px] text-muted">
                جمع سفارشات: {farsiNum(live?.stats.totalOrders ?? 0)}
              </span>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] text-amber-700">
                در انتظار: {farsiNum(live?.stats.pendingOrders ?? 0)}
              </span>
            </div>
          </div>

          {/* کاربران */}
          <div className="rounded-xl border border-border bg-white p-4 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted">کاربران</p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums text-foreground">
                  {loading ? <span className="animate-pulse text-muted">—</span> : <CountUp to={totalUsers} />}
                </p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] text-blue-700">
                <UserCheck className="h-2.5 w-2.5" />{farsiNum(artistUsers)} هنرمند
              </span>
              <span className="flex items-center gap-1 rounded-full bg-background-secondary px-2 py-0.5 text-[10px] text-muted">
                <UserX className="h-2.5 w-2.5" />{farsiNum(normalUsers)} کاربر عادی
              </span>
              {recentUsers > 0 && (
                <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] text-green-700">
                  +{farsiNum(recentUsers)} این هفته
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── نمودار هفتگی + وضعیت سفارشات ── */}
      <div className="grid gap-5 lg:grid-cols-5">

        {/* نمودار میله‌ای */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">درآمد ۷ روز گذشته</p>
              <p className="text-xs text-muted">به تومان</p>
            </div>
            <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              {live ? tomanFull(live.stats.totalRevenue) : "—"}
            </span>
          </div>
          {live ? (
            <WeeklyChart data={live.dailyRevenue} />
          ) : (
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex-1 animate-pulse rounded-t-md bg-background-secondary" style={{ height: `${h}%` }} />
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span>جمع کل: {farsiNum(live?.stats.totalOrders ?? 0)} سفارش</span>
            <span className="flex items-center gap-1"><Circle className="h-2 w-2 fill-accent text-accent" /> امروز</span>
          </div>
        </div>

        {/* Donut وضعیت + جدول */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-white shadow-soft">
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-sm font-semibold text-foreground">توزیع وضعیت سفارشات</p>
          </div>
          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
            {live ? (
              <StatusDonut statusCount={live.stats.statusCount} />
            ) : (
              <div className="flex items-center justify-center h-24">
                <div className="h-20 w-20 animate-pulse rounded-full bg-background-secondary" />
              </div>
            )}
            {/* آخرین سفارشات خلاصه */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted mb-2">آخرین سفارشات</p>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-7 w-7 animate-pulse rounded-full bg-background-secondary" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 w-24 animate-pulse rounded bg-background-secondary" />
                      <div className="h-2 w-16 animate-pulse rounded bg-background-secondary" />
                    </div>
                  </div>
                ))
              ) : live?.recentOrders.slice(0, 5).map((order) => {
                const s = STATUS_MAP[order.status] ?? STATUS_MAP.pending;
                return (
                  <div key={order.id} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e2230]/8 text-[10px] font-bold text-[#1e2230]">
                      {order.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{order.name}</p>
                      <p className="text-[10px] text-muted">{tomanFull(order.total.fa)}</p>
                    </div>
                    <span className={cn("flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[9px] font-medium", s.color, s.bg)}>
                      {s.icon}{s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── موجودی محتوا ── */}
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground-secondary">موجودی محتوا</p>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          <ContentCard
            icon={<Palette className="h-4 w-4" />}
            label="پترن‌ها"
            total={data.patterns.length}
            featured={featuredPatterns}
            sub={`${farsiNum(trendingPatterns)} پرطرفدار · ${farsiNum(newPatterns)} جدید`}
            color="bg-rose-50 text-rose-600"
            onClick={() => setSection("patterns")}
          />
          <ContentCard
            icon={<ShoppingBag className="h-4 w-4" />}
            label="محصولات"
            total={data.products.length}
            featured={featuredProducts}
            sub={`${farsiNum(data.products.filter(p => p.bestSeller).length)} پرفروش`}
            color="bg-blue-50 text-blue-600"
            onClick={() => setSection("products")}
          />
          <ContentCard
            icon={<Paintbrush className="h-4 w-4" />}
            label="هنرمندان"
            total={data.artists.length}
            featured={featuredArtists}
            sub={`${farsiNum(data.artists.filter(a => a.rating >= 4).length)} امتیاز ≥ ۴`}
            color="bg-purple-50 text-purple-600"
            onClick={() => setSection("artists")}
          />
          <ContentCard
            icon={<GalleryHorizontalEnd className="h-4 w-4" />}
            label="پورتفولیوها"
            total={data.portfolios.length}
            featured={featuredPortfolios}
            sub={`${farsiNum(data.portfolios.filter(p => p.isProject).length)} پروژه`}
            color="bg-indigo-50 text-indigo-600"
            onClick={() => setSection("portfolios")}
          />
          <ContentCard
            icon={<BookOpen className="h-4 w-4" />}
            label="آموزش‌ها"
            total={data.education.length}
            featured={featuredEdu}
            sub={`${farsiNum(data.education.filter(e => e.popular).length)} محبوب`}
            color="bg-teal-50 text-teal-600"
            onClick={() => setSection("education")}
          />
          <ContentCard
            icon={<Tag className="h-4 w-4" />}
            label="دسته‌بندی‌ها"
            total={data.categories.length}
            sub={`${farsiNum(data.categories.filter(c => c.featured).length)} ویژه`}
            color="bg-orange-50 text-orange-600"
            onClick={() => setSection("categories")}
          />
          <ContentCard
            icon={<Map className="h-4 w-4" />}
            label="فضاها"
            total={data.spaces.length}
            color="bg-cyan-50 text-cyan-600"
          />
          <ContentCard
            icon={<Newspaper className="h-4 w-4" />}
            label="داستان‌ها"
            total={data.stories.length}
            color="bg-pink-50 text-pink-600"
          />
          <ContentCard
            icon={<Library className="h-4 w-4" />}
            label="کالکشن‌ها"
            total={data.collections.length}
            color="bg-emerald-50 text-emerald-600"
          />
          <ContentCard
            icon={<Sparkles className="h-4 w-4" />}
            label="بنرها"
            total={data.banners.length}
            sub={`${farsiNum(enabledBanners)} فعال از ${farsiNum(data.banners.length)}`}
            color="bg-yellow-50 text-yellow-600"
            onClick={() => setSection("banners")}
          />
        </div>
      </div>

      {/* ── وضعیت صفحه اصلی + SEO ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* صفحه اصلی */}
        <div className="rounded-xl border border-border bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted" />
              <p className="text-sm font-semibold text-foreground">بخش‌های صفحه اصلی</p>
            </div>
            <span className="rounded-full bg-background-secondary px-2.5 py-1 text-[10px] font-semibold text-muted">
              {farsiNum(enabledSections)} / {farsiNum(data.homeSections.length)} فعال
            </span>
          </div>
          <div className="p-5">
            <div className="mb-3">
              <ProgressBar value={enabledSections} max={data.homeSections.length} color="bg-purple-500" />
            </div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
              {data.homeSections
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <SectionHealthRow key={s.key} label={s.key} enabled={s.enabled} total={data.homeSections.length} />
                ))}
            </div>
            <button
              onClick={() => setSection("home")}
              className="mt-4 w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground-secondary hover:bg-background-secondary transition-colors"
            >
              مدیریت بخش‌ها
            </button>
          </div>
        </div>

        {/* SEO + بنرها */}
        <div className="space-y-4">
          {/* بنرها */}
          <div className="rounded-xl border border-border bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted" />
                <p className="text-sm font-semibold text-foreground">بنرهای تبلیغاتی</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", enabledBanners > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
                {farsiNum(enabledBanners)} فعال
              </span>
            </div>
            <div className="divide-y divide-border">
              {data.banners.length === 0 ? (
                <p className="px-5 py-4 text-xs text-muted text-center">بنری تعریف نشده</p>
              ) : data.banners.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">{b.title.fa || b.title.en || "بدون عنوان"}</p>
                    <p className="text-[10px] text-muted capitalize">{b.placement}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", b.enabled ? "bg-green-50 text-green-700" : "bg-background-secondary text-muted")}>
                    {b.enabled ? "فعال" : "غیرفعال"}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-3">
              <button
                onClick={() => setSection("banners")}
                className="w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground-secondary hover:bg-background-secondary transition-colors"
              >
                مدیریت بنرها
              </button>
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-border bg-white shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted" />
                <p className="text-sm font-semibold text-foreground">تنظیمات SEO</p>
              </div>
              <span className="rounded-full bg-background-secondary px-2.5 py-1 text-[10px] font-semibold text-muted">
                {farsiNum(data.seo.length)} صفحه
              </span>
            </div>
            <div className="divide-y divide-border max-h-36 overflow-y-auto">
              {data.seo.map((s) => (
                <div key={s.path} className="flex items-center justify-between px-5 py-2">
                  <code className="text-[10px] font-mono text-muted">{s.path}</code>
                  <span className={cn("text-[10px]", s.title.fa ? "text-green-600" : "text-red-500")}>
                    {s.title.fa ? "✓ عنوان دارد" : "✗ بدون عنوان"}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-3">
              <button
                onClick={() => setSection("seo")}
                className="w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground-secondary hover:bg-background-secondary transition-colors"
              >
                ویرایش SEO
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── آمار کاربران ── */}
      <div className="rounded-xl border border-border bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <p className="text-sm font-semibold text-foreground">جزئیات کاربران</p>
          </div>
          <div className="flex items-center gap-2">
            {recentUsers > 0 && (
              <span className="rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                +{farsiNum(recentUsers)} این هفته
              </span>
            )}
            <span className="rounded-full bg-background-secondary px-2.5 py-1 text-[10px] font-semibold text-muted">
              {farsiNum(totalUsers)} کاربر
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div className="rounded-lg bg-background-secondary p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{farsiNum(totalUsers)}</p>
            <p className="mt-1 text-xs text-muted">کل کاربران</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{farsiNum(artistUsers)}</p>
            <p className="mt-1 text-xs text-blue-600">هنرمندان ثبت‌نام شده</p>
          </div>
          <div className="rounded-lg bg-background-secondary p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{farsiNum(normalUsers)}</p>
            <p className="mt-1 text-xs text-muted">کاربران عادی</p>
          </div>
        </div>
        {users.length > 0 && (
          <div className="border-t border-border px-5 pb-5 pt-3">
            <p className="mb-3 text-xs font-semibold text-muted">آخرین کاربران ثبت‌نام شده</p>
            <div className="space-y-2">
              {users
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5)
                .map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e2230]/8 text-xs font-bold text-[#1e2230]">
                      {u.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{u.name}</p>
                      <p className="truncate text-[10px] text-muted">{u.email}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                        u.role === "artist" ? "bg-blue-50 text-blue-700" :
                        u.role === "admin" ? "bg-red-50 text-red-700" : "bg-background-secondary text-muted"
                      )}>
                        {u.role === "artist" ? "هنرمند" : u.role === "admin" ? "ادمین" : "کاربر"}
                      </span>
                      <span className="text-[9px] text-muted">{timeAgo(u.createdAt)}</span>
                    </div>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setSection("buyers")}
              className="mt-4 w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground-secondary hover:bg-background-secondary transition-colors"
            >
              مدیریت کاربران
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
