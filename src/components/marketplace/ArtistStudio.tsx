"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Banknote,
  BadgePercent,
  CheckCircle2,
  Clock,
  Copy,
  Palette,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  Wallet,
} from "lucide-react";
import { MasterUploader } from "@/components/marketplace/MasterUploader";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, href } from "@/lib/utils";
import { SESSION_FETCH } from "@/lib/http";
import { familyName } from "@/lib/data/families";
import { formatLabel } from "@/lib/marketplace/formats";
import type { PricePair } from "@/lib/marketplace/types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Artist studio: everything a creator does after signing in —
 * submit a master, watch its review state, price the tiers, track royalties and
 * request a payout, read the sales analytics and manage referral codes.
 */

type Tab = "assets" | "upload" | "wallet" | "analytics" | "affiliate";

interface StudioAsset {
  id: string;
  slug: string;
  title: Localized;
  kind: string;
  tags: string[];
  /** Product family chosen on upload (see `lib/data/families.ts`). */
  familyId?: string | null;
  status: string;
  visibility: string;
  createdAt: string;
  rejectionNote?: string;
  review?: { reviewedBy?: string; reviewedAt?: string; note?: string };
  master: { filename: string; sizeBytes: number; sha256: string };
  scan: { engine: string; status: string };
  seamless: { verdict: string; score: number };
  tiers: { id: string; kind: string; title: Localized; price: PricePair; enabled: boolean; maxDownloads: number; maxUnits: number }[];
  media: { preview: string | null; tile: string | null; thumbs: string[]; mockups: { key: string; kind: string }[] };
  /** Delivered colour versions and the formats inside each of them. */
  formats?: string[];
  colourways?: { id: string; name: Localized; hex: string; preview: string | null; formats: string[]; bytes: number }[];
  deliveryBytes?: number;
  /** Set when files/colours were added after approval — the work is re-reviewed. */
  filesUpdatedAt?: string | null;
  stats: { views: number; sales: number; revenue: PricePair };
  sales: { fa: number; en: number; sales: number };
}

interface Upload {
  id: string;
  status: string;
  filename: string;
  sizeBytes: number;
  mode: string;
  parts: number;
}

interface WalletData {
  balance: { total: PricePair; paidOut: PricePair; pending: PricePair; available: PricePair; salesCount: number };
  minimum: PricePair;
  licenses: number;
  monthly: { month: string; amount: PricePair }[];
  profile: { method: string; iban?: string; cardNumber?: string; paypalEmail?: string; holder: string } | null;
  payouts: { id: string; amount: PricePair; status: string; requestedAt: string; method: string; reference?: string }[];
  ledger: { id: string; kind: string; amount: PricePair; note?: Localized; createdAt: string }[];
}

interface AnalyticsData {
  range: { from: string; to: string; days: number };
  totals: {
    revenue: PricePair;
    royalties: PricePair;
    sales: number;
    refunds: number;
    views: number;
    conversionPct: number;
    downloads: number;
    averageOrder: PricePair;
  };
  series: { date: string; revenueFa: number; revenueEn: number; orders: number; downloads: number }[];
  topAssets: { assetId: string; title: Localized; sales: number; revenue: PricePair }[];
  byLicense: { kind: string; sales: number; revenue: PricePair }[];
  byCountry: { country: string; sales: number; revenue: PricePair }[];
  byProvider: { provider: string; sales: number; revenue: PricePair }[];
  subscribers: number;
}

interface CouponRow {
  code: string;
  kind: string;
  percent?: number;
  redemptions: number;
  maxRedemptions?: number;
  active: boolean;
  affiliatePct?: number;
  shareUrl: string;
  stats: { clicks: number; conversions: number; commission: PricePair; revenue: PricePair };
}

const STATUS_TONE: Record<string, "success" | "warning" | "error" | "neutral" | "accent"> = {
  approved: "success",
  pending_review: "warning",
  rejected: "error",
  sold_exclusive: "accent",
  uploading: "neutral",
  scanning: "neutral",
  delisted: "neutral",
};

const STUDIO_TABS: Tab[] = ["assets", "upload", "wallet", "analytics", "affiliate"];

function isStudioTab(value: string | null): value is Tab {
  return value !== null && (STUDIO_TABS as string[]).includes(value);
}

export function ArtistStudio({ locale }: { locale: "fa" | "en" }) {
  useLocale();
  const fa = locale === "fa";
  const router = useRouter();
  const searchParams = useSearchParams();
  /* ?tab= keeps the dashboard's quick actions working (and the tab shareable). */
  const [tab, setTab] = useState<Tab>(() => {
    const requested = searchParams.get("tab");
    return isStudioTab(requested) ? requested : "assets";
  });
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [affiliatePct, setAffiliatePct] = useState(10);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [profileForm, setProfileForm] = useState({ method: "iban", iban: "", cardNumber: "", paypalEmail: "", holder: "" });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetsRes, walletRes, analyticsRes, affiliateRes] = await Promise.all([
        fetch("/api/marketplace/artist/assets", SESSION_FETCH),
        fetch("/api/marketplace/artist/payouts", SESSION_FETCH),
        fetch(`/api/marketplace/artist/analytics?days=${days}`, SESSION_FETCH),
        fetch(`/api/marketplace/artist/affiliate?locale=${locale}`, SESSION_FETCH),
      ]);

      const assetsData = (await assetsRes.json()) as { ok?: boolean; assets?: StudioAsset[]; uploads?: Upload[]; error?: string };
      if (!assetsData.ok) {
        setError(assetsData.error === "forbidden" ? (fa ? "این بخش مخصوص هنرمندان است." : "This area is for artists.") : assetsData.error ?? "failed");
        return;
      }
      setAssets(assetsData.assets ?? []);
      setUploads(assetsData.uploads ?? []);

      const walletData = (await walletRes.json()) as { ok?: boolean; wallet?: WalletData };
      if (walletData.wallet) {
        setWallet(walletData.wallet);
        if (walletData.wallet.profile) {
          setProfileForm({
            method: walletData.wallet.profile.method,
            iban: walletData.wallet.profile.iban ?? "",
            cardNumber: walletData.wallet.profile.cardNumber ?? "",
            paypalEmail: walletData.wallet.profile.paypalEmail ?? "",
            holder: walletData.wallet.profile.holder ?? "",
          });
        }
      }

      const analyticsData = (await analyticsRes.json()) as { ok?: boolean; analytics?: AnalyticsData };
      if (analyticsData.analytics) setAnalytics(analyticsData.analytics);

      const affiliateData = (await affiliateRes.json()) as { ok?: boolean; coupons?: CouponRow[]; affiliatePct?: number };
      setCoupons(affiliateData.coupons ?? []);
      if (affiliateData.affiliatePct) setAffiliatePct(affiliateData.affiliatePct);
    } finally {
      setLoading(false);
    }
  }, [days, fa, locale]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const current = new URLSearchParams(window.location.search).get("tab");
    if (current === tab) return;
    router.replace(`${window.location.pathname}?tab=${tab}`, { scroll: false });
  }, [tab, router]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function saveTiers(asset: StudioAsset, patch: { id: string; priceFa: number; priceEn: number; enabled: boolean }[]) {
    const response = await fetch("/api/marketplace/artist/assets", {
      ...SESSION_FETCH,
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: asset.id, tiers: patch }),
    });
    const data = (await response.json()) as { ok?: boolean };
    setNotice(data.ok ? (fa ? "قیمت‌ها ذخیره شد." : "Prices saved.") : fa ? "ذخیره نشد." : "Could not save.");
    if (data.ok) void loadAll();
  }

  async function requestPayout() {
    const response = await fetch("/api/marketplace/artist/payouts", {
      ...SESSION_FETCH,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "request" }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (data.ok) setNotice(fa ? "درخواست تسویه ثبت شد." : "Payout request submitted.");
    else
      setError(
        data.error === "below_minimum"
          ? fa
            ? "موجودی شما کمتر از حداقل تسویه است."
            : "Your balance is below the payout minimum."
          : data.error === "no_profile"
            ? fa
              ? "اول اطلاعات حساب تسویه را ثبت کنید."
              : "Save your payout account first."
            : data.error ?? "failed",
      );
    void loadAll();
  }

  async function saveProfile() {
    const response = await fetch("/api/marketplace/artist/payouts", {
      ...SESSION_FETCH,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "profile", ...profileForm, accountHolder: profileForm.holder }),
    });
    const data = (await response.json()) as { ok?: boolean };
    setNotice(data.ok ? (fa ? "اطلاعات تسویه ذخیره شد." : "Payout details saved.") : fa ? "ذخیره نشد." : "Could not save.");
    void loadAll();
  }

  async function createCoupon() {
    if (!newCode.trim()) return;
    const response = await fetch("/api/marketplace/artist/affiliate", {
      ...SESSION_FETCH,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", code: newCode, kind: "percent", asAffiliate: true }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    setNotice(data.ok ? (fa ? "کد ساخته شد." : "Code created.") : data.error ?? "failed");
    setNewCode("");
    void loadAll();
  }

  const totals = analytics?.totals;
  const peak = useMemo(
    () => (analytics?.series ?? []).reduce((max, point) => Math.max(max, point.revenueFa, point.revenueEn * 1000), 1),
    [analytics],
  );

  const TABS: { id: Tab; label: string; icon: typeof UploadCloud }[] = [
    { id: "assets", label: fa ? "آثار من" : "My works", icon: CheckCircle2 },
    { id: "upload", label: fa ? "ارسال فایل مادر" : "Submit master", icon: UploadCloud },
    { id: "wallet", label: fa ? "کیف پول و تسویه" : "Wallet & payouts", icon: Wallet },
    { id: "analytics", label: fa ? "تحلیل فروش" : "Analytics", icon: BarChart3 },
    { id: "affiliate", label: fa ? "کدهای معرف" : "Referral codes", icon: BadgePercent },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                tab === entry.id ? "bg-foreground text-background" : "border border-border hover:border-foreground/40"
              }`}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </button>
          );
        })}
        <button type="button" onClick={() => void loadAll()} className="ms-auto inline-flex items-center gap-2 text-caption text-foreground-secondary">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {fa ? "به‌روزرسانی" : "Refresh"}
        </button>
      </div>

      {notice && <p className="mt-4 rounded-xl bg-success/10 p-3 text-caption text-success">{notice}</p>}
      {error && <p className="mt-4 rounded-xl bg-error/10 p-3 text-caption text-error">{error}</p>}

      {tab === "assets" && (
        <section className="mt-6">
          {uploads.length > 0 && (
            <div className="mb-6 rounded-xl border border-border p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-accent" />
                {fa ? "آپلودهای نیمه‌تمام" : "Uploads in progress"}
              </p>
              <ul className="mt-3 space-y-2 text-caption">
                {uploads.map((upload) => (
                  <li key={upload.id} className="flex items-center justify-between gap-3">
                    <span className="truncate" dir="ltr">{upload.filename}</span>
                    <span className="text-foreground-secondary">
                      {(upload.sizeBytes / 1024 / 1024).toFixed(1)} MB · {upload.mode} · {upload.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {assets.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <UploadCloud className="mx-auto h-6 w-6 text-accent" />
              <p className="mt-3 font-medium">{fa ? "هنوز اثری ارسال نکرده‌اید" : "You have not submitted a work yet"}</p>
              <p className="mt-1 text-caption text-foreground-secondary">
                {fa
                  ? "فایل مادر را در تب «ارسال فایل مادر» بارگذاری کنید؛ پس از بازبینی مدیر منتشر می‌شود."
                  : "Upload a master in the “Submit master” tab — it goes live after admin review."}
              </p>
              <button type="button" onClick={() => setTab("upload")} className="mt-4 rounded-full bg-foreground px-4 py-2 text-sm text-background">
                {fa ? "شروع کنید" : "Get started"}
              </button>
            </div>
          )}

          <div className="grid gap-4">
            {assets.map((asset) => (
              <article key={asset.id} className="rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                    {asset.media.preview && (
                      <Image
                        src={`/api/marketplace/media?key=${encodeURIComponent(asset.media.preview)}`}
                        alt=""
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium">{fa ? asset.title.fa : asset.title.en}</h3>
                      <Badge tone={STATUS_TONE[asset.status] ?? "neutral"}>
                        {asset.status === "pending_review"
                          ? fa
                            ? "در صف بازبینی"
                            : "In review"
                          : asset.status === "approved"
                            ? fa
                              ? "منتشرشده"
                              : "Published"
                            : asset.status === "rejected"
                              ? fa
                                ? "رد شده"
                                : "Rejected"
                              : asset.status === "sold_exclusive"
                                ? fa
                                  ? "انحصاری فروخته شد"
                                  : "Sold exclusively"
                                : asset.status}
                      </Badge>
                      {asset.familyId && <Badge tone="neutral">{familyName(asset.familyId, locale)}</Badge>}
                      {asset.visibility === "private" && asset.status === "approved" && <Badge tone="outline">{fa ? "پنهان" : "Hidden"}</Badge>}
                    </div>

                    <p className="mt-2 text-caption text-foreground-secondary">
                      {fa ? "فروش" : "Sales"}: <b>{asset.sales.sales}</b> · {fa ? "درآمد" : "Revenue"}:{" "}
                      <b>{formatPrice(asset.sales as PricePair, locale)}</b> · {fa ? "بازدید" : "Views"}: {asset.stats.views}
                    </p>
                    <p className="mt-1 text-caption text-foreground-secondary">
                      {fa ? "اسکن" : "Scan"}: {asset.scan.engine}/{asset.scan.status} ·{" "}
                      {fa ? "درزبندی" : "seam"}: {asset.seamless.verdict} ({(asset.seamless.score * 100).toFixed(0)}%)
                    </p>

                    {(asset.colourways?.length ?? 0) > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="flex flex-wrap items-center gap-2 text-caption text-foreground-secondary">
                          <Palette className="h-3.5 w-3.5 text-accent" />
                          {fa
                            ? `${asset.colourways!.length} رنگ · ${(asset.deliveryBytes ?? 0) >= 1048576 ? `${((asset.deliveryBytes ?? 0) / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((asset.deliveryBytes ?? 0) / 1024))} KB`} تحویل`
                            : `${asset.colourways!.length} colour(s) · ${(asset.deliveryBytes ?? 0) >= 1048576 ? `${((asset.deliveryBytes ?? 0) / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((asset.deliveryBytes ?? 0) / 1024))} KB`} delivered`}
                        </p>
                        <ul className="flex flex-wrap gap-2">
                          {asset.colourways!.map((colourway) => (
                            <li
                              key={colourway.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]"
                            >
                              <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: colourway.hex }} aria-hidden />
                              {colourway.name[locale] ?? colourway.name.fa}
                              <span className="text-muted" dir="ltr">
                                {colourway.formats.map((id) => formatLabel(id, locale)).join(" · ")}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {asset.filesUpdatedAt && (
                          <p className="text-caption text-accent">
                            {fa
                              ? "فایل/رنگ تازه‌ای اضافه شده و اثر برای بازبینی دوباره در صف است."
                              : "New files/colours were added — the work is back in the review queue."}
                          </p>
                        )}
                      </div>
                    )}
                    {asset.rejectionNote && <p className="mt-2 text-caption text-error">{asset.rejectionNote}</p>}

                    <div className="mt-3 flex flex-wrap gap-2 text-caption">
                      {asset.status === "approved" && (
                        <Link href={href(locale, `/marketplace/${asset.slug}`)} className="rounded-full border border-border px-3 py-1.5">
                          {fa ? "مشاهده در فروشگاه" : "View in shop"}
                        </Link>
                      )}
                      {asset.media.tile && (
                        <a
                          href={`/api/marketplace/media?key=${encodeURIComponent(asset.media.tile)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-border px-3 py-1.5"
                        >
                          {fa ? "پیش‌نمایش کاشی" : "Tile preview"}
                        </a>
                      )}
                      {asset.media.mockups.slice(0, 3).map((mockup) => (
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
                    </div>
                  </div>
                </div>

                <TierEditor asset={asset} locale={locale} onSave={(patch) => saveTiers(asset, patch)} />
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "upload" && (
        <section className="mt-6 rounded-2xl border border-border p-6">
          <h2 className="font-display text-h3">{fa ? "ارسال فایل مادر" : "Submit a master file"}</h2>
          <p className="mt-1 text-caption leading-relaxed text-foreground-secondary">
            {fa
              ? "فایل شما خصوصی ذخیره می‌شود، اسکن ویروس می‌گردد، پیش‌نمایش واترمارک‌شده و ماکاپ ساخته می‌شود و برای بازبینی به مدیر می‌رود. فایل‌های بیش از ۲۰۰ مگابایت به‌صورت چندبخشی آپلود می‌شوند."
              : "Your file is stored privately, virus-scanned, watermarked previews and mockups are generated, and it is queued for review. Files over 200 MB upload in chunks."}
          </p>
          <div className="mt-5">
            <MasterUploader onUploaded={() => void loadAll()} />
          </div>
        </section>
      )}

      {tab === "wallet" && (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border p-6">
            <p className="flex items-center gap-2 font-medium">
              <Banknote className="h-4 w-4 text-accent" />
              {fa ? "موجودی و تسویه" : "Balance & payouts"}
            </p>
            {wallet ? (
              <>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-foreground-secondary">{fa ? "قابل تسویه" : "Available"}</dt>
                    <dd className="font-medium">{formatPrice(wallet.balance.available, locale)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground-secondary">{fa ? "در انتظار تسویه" : "Pending"}</dt>
                    <dd>{formatPrice(wallet.balance.pending, locale)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-foreground-secondary">{fa ? "تسویه‌شده" : "Paid out"}</dt>
                    <dd>{formatPrice(wallet.balance.paidOut, locale)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <dt className="text-foreground-secondary">{fa ? "کل درآمد" : "Lifetime"}</dt>
                    <dd className="font-medium">{formatPrice(wallet.balance.total, locale)}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-caption text-foreground-secondary">
                  {fa
                    ? `${wallet.balance.salesCount} فروش · حداقل تسویه ${formatPrice(wallet.minimum, locale)}`
                    : `${wallet.balance.salesCount} sales · minimum payout ${formatPrice(wallet.minimum, locale)}`}
                </p>

                <button
                  type="button"
                  onClick={requestPayout}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background"
                >
                  <Banknote className="h-4 w-4" />
                  {fa ? "درخواست تسویه" : "Request payout"}
                </button>

                {wallet.payouts.length > 0 && (
                  <ul className="mt-5 space-y-2 text-caption">
                    {wallet.payouts.slice(0, 6).map((payout) => (
                      <li key={payout.id} className="flex items-center justify-between gap-3 rounded-lg bg-background-secondary px-3 py-2">
                        <span>{formatPrice(payout.amount, locale)}</span>
                        <span className="text-foreground-secondary">
                          {payout.status} · {new Date(payout.requestedAt).toLocaleDateString(fa ? "fa-IR" : "en-GB")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="mt-3 text-caption text-foreground-secondary">{fa ? "اطلاعاتی موجود نیست." : "Nothing to show yet."}</p>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border p-6">
              <p className="font-medium">{fa ? "اطلاعات حساب تسویه" : "Payout account"}</p>
              <div className="mt-4 space-y-3">
                <label className="block text-caption">
                  {fa ? "روش" : "Method"}
                  <select
                    value={profileForm.method}
                    onChange={(event) => setProfileForm({ ...profileForm, method: event.target.value })}
                    className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="iban">{fa ? "شبا (ایران)" : "IBAN (Iran)"}</option>
                    <option value="card">{fa ? "کارت به کارت" : "Card transfer"}</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </label>
                {profileForm.method === "iban" && (
                  <input
                    value={profileForm.iban}
                    onChange={(event) => setProfileForm({ ...profileForm, iban: event.target.value })}
                    placeholder="IR820540102680020817909002"
                    dir="ltr"
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  />
                )}
                {profileForm.method === "card" && (
                  <input
                    value={profileForm.cardNumber}
                    onChange={(event) => setProfileForm({ ...profileForm, cardNumber: event.target.value })}
                    placeholder="6104-3381-0000-0000"
                    dir="ltr"
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  />
                )}
                {profileForm.method === "paypal" && (
                  <input
                    value={profileForm.paypalEmail}
                    onChange={(event) => setProfileForm({ ...profileForm, paypalEmail: event.target.value })}
                    placeholder="artist@example.com"
                    dir="ltr"
                    className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                  />
                )}
                <input
                  value={profileForm.holder}
                  onChange={(event) => setProfileForm({ ...profileForm, holder: event.target.value })}
                  placeholder={fa ? "نام صاحب حساب" : "Account holder"}
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
                />
                <button type="button" onClick={saveProfile} className="w-full rounded-full border border-border px-4 py-2 text-sm">
                  {fa ? "ذخیره اطلاعات تسویه" : "Save payout details"}
                </button>
              </div>
            </div>

            {wallet && wallet.ledger.length > 0 && (
              <div className="rounded-2xl border border-border p-6">
                <p className="font-medium">{fa ? "دفتر مالی (آخرین تراکنش‌ها)" : "Ledger (latest)"}</p>
                <ul className="mt-3 space-y-2 text-caption">
                  {wallet.ledger.slice(0, 8).map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{fa ? entry.note?.fa ?? entry.kind : entry.note?.en ?? entry.kind}</span>
                      <span className={entry.amount.fa < 0 ? "text-error" : "text-success"}>{formatPrice(entry.amount, locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "analytics" && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-h3">{fa ? "تحلیل فروش" : "Sales analytics"}</h2>
            <div className="flex gap-1">
              {[7, 30, 90].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  className={`rounded-full border px-3 py-1.5 text-caption ${
                    days === value ? "border-accent bg-accent/10 text-accent" : "border-border"
                  }`}
                >
                  {fa ? `${value} روز` : `${value}d`}
                </button>
              ))}
            </div>
          </div>

          {totals && (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label={fa ? "فروش" : "Sales"} value={String(totals.sales)} />
                <Metric label={fa ? "درآمد" : "Revenue"} value={formatPrice(totals.revenue, locale)} />
                <Metric label={fa ? "سهم شما" : "Your royalties"} value={formatPrice(totals.royalties, locale)} />
                <Metric label={fa ? "نرخ تبدیل" : "Conversion"} value={`${totals.conversionPct}%`} />
              </div>

              <div className="mt-6 rounded-2xl border border-border p-5">
                <p className="text-sm font-medium">{fa ? "نمودار درآمد روزانه" : "Daily revenue"}</p>
                <div className="mt-4 flex h-40 items-end gap-1" dir="ltr">
                  {analytics!.series.map((point) => (
                    <div
                      key={point.date}
                      title={`${point.date}: ${point.revenueFa.toLocaleString("en-US")} IRT / $${point.revenueEn}`}
                      className="flex-1 rounded-t bg-accent/70"
                      style={{ height: `${Math.max(3, ((point.revenueFa * (peak / Math.max(peak, 1))) / peak) * 100)}%` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-caption text-foreground-secondary">
                  {fa ? `از ${analytics!.range.from} تا ${analytics!.range.to}` : `${analytics!.range.from} → ${analytics!.range.to}`}
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Panel title={fa ? "پرفروش‌ترین آثار" : "Top works"}>
                  {analytics!.topAssets.length === 0 ? (
                    <Empty fa={fa} />
                  ) : (
                    <ul className="space-y-2 text-caption">
                      {analytics!.topAssets.map((row) => (
                        <li key={row.assetId} className="flex items-center justify-between gap-3">
                          <span className="truncate">{fa ? row.title.fa : row.title.en}</span>
                          <span className="text-foreground-secondary">
                            {row.sales} × {formatPrice(row.revenue, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title={fa ? "ترکیب لایسنس‌ها" : "License mix"}>
                  {analytics!.byLicense.length === 0 ? (
                    <Empty fa={fa} />
                  ) : (
                    <ul className="space-y-2 text-caption">
                      {analytics!.byLicense.map((row) => (
                        <li key={row.kind} className="flex items-center justify-between gap-3">
                          <span>{row.kind}</span>
                          <span className="text-foreground-secondary">
                            {row.sales} × {formatPrice(row.revenue, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title={fa ? "کشور خریداران" : "Buyer countries"}>
                  {analytics!.byCountry.length === 0 ? (
                    <Empty fa={fa} />
                  ) : (
                    <ul className="space-y-2 text-caption">
                      {analytics!.byCountry.map((row) => (
                        <li key={row.country} className="flex items-center justify-between gap-3">
                          <span dir="ltr">{row.country}</span>
                          <span className="text-foreground-secondary">
                            {row.sales} × {formatPrice(row.revenue, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <Panel title={fa ? "درگاه‌های پرداخت" : "Gateway split"}>
                  {analytics!.byProvider.length === 0 ? (
                    <Empty fa={fa} />
                  ) : (
                    <ul className="space-y-2 text-caption">
                      {analytics!.byProvider.map((row) => (
                        <li key={row.provider} className="flex items-center justify-between gap-3">
                          <span>{row.provider}</span>
                          <span className="text-foreground-secondary">
                            {row.sales} × {formatPrice(row.revenue, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-caption text-foreground-secondary">
                    {fa ? `مشترکان فعال پلتفرم: ${analytics!.subscribers}` : `Active platform subscribers: ${analytics!.subscribers}`}
                  </p>
                </Panel>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "affiliate" && (
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border p-6">
            <p className="flex items-center gap-2 font-medium">
              <BadgePercent className="h-4 w-4 text-accent" />
              {fa ? "ساخت کد تخفیف / معرف" : "Create a discount / referral code"}
            </p>
            <p className="mt-2 text-caption leading-relaxed text-foreground-secondary">
              {fa
                ? `خریدار با کد شما تخفیف می‌گیرد و شما ${affiliatePct}٪ از سهم پلتفرم را به‌عنوان کمیسیون دریافت می‌کنید.`
                : `Your code gives buyers a discount and earns you ${affiliatePct}% of the platform fee as commission.`}
            </p>
            <div className="mt-4 flex gap-2">
              <input
                value={newCode}
                onChange={(event) => setNewCode(event.target.value.toUpperCase())}
                placeholder="MARYAM10"
                dir="ltr"
                className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
              />
              <button type="button" onClick={createCoupon} className="rounded-full bg-foreground px-4 py-2 text-sm text-background">
                {fa ? "ساخت" : "Create"}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-caption">
              {[10, 15, 20, 30].map((percent) => (
                <span key={percent} className="rounded-full border border-border px-3 py-1.5">
                  {percent}% {fa ? "تخفیف" : "off"}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border p-6">
            <p className="font-medium">{fa ? "کدهای من" : "My codes"}</p>
            {coupons.length === 0 ? (
              <Empty fa={fa} />
            ) : (
              <ul className="mt-3 space-y-3 text-caption">
                {coupons.map((coupon) => (
                  <li key={coupon.code} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium" dir="ltr">
                        {coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(`${window.location.origin}${coupon.shareUrl}`);
                          setNotice(fa ? "لینک کپی شد." : "Link copied.");
                        }}
                        className="inline-flex items-center gap-1 text-accent"
                      >
                        <Copy className="h-3 w-3" />
                        {fa ? "کپی لینک" : "Copy link"}
                      </button>
                    </div>
                    <p className="mt-2 text-foreground-secondary">
                      {fa
                        ? `${coupon.percent ?? 0}٪ تخفیف · ${coupon.redemptions} استفاده · ${coupon.stats.clicks} کلیک`
                        : `${coupon.percent ?? 0}% off · ${coupon.redemptions} redemptions · ${coupon.stats.clicks} clicks`}
                    </p>
                    <p className="mt-1 text-foreground-secondary">
                      {fa
                        ? `کمیسیون: ${formatPrice(coupon.stats.commission, locale)}`
                        : `Commission: ${formatPrice(coupon.stats.commission, locale)}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border p-6 lg:col-span-2">
            <p className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-accent" />
              {fa ? "قوانین سهم هنرمند" : "How revenue is split"}
            </p>
            <p className="mt-2 text-caption leading-relaxed text-foreground-secondary">
              {fa
                ? "سهم شما از مبلغ خالص (بعد از تخفیف، قبل از مالیات) محاسبه و بلافاصله پس از پرداخت در دفتر مالی ثبت می‌شود. کمیسیون معرف از سهم پلتفرم کسر می‌شود، نه از سهم شما."
                : "Your share is calculated on the net amount (after discounts, before VAT) and recorded in the ledger the moment payment settles. Referral commissions come out of the platform fee, never out of your share."}
            </p>
            <Link href={href(locale, "/legal/terms")} className="mt-3 inline-block text-caption text-accent underline">
              {fa ? "شرایط همکاری" : "Collaboration terms"}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function TierEditor({
  asset,
  locale,
  onSave,
}: {
  asset: StudioAsset;
  locale: "fa" | "en";
  onSave: (patch: { id: string; priceFa: number; priceEn: number; enabled: boolean }[]) => void;
}) {
  const fa = locale === "fa";
  const [rows, setRows] = useState(
    asset.tiers.map((tier) => ({ id: tier.id, kind: tier.kind, title: tier.title, priceFa: tier.price.fa, priceEn: tier.price.en, enabled: tier.enabled })),
  );

  return (
    <div className="mt-4 rounded-xl bg-background-secondary/60 p-4">
      <p className="text-caption text-foreground-secondary">{fa ? "قیمت‌گذاری لایسنس‌ها" : "License pricing"}</p>
      <div className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="grid grid-cols-12 items-center gap-2 text-caption">
            <label className="col-span-4 flex items-center gap-2">
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(event) => {
                  const next = rows.slice();
                  next[index] = { ...row, enabled: event.target.checked };
                  setRows(next);
                }}
              />
              <span className="truncate">{fa ? row.title.fa : row.title.en}</span>
            </label>
            <input
              type="number"
              value={row.priceFa}
              min={0}
              onChange={(event) => {
                const next = rows.slice();
                next[index] = { ...row, priceFa: Number(event.target.value) };
                setRows(next);
              }}
              className="col-span-4 rounded-md border border-border bg-transparent px-2 py-1.5"
              dir="ltr"
            />
            <div className="col-span-3 flex items-center gap-1">
              <span className="text-foreground-secondary">$</span>
              <input
                type="number"
                value={row.priceEn}
                min={0}
                onChange={(event) => {
                  const next = rows.slice();
                  next[index] = { ...row, priceEn: Number(event.target.value) };
                  setRows(next);
                }}
                className="w-full rounded-md border border-border bg-transparent px-2 py-1.5"
                dir="ltr"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSave(rows)}
        className="mt-3 rounded-full border border-border px-4 py-1.5 text-caption hover:border-foreground"
      >
        {fa ? "ذخیره قیمت‌ها" : "Save prices"}
      </button>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-caption text-foreground-secondary">{label}</p>
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

function Empty({ fa }: { fa: boolean }) {
  return (
    <p className="text-caption text-foreground-secondary">
      {fa ? "هنوز داده‌ای ثبت نشده است." : "No data recorded yet."}
    </p>
  );
}
