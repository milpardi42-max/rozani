import "server-only";
import { KEYS, mutateCollection, readCollection } from "./store";
import { newId } from "./assets";
import { readDoc, writeDoc } from "./store";
import { addPrice, clampPrice, ZERO_PRICE } from "./money";
import { getAssets } from "./assets";
import { getLicenses, getSubscriptions } from "./orders";
import { getCoupons } from "./orders";
import { artistBalance } from "./royalty";
import type {
  AnalyticsEvent,
  ArtistAnalytics,
  LedgerEntry,
  License,
  PaymentProviderId,
  Payout,
  PricePair,
  SalesSeriesPoint,
} from "./types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Sales analytics.
 *
 * Events (views, checkout starts, purchases, downloads) are appended to a single
 * collection; the dashboards aggregate on read. That keeps writers cheap and lets
 * a new metric be added without a migration — the price is a linear scan, which
 * is perfectly fine at this catalogue size and can be swapped for a rollup table
 * later without touching the call sites.
 */

const MAX_EVENTS = 20_000;

export interface RecordEventInput {
  kind: AnalyticsEvent["kind"];
  assetId?: string;
  artistId?: string | null;
  userId?: string | null;
  sessionId?: string;
  value?: PricePair;
  meta?: Record<string, string>;
}

export async function recordEvent(input: RecordEventInput): Promise<void> {
  const event: AnalyticsEvent = {
    id: newId("evt"),
    kind: input.kind,
    assetId: input.assetId,
    artistId: input.artistId ?? null,
    userId: input.userId ?? null,
    sessionId: input.sessionId,
    value: input.value,
    at: new Date().toISOString(),
    meta: input.meta,
  };
  await mutateCollection<AnalyticsEvent, void>(KEYS.events, (items) => {
    const next = [...items, event];
    // Keep the log bounded: drop the oldest events beyond the cap.
    return { next: next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next, result: undefined };
  });
}

export async function getEvents(limit = 5000): Promise<AnalyticsEvent[]> {
  const events = await readCollection<AnalyticsEvent>(KEYS.events);
  return events.slice(-limit);
}

/* ------------------------------------------------------------------ */
/* Ranges                                                              */
/* ------------------------------------------------------------------ */

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function buildSeries(from: Date, days: number): SalesSeriesPoint[] {
  const points: SalesSeriesPoint[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(from.getTime() + index * 86_400_000);
    points.push({ date: date.toISOString().slice(0, 10), revenueFa: 0, revenueEn: 0, orders: 0, downloads: 0 });
  }
  return points;
}

function withinRange(iso: string, from: Date) {
  return new Date(iso).getTime() >= from.getTime();
}

/* ------------------------------------------------------------------ */
/* Artist analytics                                                    */
/* ------------------------------------------------------------------ */

export interface ArtistAnalyticsInput {
  artistId: string;
  days?: number;
  /** Optionally narrow to a single asset (asset detail pages). */
  assetId?: string;
}

export async function getArtistAnalytics(input: ArtistAnalyticsInput): Promise<ArtistAnalytics> {
  const days = Math.min(Math.max(input.days ?? 30, 1), 365);
  const from = daysAgo(days);

  const [ledger, licenses, assets, subscriptions, events, coupons, payouts] = await Promise.all([
    readCollection<LedgerEntry>(KEYS.ledger),
    getLicenses(),
    getAssets(),
    getSubscriptions(),
    getEvents(MAX_EVENTS),
    getCoupons(),
    readCollection<Payout>(KEYS.payouts),
  ]);

  const myAssets = assets.filter((asset) => asset.artistId === input.artistId && (!input.assetId || asset.id === input.assetId));
  const myLicenses = licenses.filter((license) => license.artistId === input.artistId && (!input.assetId || license.assetId === input.assetId));
  const recentLicenses = myLicenses.filter((license) => withinRange(license.issuedAt, from));

  const series = buildSeries(from, days);
  const index = new Map(series.map((point) => [point.date, point]));

  let revenue = ZERO_PRICE;
  let royalties = ZERO_PRICE;
  for (const license of recentLicenses) {
    revenue = addPrice(revenue, license.pricePaid);
    royalties = addPrice(royalties, license.royalty.amount);
    const point = index.get(dayKey(license.issuedAt));
    if (point) {
      point.revenueFa += license.pricePaid.fa;
      point.revenueEn += license.pricePaid.en;
      point.orders += 1;
    }
  }

  const myEvents = events.filter((event) => event.artistId === input.artistId && withinRange(event.at, from));
  for (const event of myEvents) {
    if (event.kind === "download") {
      const point = index.get(dayKey(event.at));
      if (point) point.downloads += 1;
    }
  }

  const views = myEvents.filter((event) => event.kind === "view").length + myAssets.reduce((sum, asset) => sum + asset.stats.views, 0);
  const purchases = recentLicenses.length;
  const conversionPct = views > 0 ? Math.round((purchases / views) * 1000) / 10 : 0;

  /* top assets */
  const byAsset = new Map<string, { sales: number; revenue: PricePair }>();
  for (const license of recentLicenses) {
    const current = byAsset.get(license.assetId) ?? { sales: 0, revenue: ZERO_PRICE };
    byAsset.set(license.assetId, { sales: current.sales + 1, revenue: addPrice(current.revenue, license.pricePaid) });
  }
  const topAssets = [...byAsset.entries()]
    .map(([assetId, stats]) => ({
      assetId,
      title: (myAssets.find((asset) => asset.id === assetId)?.title ?? { fa: "—", en: "—" }) as Localized,
      sales: stats.sales,
      revenue: stats.revenue,
    }))
    .sort((a, b) => b.revenue.fa + b.revenue.en - (a.revenue.fa + a.revenue.en))
    .slice(0, 8);

  /* by license kind */
  const kinds: License["licenseKind"][] = ["personal", "commercial", "extended", "exclusive"];
  const byLicense = kinds
    .map((kind) => {
      const list = recentLicenses.filter((license) => license.licenseKind === kind);
      return {
        kind,
        sales: list.length,
        revenue: list.reduce((acc, license) => addPrice(acc, license.pricePaid), ZERO_PRICE),
      };
    })
    .filter((row) => row.sales > 0);

  /* by country + gateway (from the order that produced each license) */
  const { getOrders } = await import("./orders");
  const orders = await getOrders();
  const orderIndex = new Map(orders.map((order) => [order.id, order]));

  const countryMap = new Map<string, { sales: number; revenue: PricePair }>();
  const providerMap = new Map<PaymentProviderId, { sales: number; revenue: PricePair }>();
  for (const license of recentLicenses) {
    const order = orderIndex.get(license.orderId);
    const country = order?.buyer.country?.toUpperCase() || (order?.charge.currency === "USD" ? "INT" : "IR");
    const countryRow = countryMap.get(country) ?? { sales: 0, revenue: ZERO_PRICE };
    countryMap.set(country, { sales: countryRow.sales + 1, revenue: addPrice(countryRow.revenue, license.pricePaid) });

    const provider: PaymentProviderId = order?.affiliateUserId
      ? "wallet"
      : order?.charge.currency === "USD"
        ? "stripe"
        : "zarinpal";
    const providerRow = providerMap.get(provider) ?? { sales: 0, revenue: ZERO_PRICE };
    providerMap.set(provider, { sales: providerRow.sales + 1, revenue: addPrice(providerRow.revenue, license.pricePaid) });
  }

  /* subscribers whose passes cover my work */
  const subscriberCount = subscriptions.filter((subscription) => subscription.status === "active").length;

  /* affiliate/referral performance for this artist's own codes */
  const myCoupons = coupons.filter((coupon) => coupon.artistId === input.artistId);
  const referralCommission = myCoupons.reduce((acc, coupon) => {
    const conversions = coupon.redemptions;
    return { clicks: 0, conversions: acc.conversions + conversions, commission: acc.commission };
  }, { clicks: 0, conversions: 0, commission: ZERO_PRICE });

  const balance = artistBalance({
    ledger: ledger.filter((entry) => entry.artistId === input.artistId),
    payouts: payouts.filter((payout) => payout.artistId === input.artistId),
  });

  return {
    artistId: input.artistId,
    range: { from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), days },
    totals: {
      revenue: clampPrice(revenue),
      royalties: clampPrice(royalties),
      sales: purchases,
      refunds: myLicenses.filter((license) => license.status === "revoked").length,
      views,
      conversionPct,
      downloads: myLicenses.reduce((sum, license) => sum + license.downloads.length, 0),
      averageOrder: purchases > 0 ? { fa: Math.round(revenue.fa / purchases), en: Math.round((revenue.en / purchases) * 100) / 100 } : ZERO_PRICE,
    },
    series,
    topAssets,
    byLicense,
    byCountry: [...countryMap.entries()].map(([country, stats]) => ({ country, ...stats })),
    byProvider: [...providerMap.entries()].map(([provider, stats]) => ({ provider, ...stats })),
    subscribers: subscriberCount,
    referral: { ...referralCommission, commission: balance.total },
    };
}

/* ------------------------------------------------------------------ */
/* Platform overview (admin dashboard)                                 */
/* ------------------------------------------------------------------ */

export interface PlatformAnalytics {
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
  series: SalesSeriesPoint[];
  topArtists: { artistId: string; revenue: PricePair; sales: number }[];
  topAssets: { assetId: string; title: Localized; sales: number; revenue: PricePair }[];
  recentOrders: { id: string; buyer: string; total: PricePair; status: string; at: string }[];
  pendingPayouts: { count: number; amount: PricePair };
}

export async function getPlatformAnalytics(days = 30): Promise<PlatformAnalytics> {
  const range = Math.min(Math.max(days, 1), 365);
  const from = daysAgo(range);
  const [ledger, licenses, assets, subscriptions, events, payouts, orders] = await Promise.all([
    readCollection<LedgerEntry>(KEYS.ledger),
    getLicenses(),
    getAssets(),
    getSubscriptions(),
    getEvents(MAX_EVENTS),
    readCollection<Payout>(KEYS.payouts),
    (await import("./orders")).getOrders(),
  ]);

  const recent = licenses.filter((license) => withinRange(license.issuedAt, from));
  const series = buildSeries(from, range);
  const index = new Map(series.map((point) => [point.date, point]));

  let revenue = ZERO_PRICE;
  let artistRevenue = ZERO_PRICE;
  for (const license of recent) {
    revenue = addPrice(revenue, license.pricePaid);
    artistRevenue = addPrice(artistRevenue, license.royalty.amount);
    const point = index.get(dayKey(license.issuedAt));
    if (point) {
      point.revenueFa += license.pricePaid.fa;
      point.revenueEn += license.pricePaid.en;
      point.orders += 1;
    }
  }
  for (const event of events.filter((event) => event.kind === "download" && withinRange(event.at, from))) {
    const point = index.get(dayKey(event.at));
    if (point) point.downloads += 1;
  }

  const artistMap = new Map<string, { revenue: PricePair; sales: number }>();
  const assetMap = new Map<string, { sales: number; revenue: PricePair }>();
  for (const license of recent) {
    if (license.artistId) {
      const current = artistMap.get(license.artistId) ?? { revenue: ZERO_PRICE, sales: 0 };
      artistMap.set(license.artistId, { revenue: addPrice(current.revenue, license.pricePaid), sales: current.sales + 1 });
    }
    const assetRow = assetMap.get(license.assetId) ?? { sales: 0, revenue: ZERO_PRICE };
    assetMap.set(license.assetId, { sales: assetRow.sales + 1, revenue: addPrice(assetRow.revenue, license.pricePaid) });
  }

  const views = events.filter((event) => event.kind === "view" && withinRange(event.at, from)).length;

  const { getContent } = await import("@/lib/data/store");
  const artistNames = new Map<string, Localized>();
  try {
    const content = await getContent();
    for (const artist of content.artists) artistNames.set(artist.id, artist.name);
  } catch {
    /* content store unavailable — names fall back to the id */
  }

  const pending = payouts.filter((payout) => payout.status === "requested" || payout.status === "approved");

  return {
    range: { from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10), days: range },
    totals: {
      revenue: clampPrice(revenue),
      platformRevenue: clampPrice(
        ledger.filter((entry) => entry.kind === "platform_fee" && withinRange(entry.createdAt, from)).reduce((acc, entry) => addPrice(acc, { fa: -entry.amount.fa, en: -entry.amount.en }), ZERO_PRICE),
      ),
      artistRevenue: clampPrice(artistRevenue),
      orders: orders.filter((order) => withinRange(order.createdAt, from)).length,
      licenses: recent.length,
      assets: assets.length,
      pendingAssets: assets.filter((asset) => asset.status === "pending_review").length,
      subscribers: subscriptions.filter((subscription) => subscription.status === "active").length,
      artists: artistMap.size,
      downloads: recent.reduce((sum, license) => sum + license.downloads.length, 0),
      views,
      conversionPct: views > 0 ? Math.round((recent.length / views) * 1000) / 10 : 0,
      refunds: licenses.filter((license) => license.status === "revoked").length,
    },
    series,
    topArtists: [...artistMap.entries()]
      .map(([artistId, stats]) => ({ artistId, ...stats }))
      .sort((a, b) => b.revenue.fa + b.revenue.en - (a.revenue.fa + a.revenue.en))
      .slice(0, 6),
    topAssets: [...assetMap.entries()]
      .map(([assetId, stats]) => ({
        assetId,
        title: (assets.find((asset) => asset.id === assetId)?.title ?? { fa: assetId, en: assetId }) as Localized,
        ...stats,
      }))
      .sort((a, b) => b.revenue.fa + b.revenue.en - (a.revenue.fa + a.revenue.en))
      .slice(0, 8),
    recentOrders: orders
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8)
      .map((order) => ({ id: order.id, buyer: order.buyer.name, total: order.total, status: order.status, at: order.createdAt })),
    pendingPayouts: {
      count: pending.length,
      amount: pending.reduce((acc, payout) => addPrice(acc, payout.amount), ZERO_PRICE),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Referral / affiliate tracking                                       */
/* ------------------------------------------------------------------ */

export interface ReferralStats {
  code: string;
  clicks: number;
  conversions: number;
  commission: PricePair;
  revenue: PricePair;
}

interface ReferralCounters {
  [code: string]: { clicks: number; conversions: number };
}

/*
 * Referral counters live in their own key. `KEYS.counters` is a *sequence*
 * collection (`{name, value}` rows for licence serials) — sharing it would let a
 * click overwrite the serial counter, so the two must never mix.
 */

export async function trackReferralClick(code: string): Promise<void> {
  const key = code.trim().toUpperCase();
  if (!key) return;
  const counters = await readDoc<ReferralCounters>(KEYS.referrals, {});
  const current = counters[key] ?? { clicks: 0, conversions: 0 };
  counters[key] = { ...current, clicks: current.clicks + 1 };
  await writeDoc(KEYS.referrals, counters);
}

export async function getReferralStats(code?: string): Promise<ReferralStats[]> {
  const counters = await readDoc<ReferralCounters>(KEYS.referrals, {});
  const coupons = await getCoupons();
  const orders = await (await import("./orders")).getOrders();

  const codes = code ? [code] : coupons.filter((coupon) => coupon.affiliateUserId).map((coupon) => coupon.code);

  return codes.map((entry) => {
    const counter = counters[entry.toUpperCase()] ?? { clicks: 0, conversions: 0 };
    const relatedOrders = orders.filter((order) => order.couponCode?.toUpperCase() === entry.toUpperCase());
    const revenue = relatedOrders.reduce((acc, order) => addPrice(acc, order.total), ZERO_PRICE);
    const commission = relatedOrders.reduce((acc, order) => {
      const pct = coupons.find((coupon) => coupon.code.toUpperCase() === entry.toUpperCase())?.affiliatePct ?? 0;
      return addPrice(acc, { fa: Math.round((order.subtotal.fa * pct) / 100), en: Math.round((order.subtotal.en * pct) / 100) });
    }, ZERO_PRICE);

    return {
      code: entry,
      clicks: counter.clicks,
      conversions: relatedOrders.length || counter.conversions,
      commission,
      revenue,
    };
  });
}
