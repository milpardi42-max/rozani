"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock,
  CreditCard,
  FileSearch,
  LayoutDashboard,
  Loader2,
  Mail,
  PackageCheck,
  Percent,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, href } from "@/lib/utils";
import { SESSION_FETCH } from "@/lib/http";
import type { PricePair } from "@/lib/marketplace/types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Admin marketplace console.
 *
 * One screen, six jobs: moderate submissions, watch the money, run the review
 * queue, settle payouts, inspect the delivery outbox and confirm which
 * integrations are live in this deployment.
 */

type View = "dashboard" | "queue" | "orders" | "payouts" | "outbox" | "integrations" | "settings";

interface Analytics {
  range: { from: string; to: string; days: number };
  totals: {
    revenue: PricePair;
    platformRevenue: PricePair;
    artistRevenue: PricePair;
    orders: number;
    licenses: number;
    assets: number;
    pendingAssets: number;
    subscribers: number;
    artists: number;
    downloads: number;
    views: number;
    conversionPct: number;
    refunds: number;
  };
  series: { date: string; revenueFa: number; revenueEn: number; orders: number; downloads: number }[];
  topArtists: { artistId: string; revenue: PricePair; sales: number }[];
  topAssets: { assetId: string; title: Localized; sales: number; revenue: PricePair }[];
  recentOrders: { id: string; buyer: string; total: PricePair; status: string; at: string }[];
  pendingPayouts: { count: number; amount: PricePair };
}

interface StatusPayload {
  backend: string;
  counts: {
    assets: number;
    pending: number;
    approved: number;
    rejected: number;
    soldExclusive: number;
    orders: number;
    licenses: number;
    downloads: number;
  };
  integrations: { id: string; label: Localized; configured: boolean; mode: string; note: string }[];
  settings: {
    vatPct: number;
    artistSharePct: number;
    affiliatePct: number;
    affiliateDiscountPct: number;
    payoutMinimumFa: number;
    payoutMinimumEn: number;
    autoApproveSeamless: boolean;
    emailOnSale: boolean;
  };
}

interface QueueItem {
  asset: {
    id: string;
    slug: string;
    title: Localized;
    description: Localized;
    kind: string;
    status: string;
    visibility: string;
    createdAt: string;
    master: { filename: string; sizeBytes: number; mime: string; sha256: string };
    scan: { engine: string; status: string };
    seamless: { verdict: string; score: number };
    tiers: { id: string; kind: string; title: Localized; price: PricePair; enabled: boolean }[];
    media: { preview: string | null; tile: string | null; thumbs: string[]; mockups: { key: string; kind: string }[] };
    /** Delivered colour versions — each with the formats inside it. */
    formats?: string[];
    deliveryBytes?: number;
    colourways?: {
      id: string;
      name: Localized;
      hex: string;
      preview: string | null;
      formats: { formatId: string; filename: string; sizeBytes: number }[];
    }[];
    rejectionNote?: string;
    review?: { reviewedBy?: string; reviewedAt?: string; note?: string; filesUpdatedAt?: string };
  };
  artistName: Localized;
  ownerEmail: string | null;
  warnings: Localized[];
}

interface OrderRow {
  id: string;
  buyer: { name: string; email: string };
  lines: { title: string }[];
  total: PricePair;
  charge: { currency: string; amount: number };
  status: string;
  createdAt: string;
  fulfillment: { completedAt?: string };
}

interface PayoutRow {
  id: string;
  artistId: string;
  amount: PricePair;
  method: string;
  destination: string;
  status: string;
  requestedAt: string;
  reference?: string;
}

interface OutboxRow {
  id: string;
  to: string;
  subject: string;
  kind: string;
  status: string;
  createdAt: string;
  error?: string;
}

export function AdminConsole({ locale }: { locale: "fa" | "en" }) {
  const { dict } = useLocale();
  const fa = locale === "fa";
  const [view, setView] = useState<View>("dashboard");
  const [analysis, setAnalysis] = useState<Analytics | null>(null);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [payouts, setPayouts] = useState<{ summary: Record<string, PricePair>; pending: PayoutRow[]; recent: PayoutRow[] } | null>(null);
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [settings, setSettings] = useState<StatusPayload["settings"] | null>(null);
  const [filter, setFilter] = useState("");
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  const load = useCallback(
    async (target: View = view) => {
      setLoading(true);
      try {
        const query =
          target === "queue" ? "queue" : target === "orders" ? `orders&q=${encodeURIComponent(filter)}` : target === "payouts" ? "payouts" : target === "outbox" ? "outbox" : target === "integrations" ? "status" : "dashboard";
        const response = await fetch(`/api/marketplace/admin?view=${query}`, SESSION_FETCH);
        const data = (await response.json()) as Record<string, unknown> & { ok?: boolean };
        if (!data.ok) {
          setNotice(data.error === "forbidden" ? (fa ? "دسترسی مدیر لازم است." : "Admin access required.") : String(data.error ?? "failed"));
          return;
        }

        if (target === "dashboard") {
          setAnalysis(data.analytics as Analytics);
          setStatus(data.status as StatusPayload);
          setSettings((data.status as StatusPayload).settings);
        }
        if (target === "queue") setQueue((data.items as QueueItem[]) ?? []);
        if (target === "orders") setOrders((data.orders as OrderRow[]) ?? []);
        if (target === "payouts") setPayouts(data as never);
        if (target === "outbox") setOutbox((data.messages as OutboxRow[]) ?? []);
        if (target === "integrations") {
          setStatus(data.status as StatusPayload);
          setSettings((data.status as StatusPayload).settings);
        }
      } finally {
        setLoading(false);
      }
    },
    [view, filter, fa],
  );

  useEffect(() => {
    void load(view);
  }, [view, load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const post = useCallback(
    async (url: string, body: Record<string, unknown>) => {
      const response = await fetch(url, {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await response.json()) as Record<string, unknown> & { ok?: boolean; error?: string };
    },
    [],
  );

  async function review(action: "approve" | "reject" | "rescan" | "regenerate", assetId: string, note?: string) {
    setBusy(`${action}:${assetId}`);
    try {
      const data = await post("/api/marketplace/admin/review", { action, assetId, note, publish: true });
      setNotice(
        data.ok
          ? action === "approve"
            ? fa
              ? "اثر تأیید و منتشر شد."
              : "Approved and published."
            : action === "reject"
              ? fa
                ? "اثر رد شد."
                : "Rejected."
              : action === "rescan"
                ? fa
                  ? "اسکن مجدد انجام شد."
                  : "Rescanned."
                : fa
                  ? "پیش‌نمایش‌ها بازسازی شد."
                  : "Derivatives rebuilt."
          : String(data.error ?? "failed"),
      );
      setQueue((current) => (action === "approve" || action === "reject" ? current.filter((item) => item.asset.id !== assetId) : current));
    } finally {
      setBusy(null);
    }
  }

  async function orderAction(action: "fulfill" | "refund" | "deliver_again", orderId: string) {
    setBusy(`${action}:${orderId}`);
    try {
      const data = await post("/api/marketplace/admin/orders", { action, orderId });
      setNotice(data.ok ? (fa ? "انجام شد." : "Done.") : String(data.error ?? "failed"));
      void load("orders");
    } finally {
      setBusy(null);
    }
  }

  async function payoutAction(action: "approve" | "reject" | "paid", payoutId: string) {
    setBusy(`${action}:${payoutId}`);
    try {
      const data = await post("/api/marketplace/admin/payouts", { action, payoutId });
      setNotice(data.ok ? (fa ? "وضعیت تسویه به‌روزرسانی شد." : "Payout updated.") : String(data.error ?? "failed"));
      void load("payouts");
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    const data = await post("/api/marketplace/admin", { action: "settings", settings });
    setNotice(data.ok ? (fa ? "تنظیمات ذخیره شد." : "Settings saved.") : String(data.error ?? "failed"));
  }

  const peak = useMemo(() => (analysis?.series ?? []).reduce((max, point) => Math.max(max, point.revenueFa), 1), [analysis]);

  const VIEWS: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: fa ? "داشبورد" : "Dashboard", icon: LayoutDashboard },
    { id: "queue", label: fa ? "صف بازبینی" : "Review queue", icon: FileSearch },
    { id: "orders", label: fa ? "سفارش‌ها" : "Orders", icon: PackageCheck },
    { id: "payouts", label: fa ? "تسویه هنرمندان" : "Payouts", icon: Wallet },
    { id: "outbox", label: fa ? "ایمیل‌های ارسالی" : "Outbox", icon: Mail },
    { id: "integrations", label: fa ? "یکپارچه‌سازی‌ها" : "Integrations", icon: Boxes },
    { id: "settings", label: fa ? "تنظیمات" : "Settings", icon: Settings },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {VIEWS.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setView(entry.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                view === entry.id ? "bg-foreground text-background" : "border border-border hover:border-foreground/40"
              }`}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
              {entry.id === "queue" && status?.counts.pending ? (
                <span className="rounded-full bg-warning/20 px-2 text-caption text-warning">{status.counts.pending}</span>
              ) : null}
            </button>
          );
        })}
        <button type="button" onClick={() => void load()} className="ms-auto inline-flex items-center gap-2 text-caption text-foreground-secondary">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {fa ? "به‌روزرسانی" : "Refresh"}
        </button>
      </div>

      {notice && <p className="mt-4 rounded-xl bg-accent/10 p-3 text-caption text-accent">{notice}</p>}

      {view === "dashboard" && analysis && (
        <section className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label={fa ? "درآمد کل" : "Gross revenue"} value={formatPrice(analysis.totals.revenue, locale)} icon={BarChart3} />
            <Metric label={fa ? "سهم پلتفرم" : "Platform revenue"} value={formatPrice(analysis.totals.platformRevenue, locale)} icon={CreditCard} />
            <Metric label={fa ? "سهم هنرمندان" : "Artist payouts"} value={formatPrice(analysis.totals.artistRevenue, locale)} icon={Wallet} />
            <Metric label={fa ? "لیسنس‌های صادرشده" : "Licenses issued"} value={String(analysis.totals.licenses)} icon={BadgeCheck} />
            <Metric label={fa ? "سفارش‌ها" : "Orders"} value={String(analysis.totals.orders)} icon={PackageCheck} />
            <Metric label={fa ? "آثار منتشرشده" : "Published works"} value={String(analysis.totals.assets)} icon={Boxes} />
            <Metric label={fa ? "در انتظار بازبینی" : "Awaiting review"} value={String(analysis.totals.pendingAssets)} icon={Clock} />
            <Metric label={fa ? "مشترکان فعال" : "Active subscribers"} value={String(analysis.totals.subscribers)} icon={Percent} />
          </div>

          <div className="mt-6 rounded-2xl border border-border p-5">
            <p className="text-sm font-medium">{fa ? `درآمد ${analysis.range.days} روز گذشته` : `Revenue — last ${analysis.range.days} days`}</p>
            <div className="mt-4 flex h-40 items-end gap-1" dir="ltr">
              {analysis.series.map((point) => (
                <div
                  key={point.date}
                  title={`${point.date}: ${point.revenueFa.toLocaleString("en-US")} IRT · $${point.revenueEn}`}
                  className="flex-1 rounded-t bg-accent/70"
                  style={{ height: `${Math.max(3, (point.revenueFa / peak) * 100)}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-caption text-foreground-secondary">
              {fa
                ? `بازدید: ${analysis.totals.views} · دانلود: ${analysis.totals.downloads} · نرخ تبدیل: ${analysis.totals.conversionPct}% · بازگشت: ${analysis.totals.refunds}`
                : `Views ${analysis.totals.views} · downloads ${analysis.totals.downloads} · conversion ${analysis.totals.conversionPct}% · refunds ${analysis.totals.refunds}`}
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Panel title={fa ? "خریدهای اخیر" : "Recent orders"}>
              <ul className="space-y-2 text-caption">
                {analysis.recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">
                      <span dir="ltr">{order.id}</span> · {order.buyer}
                    </span>
                    <span className="text-foreground-secondary">{formatPrice(order.total, locale)}</span>
                  </li>
                ))}
                {analysis.recentOrders.length === 0 && <EmptyRow fa={fa} />}
              </ul>
            </Panel>
            <Panel title={fa ? "پرفروش‌ترین آثار" : "Top works"}>
              <ul className="space-y-2 text-caption">
                {analysis.topAssets.map((row) => (
                  <li key={row.assetId} className="flex items-center justify-between gap-3">
                    <span className="truncate">{fa ? row.title.fa : row.title.en}</span>
                    <span className="text-foreground-secondary">
                      {row.sales} × {formatPrice(row.revenue, locale)}
                    </span>
                  </li>
                ))}
                {analysis.topAssets.length === 0 && <EmptyRow fa={fa} />}
              </ul>
            </Panel>
            <Panel title={fa ? "تسویه‌های در انتظار" : "Pending payouts"}>
              <p className="text-caption text-foreground-secondary">
                {fa
                  ? `${analysis.pendingPayouts.count} درخواست · ${formatPrice(analysis.pendingPayouts.amount, locale)}`
                  : `${analysis.pendingPayouts.count} requests · ${formatPrice(analysis.pendingPayouts.amount, locale)}`}
              </p>
              {status && (
                <p className="mt-3 text-caption text-foreground-secondary">
                  {fa ? `انبار داده: ${status.backend}` : `Data backend: ${status.backend}`}
                </p>
              )}
              <button type="button" onClick={() => setView("payouts")} className="mt-3 rounded-full border border-border px-3 py-1.5 text-caption">
                {fa ? "مدیریت تسویه‌ها" : "Manage payouts"}
              </button>
            </Panel>
          </div>
        </section>
      )}

      {view === "queue" && (
        <section className="mt-6 space-y-4">
          {queue.length === 0 && !loading && (
            <p className="rounded-2xl border border-dashed border-border p-10 text-center text-caption text-foreground-secondary">
              {fa ? "صف بازبینی خالی است." : "The review queue is empty."}
            </p>
          )}
          {queue.map((item) => (
            <article key={item.asset.id} className="rounded-2xl border border-border p-5">
              <div className="flex flex-wrap gap-5">
                <div className="relative h-32 w-40 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                  {item.asset.media.preview && (
                    <Image
                      src={`/api/marketplace/media?key=${encodeURIComponent(item.asset.media.preview)}`}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{fa ? item.asset.title.fa : item.asset.title.en}</h3>
                    <Badge tone={item.asset.status === "pending_review" ? "warning" : item.asset.status === "rejected" ? "error" : "success"}>
                      {item.asset.status}
                    </Badge>
                    <Badge tone="outline">{item.asset.kind}</Badge>
                    {item.asset.seamless.verdict === "seamless" && <Badge tone="success">{fa ? "بی‌درز" : "Seamless"}</Badge>}
                    <Badge tone={item.asset.scan.status === "clean" ? "success" : "warning"}>scan: {item.asset.scan.status}</Badge>
                  </div>

                  <p className="mt-2 text-caption text-foreground-secondary">
                    {fa ? "هنرمند" : "Artist"}: {fa ? item.artistName.fa : item.artistName.en}
                    {item.ownerEmail ? ` · ${item.ownerEmail}` : ""}
                  </p>
                  <p className="mt-1 text-caption text-foreground-secondary" dir="ltr">
                    {item.asset.master.filename} · {(item.asset.master.sizeBytes / 1024 / 1024).toFixed(1)} MB · {item.asset.master.mime}
                  </p>
                  <p className="mt-1 text-caption text-foreground-secondary" dir="ltr">
                    sha256: {item.asset.master.sha256.slice(0, 24)}…
                  </p>

                  {(item.asset.colourways?.length ?? 0) > 0 && (
                    <div className="mt-3 rounded-lg border border-border bg-background-secondary/50 p-3">
                      <p className="text-caption font-medium">
                        {(fa ? "تحویل نهایی: " : "Delivery: ") +
                          `${item.asset.colourways!.length} ${fa ? "رنگ" : "colour(s)"} · ` +
                          (item.asset.formats ?? []).join(" · ") +
                          ` · ${(((item.asset.deliveryBytes ?? 0) / 1024 / 1024) || 0).toFixed(1)} MB`}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {item.asset.colourways!.map((colourway) => (
                          <li key={colourway.id} className="flex flex-wrap items-center gap-2 text-caption text-foreground-secondary">
                            <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: colourway.hex }} aria-hidden />
                            <span className="font-medium text-foreground">{colourway.name.fa}</span>
                            <span dir="ltr" className="text-muted">
                              {colourway.formats
                                .map((file) => `${file.formatId.toUpperCase()} ${Math.max(1, Math.round(file.sizeBytes / 1024))}KB`)
                                .join(" · ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {item.asset.review?.filesUpdatedAt && (
                        <p className="mt-2 text-caption text-warning">
                          {fa
                            ? "هنرمند بعد از انتشار فایل/رنگ تازه اضافه کرده است — همین موارد را دوباره بررسی کنید."
                            : "The artist added files/colours after publication — review the new set."}
                        </p>
                      )}
                    </div>
                  )}

                  {item.warnings.length > 0 && (
                    <ul className="mt-2 space-y-1 text-caption text-warning">
                      {item.warnings.map((warning) => (
                        <li key={warning.en} className="flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {fa ? warning.fa : warning.en}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-caption">
                    {item.asset.media.mockups.slice(0, 4).map((mockup) => (
                      <a
                        key={mockup.key}
                        href={`/api/marketplace/media?key=${encodeURIComponent(mockup.key)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border px-3 py-1.5"
                      >
                        {fa ? "ماکاپ" : "Mockup"} · {mockup.kind}
                      </a>
                    ))}
                    {item.asset.media.tile && (
                      <a
                        href={`/api/marketplace/media?key=${encodeURIComponent(item.asset.media.tile)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border px-3 py-1.5"
                      >
                        {fa ? "کاشی تکرار" : "Repeat tile"}
                      </a>
                    )}
                    <Link href={href(locale, `/marketplace/${item.asset.slug}`)} className="rounded-full border border-border px-3 py-1.5">
                      {fa ? "صفحه اثر" : "Asset page"}
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <input
                      value={rejectNote[item.asset.id] ?? ""}
                      onChange={(event) => setRejectNote({ ...rejectNote, [item.asset.id]: event.target.value })}
                      placeholder={fa ? "دلیل رد (اختیاری)" : "Reason (optional)"}
                      className="min-w-48 flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-caption"
                    />
                    <button
                      type="button"
                      disabled={busy === `approve:${item.asset.id}`}
                      onClick={() => review("approve", item.asset.id)}
                      className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-caption text-background disabled:opacity-60"
                    >
                      {busy === `approve:${item.asset.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {fa ? "تأیید و انتشار" : "Approve & publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => review("reject", item.asset.id, rejectNote[item.asset.id])}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-caption hover:border-error hover:text-error"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {fa ? "رد" : "Reject"}
                    </button>
                    <button
                      type="button"
                      onClick={() => review("rescan", item.asset.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-caption"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {fa ? "اسکن مجدد" : "Rescan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => review("regenerate", item.asset.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-caption"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {fa ? "بازسازی پیش‌نمایش" : "Rebuild previews"}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {view === "orders" && (
        <section className="mt-6">
          <div className="flex gap-2">
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void load("orders");
              }}
              placeholder={fa ? "جستجوی شماره سفارش، نام یا ایمیل…" : "Search order, name or e-mail…"}
              className="flex-1 rounded-full border border-border bg-transparent px-4 py-2 text-sm"
            />
            <button type="button" onClick={() => void load("orders")} className="rounded-full border border-border px-4 py-2 text-sm">
              {fa ? "جستجو" : "Search"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-caption">
              <thead className="text-foreground-secondary">
                <tr className="text-start">
                  <th className="p-2 text-start">{fa ? "سفارش" : "Order"}</th>
                  <th className="p-2 text-start">{fa ? "خریدار" : "Buyer"}</th>
                  <th className="p-2 text-start">{fa ? "مبلغ" : "Total"}</th>
                  <th className="p-2 text-start">{fa ? "وضعیت" : "Status"}</th>
                  <th className="p-2 text-start">{fa ? "تحویل" : "Delivery"}</th>
                  <th className="p-2 text-start">{fa ? "عملیات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="p-2" dir="ltr">
                      {order.id}
                    </td>
                    <td className="p-2">
                      {order.buyer.name}
                      <span className="block text-foreground-secondary" dir="ltr">
                        {order.buyer.email}
                      </span>
                    </td>
                    <td className="p-2">{formatPrice(order.total, locale)}</td>
                    <td className="p-2">
                      <Badge tone={order.status === "paid" ? "success" : order.status === "refunded" ? "error" : "warning"}>{order.status}</Badge>
                    </td>
                    <td className="p-2">{order.fulfillment?.completedAt ? (fa ? "انجام‌شده" : "complete") : "—"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => orderAction("fulfill", order.id)}
                          className="rounded-full border border-border px-2 py-1"
                          disabled={busy === `fulfill:${order.id}`}
                        >
                          {fa ? "صدور لایسنس" : "Fulfil"}
                        </button>
                        <button type="button" onClick={() => orderAction("deliver_again", order.id)} className="rounded-full border border-border px-2 py-1">
                          {fa ? "ارسال مجدد ایمیل" : "Re-send mail"}
                        </button>
                        <button
                          type="button"
                          onClick={() => orderAction("refund", order.id)}
                          className="rounded-full border border-border px-2 py-1 hover:border-error hover:text-error"
                        >
                          {fa ? "بازگشت وجه" : "Refund"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-foreground-secondary">
                      {fa ? "سفارشی ثبت نشده است." : "No orders yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === "payouts" && payouts && (
        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border p-5 lg:col-span-1">
            <p className="text-sm font-medium">{fa ? "خلاصه تسویه‌ها" : "Payout summary"}</p>
            <dl className="mt-3 space-y-2 text-caption">
              {(["requested", "approved", "paid", "rejected"] as const).map((key) => (
                <div key={key} className="flex justify-between">
                  <dt className="text-foreground-secondary">{key}</dt>
                  <dd>{formatPrice(payouts.summary[key] ?? { fa: 0, en: 0 }, locale)}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-border p-5 lg:col-span-2">
            <p className="text-sm font-medium">{fa ? "درخواست‌های در انتظار" : "Pending requests"}</p>
            <ul className="mt-3 space-y-3 text-caption">
              {payouts.pending.map((payout) => (
                <li key={payout.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{formatPrice(payout.amount, locale)}</span>
                    <span className="text-foreground-secondary">
                      {payout.method} · <span dir="ltr">{payout.destination}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-foreground-secondary">
                    {fa ? "هنرمند" : "Artist"}: <span dir="ltr">{payout.artistId}</span> ·{" "}
                    {new Date(payout.requestedAt).toLocaleDateString(fa ? "fa-IR" : "en-GB")}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => payoutAction("approve", payout.id)} className="rounded-full border border-border px-3 py-1.5">
                      {fa ? "تأیید" : "Approve"}
                    </button>
                    <button type="button" onClick={() => payoutAction("paid", payout.id)} className="rounded-full bg-foreground px-3 py-1.5 text-background">
                      {fa ? "پرداخت شد" : "Mark paid"}
                    </button>
                    <button
                      type="button"
                      onClick={() => payoutAction("reject", payout.id)}
                      className="rounded-full border border-border px-3 py-1.5 hover:border-error hover:text-error"
                    >
                      {fa ? "رد" : "Reject"}
                    </button>
                  </div>
                </li>
              ))}
              {payouts.pending.length === 0 && <EmptyRow fa={fa} />}
            </ul>

            {payouts.recent.length > 0 && (
              <>
                <p className="mt-6 text-sm font-medium">{fa ? "آخرین تسویه‌ها" : "Recent payouts"}</p>
                <ul className="mt-2 space-y-1 text-caption text-foreground-secondary">
                  {payouts.recent.slice(0, 8).map((payout) => (
                    <li key={payout.id} className="flex justify-between">
                      <span dir="ltr">{payout.id}</span>
                      <span>
                        {formatPrice(payout.amount, locale)} · {payout.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {view === "outbox" && (
        <section className="mt-6 space-y-3">
          <p className="text-caption text-foreground-secondary">
            {fa
              ? "هر ایمیل تراکنشی اینجا ثبت می‌شود؛ اگر ارسال نشده باشد می‌توانید دوباره بفرستید."
              : "Every transactional e-mail is recorded here; failed ones can be re-sent."}
          </p>
          {outbox.map((message) => (
            <article key={message.id} className="rounded-xl border border-border p-4 text-caption">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium" dir="ltr">
                  {message.to}
                </span>
                <Badge tone={message.status === "sent" ? "success" : message.status === "failed" ? "error" : "neutral"}>{message.status}</Badge>
              </div>
              <p className="mt-1">{message.subject}</p>
              <p className="mt-1 text-foreground-secondary" dir="ltr">
                {message.kind} · {new Date(message.createdAt).toISOString().slice(0, 16).replace("T", " ")}
              </p>
              {message.error && <p className="mt-1 text-error" dir="ltr">{message.error}</p>}
              {(message.status === "failed" || message.status === "queued") && (
                <button
                  type="button"
                  onClick={async () => {
                    const data = await post("/api/marketplace/admin", { action: "retry_mail", messageId: message.id });
                    setNotice(data.ok ? (fa ? "ارسال مجدد انجام شد." : "Re-sent.") : String(data.error ?? "failed"));
                    void load("outbox");
                  }}
                  className="mt-2 rounded-full border border-border px-3 py-1.5"
                >
                  {fa ? "ارسال مجدد" : "Retry"}
                </button>
              )}
            </article>
          ))}
          {outbox.length === 0 && <EmptyRow fa={fa} />}
        </section>
      )}

      {view === "integrations" && status && (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {status.integrations.map((integration) => (
            <div key={integration.id} className="rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{fa ? integration.label.fa : integration.label.en}</p>
                <Badge tone={integration.configured ? "success" : "warning"}>
                  {integration.configured ? (fa ? "فعال" : "configured") : fa ? "غیرفعال" : "not configured"}
                </Badge>
              </div>
              <p className="mt-2 text-caption text-foreground-secondary" dir="ltr">
                mode: {integration.mode}
              </p>
              <p className="mt-1 text-caption leading-relaxed text-foreground-secondary">{integration.note}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-border p-5 md:col-span-2">
            <p className="font-medium">{fa ? "وضعیت داده‌ها" : "Data"}</p>
            <div className="mt-3 grid gap-2 text-caption sm:grid-cols-4">
              {Object.entries(status.counts).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-background-secondary px-3 py-2">
                  <p className="text-foreground-secondary">{key}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-caption text-foreground-secondary">
              {fa ? `انبار داده فعال: ${status.backend}` : `Active data backend: ${status.backend}`}
            </p>
            <button
              type="button"
              onClick={async () => {
                const data = await post("/api/marketplace/admin", { action: "sweep_sandbox" });
                setNotice(
                  data.ok
                    ? fa
                      ? "تراکنش‌های آزمایشی تسویه شد."
                      : "Sandbox transactions reconciled."
                    : String(data.error ?? "failed"),
                );
                void load("integrations");
              }}
              className="mt-3 rounded-full border border-border px-4 py-2 text-caption"
            >
              {fa ? "تسویه تراکنش‌های آزمایشی معلق" : "Reconcile stuck sandbox payments"}
            </button>
          </div>
        </section>
      )}

      {view === "settings" && settings && (
        <section className="mt-6 max-w-2xl space-y-4 rounded-2xl border border-border p-6">
          <NumberField
            label={fa ? "مالیات بر ارزش افزوده (٪)" : "VAT (%)"}
            value={settings.vatPct}
            onChange={(value) => setSettings({ ...settings, vatPct: value })}
          />
          <NumberField
            label={fa ? "سهم پیش‌فرض هنرمند (٪)" : "Default artist share (%)"}
            value={settings.artistSharePct}
            onChange={(value) => setSettings({ ...settings, artistSharePct: value })}
          />
          <NumberField
            label={fa ? "کمیسیون معرف (٪)" : "Referral commission (%)"}
            value={settings.affiliatePct}
            onChange={(value) => setSettings({ ...settings, affiliatePct: value })}
          />
          <NumberField
            label={fa ? "تخفیف پیش‌فرض کد معرف (٪)" : "Default referral discount (%)"}
            value={settings.affiliateDiscountPct}
            onChange={(value) => setSettings({ ...settings, affiliateDiscountPct: value })}
          />
          <NumberField
            label={fa ? "حداقل تسویه (تومان)" : "Minimum payout (toman)"}
            value={settings.payoutMinimumFa}
            onChange={(value) => setSettings({ ...settings, payoutMinimumFa: value })}
          />
          <NumberField
            label={fa ? "حداقل تسویه (دلار)" : "Minimum payout (USD)"}
            value={settings.payoutMinimumEn}
            onChange={(value) => setSettings({ ...settings, payoutMinimumEn: value })}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.emailOnSale}
              onChange={(event) => setSettings({ ...settings, emailOnSale: event.target.checked })}
            />
            {fa ? "ارسال ایمیل فروش به هنرمند" : "E-mail the artist on every sale"}
          </label>
          <button type="button" onClick={saveSettings} className="rounded-full bg-foreground px-5 py-3 text-sm text-background">
            {fa ? "ذخیره تنظیمات" : "Save settings"}
          </button>
          <p className="text-caption text-foreground-secondary">
            {fa
              ? "این مقادیر فقط پیش‌فرض هستند؛ هنرمند می‌تواند برای هر اثر سهم متفاوتی داشته باشد (در دیتابیس ثبت می‌شود)."
              : "These are defaults; per-asset overrides are honoured when present."}
          </p>
        </section>
      )}

      {loading && (
        <p className="mt-6 flex items-center gap-2 text-caption text-foreground-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {fa ? "بارگذاری…" : "Loading…"}
        </p>
      )}
      <p className="mt-8 text-caption text-foreground-secondary">{dict.common.siteExclusive}</p>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BarChart3 }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="flex items-center gap-2 text-caption text-foreground-secondary">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 font-display text-xl">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border p-5">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyRow({ fa }: { fa: boolean }) {
  return <li className="text-foreground-secondary">{fa ? "موردی ثبت نشده است." : "Nothing recorded yet."}</li>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-foreground-secondary">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-2"
        dir="ltr"
      />
    </label>
  );
}
