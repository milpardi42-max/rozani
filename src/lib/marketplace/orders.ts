import "server-only";
import { KEYS, mutateCollection, readCollection } from "./store";
import { newId } from "./assets";
import { artistBalance, defaultAffiliatePct, defaultArtistPct, saleEntries, splitRevenue } from "./royalty";
import { addPrice, chargeFor, clampPrice, isZeroPrice, scalePrice, subPrice, ZERO_PRICE } from "./money";
import {
  SUBSCRIPTION_PERIOD_DAYS,
  SUBSCRIPTION_PLANS,
  VAT_PCT_IRAN,
  getPlan,
} from "./config";
import { getAsset, nextLicenseSerial, recordAssetSale } from "./assets";
import { assetDeliverables } from "./colourways";
import { appendLedger } from "./assets";
import type { Localized } from "@/lib/i18n/types";
import type {
  Asset,
  Coupon,
  LedgerEntry,
  License,
  LicenseKind,
  MarketplaceOrder,
  MarketplaceOrderStatus,
  OrderLine,
  PaymentProviderId,
  Payout,
  PricePair,
  Subscription,
  SubscriptionPlan,
} from "./types";

/**
 * Marketplace orders — quoting, checkout, and fulfilment.
 *
 * Fulfilment is the transaction that matters: it is guarded by
 * `fulfillment.completedAt` so a repeated gateway callback can never issue the
 * same license twice, and it performs, in order:
 *
 *   1. license rows + serials (RA-LIC-YYYY-NNNNNN)
 *   2. exclusive sales → delist the work (`sold_exclusive`)
 *   3. royalty ledger entries (artist share, platform fee, referral)
 *   4. asset stats (sales/revenue)
 *   5. delivery e-mails (buyer receipt + artist sale notice)
 */

/* ------------------------------------------------------------------ */
/* Coupons                                                            */
/* ------------------------------------------------------------------ */

export async function getCoupons(): Promise<Coupon[]> {
  return readCollection<Coupon>(KEYS.coupons);
}

export async function getCoupon(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const coupons = await getCoupons();
  return coupons.find((coupon) => coupon.code.toUpperCase() === normalized) ?? null;
}

export async function saveCoupon(coupon: Coupon): Promise<Coupon> {
  const normalized: Coupon = { ...coupon, code: coupon.code.trim().toUpperCase() };
  await mutateCollection<Coupon, void>(KEYS.coupons, (items) => {
    const index = items.findIndex((item) => item.code.toUpperCase() === normalized.code);
    if (index === -1) return { next: [...items, normalized], result: undefined };
    const copy = items.slice();
    copy[index] = normalized;
    return { next: copy, result: undefined };
  });
  return normalized;
}

export async function deleteCoupon(code: string): Promise<void> {
  await mutateCollection<Coupon, void>(KEYS.coupons, (items) => ({
    next: items.filter((item) => item.code.toUpperCase() !== code.trim().toUpperCase()),
    result: undefined,
  }));
}

export interface CouponEvaluation {
  ok: boolean;
  discount: PricePair;
  coupon?: Coupon;
  reason?: "not_found" | "inactive" | "expired" | "limit_reached" | "min_subtotal" | "not_applicable" | "international_only";
}

export function evaluateCoupon(
  coupon: Coupon | null,
  input: { subtotal: PricePair; provider: PaymentProviderId; assetIds: string[]; userId?: string | null; buyerEmail?: string },
): CouponEvaluation {
  if (!coupon) return { ok: false, discount: ZERO_PRICE, reason: "not_found" };
  if (!coupon.active) return { ok: false, discount: ZERO_PRICE, reason: "inactive" };

  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return { ok: false, discount: ZERO_PRICE, reason: "inactive" };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return { ok: false, discount: ZERO_PRICE, reason: "expired" };
  if (coupon.maxRedemptions && coupon.redemptions >= coupon.maxRedemptions) {
    return { ok: false, discount: ZERO_PRICE, reason: "limit_reached" };
  }
  if (coupon.minSubtotal) {
    const currencyMatches = coupon.internationalOnly
      ? coupon.minSubtotal.en <= input.subtotal.en
      : coupon.minSubtotal.fa <= input.subtotal.fa;
    if (!currencyMatches) return { ok: false, discount: ZERO_PRICE, reason: "min_subtotal" };
  }
  if (coupon.internationalOnly && input.provider !== "stripe") {
    return { ok: false, discount: ZERO_PRICE, reason: "international_only" };
  }
  if (coupon.assetIds?.length && !input.assetIds.some((id) => coupon.assetIds!.includes(id))) {
    return { ok: false, discount: ZERO_PRICE, reason: "not_applicable" };
  }

  const discount =
    coupon.kind === "percent"
      ? scalePrice(input.subtotal, (coupon.percent ?? 0) / 100)
      : coupon.kind === "fixed"
        ? clampPrice(coupon.fixed ?? ZERO_PRICE)
        : input.subtotal;

  return { ok: true, discount: clampPrice(discount), coupon };
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                      */
/* ------------------------------------------------------------------ */

export async function getSubscriptions(): Promise<Subscription[]> {
  return readCollection<Subscription>(KEYS.subscriptions);
}

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  const subscriptions = await getSubscriptions();
  const mine = subscriptions
    .filter((subscription) => subscription.userId === userId && subscription.status === "active")
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const latest = mine[0];
  if (!latest) return null;
  if (new Date(latest.currentPeriodEnd).getTime() < Date.now()) {
    await saveSubscription({ ...latest, status: "expired" });
    return null;
  }
  return latest;
}

export async function saveSubscription(subscription: Subscription): Promise<Subscription> {
  await mutateCollection<Subscription, void>(KEYS.subscriptions, (items) => {
    const index = items.findIndex((item) => item.id === subscription.id);
    if (index === -1) return { next: [...items, subscription], result: undefined };
    const copy = items.slice();
    copy[index] = subscription;
    return { next: copy, result: undefined };
  });
  return subscription;
}

export async function activateSubscription(input: {
  userId: string;
  planId: string;
  gateway?: PaymentProviderId;
  orderId?: string;
}): Promise<Subscription | null> {
  const plan = getPlan(input.planId);
  if (!plan) return null;

  const existing = await getSubscriptionForUser(input.userId);
  const now = new Date();

  if (existing) {
    const base = new Date(existing.currentPeriodEnd).getTime() > now.getTime() ? new Date(existing.currentPeriodEnd) : now;
    const next = new Date(base.getTime() + SUBSCRIPTION_PERIOD_DAYS * 86_400_000);
    return saveSubscription({
      ...existing,
      planId: plan.id,
      status: "active",
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: next.toISOString(),
      downloadsUsed: 0,
      orderIds: input.orderId ? [...existing.orderIds, input.orderId] : existing.orderIds,
      gateway: input.gateway ?? existing.gateway,
      autoRenew: true,
    });
  }

  const end = new Date(now.getTime() + SUBSCRIPTION_PERIOD_DAYS * 86_400_000);
  return saveSubscription({
    id: newId("sub"),
    userId: input.userId,
    planId: plan.id,
    status: "active",
    startedAt: now.toISOString(),
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: end.toISOString(),
    downloadsUsed: 0,
    gateway: input.gateway,
    orderIds: input.orderId ? [input.orderId] : [],
    autoRenew: true,
  });
}

export async function cancelSubscription(userId: string): Promise<Subscription | null> {
  const subscription = await getSubscriptionForUser(userId);
  if (!subscription) return null;
  return saveSubscription({ ...subscription, status: "canceled", canceledAt: new Date().toISOString(), autoRenew: false });
}

/** Rolls the billing period when it has elapsed (called lazily on read). */
export async function refreshSubscriptionPeriod(subscription: Subscription): Promise<Subscription> {
  if (subscription.status !== "active") return subscription;
  if (new Date(subscription.currentPeriodEnd).getTime() > Date.now()) return subscription;
  if (!subscription.autoRenew) return saveSubscription({ ...subscription, status: "expired" });

  const start = new Date(subscription.currentPeriodEnd).getTime();
  let end = start + SUBSCRIPTION_PERIOD_DAYS * 86_400_000;
  while (end < Date.now()) end += SUBSCRIPTION_PERIOD_DAYS * 86_400_000;
  return saveSubscription({
    ...subscription,
    currentPeriodStart: new Date(start).toISOString(),
    currentPeriodEnd: new Date(end).toISOString(),
    downloadsUsed: 0,
  });
}

export function subscriptionQuota(subscription: Subscription, plan: SubscriptionPlan) {
  const unlimited = plan.downloadsPerMonth === 0;
  return {
    used: subscription.downloadsUsed,
    limit: plan.downloadsPerMonth,
    remaining: unlimited ? Number.POSITIVE_INFINITY : Math.max(0, plan.downloadsPerMonth - subscription.downloadsUsed),
    unlimited,
  };
}

/* ------------------------------------------------------------------ */
/* Quoting                                                             */
/* ------------------------------------------------------------------ */

export interface QuoteRequestLine {
  assetId: string;
  tierId: string;
  /** When set, the buyer redeems this line with a subscription pass instead of paying. */
  viaSubscriptionId?: string;
}

export interface QuoteRequest {
  lines: QuoteRequestLine[];
  planId?: string | null;
  couponCode?: string | null;
  /** Affiliate referral code (a coupon code flagged as affiliate, or a user handle). */
  affiliateCode?: string | null;
  provider: PaymentProviderId;
  userId?: string | null;
  buyerEmail?: string;
}

export interface QuoteLine {
  assetId: string;
  tierId: string;
  title: Localized;
  kind: Asset["kind"];
  licenseKind: LicenseKind;
  price: PricePair;
  discount: PricePair;
  viaSubscriptionId?: string;
  /** True when this line is being paid for by the buyer's download pass. */
  coveredByPass?: boolean;
  artistId: string | null;
}

export interface Quote {
  lines: QuoteLine[];
  subscription?: { plan: SubscriptionPlan; price: PricePair };
  subtotal: PricePair;
  discount: PricePair;
  tax: PricePair;
  total: PricePair;
  charge: ReturnType<typeof chargeFor>;
  coupon?: { code: string; kind: Coupon["kind"]; affiliateUserId?: string | null; affiliatePct?: number };
  couponError?: CouponEvaluation["reason"];
  errors: { code: string; assetId?: string; message: Localized }[];
  /** Free orders (full discount or subscription redemption) skip the gateway. */
  payable: boolean;
}

export async function quote(request: QuoteRequest): Promise<Quote> {
  const errors: Quote["errors"] = [];
  const lines: QuoteLine[] = [];

  for (const requested of request.lines) {
    const asset = await getAsset(requested.assetId);
    if (!asset) {
      errors.push({ code: "asset_not_found", assetId: requested.assetId, message: { fa: "اثر یافت نشد.", en: "Work not found." } });
      continue;
    }
    if (asset.status !== "approved" && asset.status !== "sold_exclusive") {
      errors.push({
        code: "not_for_sale",
        assetId: asset.id,
        message: { fa: "این اثر در حال حاضر قابل خرید نیست.", en: "This work is not on sale right now." },
      });
      continue;
    }
    const tier = asset.tiers.find((item) => item.id === requested.tierId && item.enabled);
    if (!tier) {
      errors.push({
        code: "tier_not_found",
        assetId: asset.id,
        message: { fa: "لایسنس انتخابی موجود نیست.", en: "The selected license is unavailable." },
      });
      continue;
    }
    if (asset.status === "sold_exclusive") {
      errors.push({
        code: "already_exclusive",
        assetId: asset.id,
        message: { fa: "این اثر به‌صورت انحصاری فروخته شده است.", en: "This work has already been sold exclusively." },
      });
      continue;
    }

    lines.push({
      assetId: asset.id,
      tierId: tier.id,
      title: asset.title,
      kind: asset.kind,
      licenseKind: tier.kind,
      price: tier.price,
      discount: ZERO_PRICE,
      artistId: asset.artistId,
      viaSubscriptionId: requested.viaSubscriptionId,
    });
  }

  /* ---------- subscription pass ---------- */
  let subscription: Quote["subscription"];
  if (request.planId) {
    const plan = getPlan(request.planId);
    if (!plan) {
      errors.push({ code: "plan_not_found", message: { fa: "پلن انتخابی موجود نیست.", en: "Plan unavailable." } });
    } else {
      subscription = { plan, price: plan.price };
    }
  }

  /* ---------- subscription redemption ---------- */
  if (request.userId) {
    const pass = await getSubscriptionForUser(request.userId);
    if (pass) {
      const plan = SUBSCRIPTION_PLANS.find((item) => item.id === pass.planId);
      if (plan) {
        const refreshed = await refreshSubscriptionPeriod(pass);
        const quota = subscriptionQuota(refreshed, plan);
        for (const line of lines) {
          if (line.viaSubscriptionId && quota.remaining > 0) {
            line.price = ZERO_PRICE; // covered by the pass
            line.coveredByPass = true;
            line.viaSubscriptionId = refreshed.id;
            quota.remaining -= 1;
          }
        }
      }
    }
  }

  const subtotal = addPrice(...lines.map((line) => line.price), ...(subscription ? [subscription.price] : []));

  /* ---------- coupon ---------- */
  let discount = ZERO_PRICE;
  let couponMeta: Quote["coupon"];
  let couponError: Quote["couponError"];
  if (request.couponCode) {
    const coupon = await getCoupon(request.couponCode);
    const evaluation = evaluateCoupon(coupon, {
      subtotal,
      provider: request.provider,
      assetIds: lines.map((line) => line.assetId),
      userId: request.userId,
      buyerEmail: request.buyerEmail,
    });
    if (evaluation.ok && evaluation.coupon) {
      discount = evaluation.discount;
      couponMeta = {
        code: evaluation.coupon.code,
        kind: evaluation.coupon.kind,
        affiliateUserId: evaluation.coupon.affiliateUserId ?? null,
        affiliatePct: evaluation.coupon.affiliatePct,
      };
    } else {
      couponError = evaluation.reason;
    }
  } else if (request.affiliateCode) {
    const coupon = await getCoupon(request.affiliateCode);
    if (coupon?.affiliateUserId) {
      couponMeta = { code: coupon.code, kind: coupon.kind, affiliateUserId: coupon.affiliateUserId, affiliatePct: coupon.affiliatePct };
    }
  }

  /* ---------- spread the discount across lines ---------- */
  const payableBase = addPrice(...lines.map((line) => line.price));
  const discountOnLines = subscription ? scalePrice(discount, payableBase.fa > 0 ? 1 : 0) : discount;
  if (lines.length && (discount.fa > 0 || discount.en > 0)) {
    const factor = payableBase.fa > 0 ? Math.min(1, discount.fa / payableBase.fa) : 0;
    for (const line of lines) {
      line.discount = clampPrice({
        fa: Math.round(line.price.fa * factor),
        en: payableBase.en > 0 ? Math.round(line.price.en * Math.min(1, discount.en / payableBase.en) * 100) / 100 : 0,
      });
    }
  }

  const netSubtotal = clampPrice(subPrice(subtotal, subscription ? discount : discountOnLines));
  const tax = request.provider === "stripe" ? ZERO_PRICE : { fa: Math.round((netSubtotal.fa * VAT_PCT_IRAN) / 100), en: 0 };
  const total = clampPrice({
    fa: netSubtotal.fa + tax.fa,
    en: netSubtotal.en + tax.en,
  });

  return {
    lines,
    subscription,
    subtotal,
    discount: subscription ? discount : discountOnLines,
    tax,
    total,
    charge: chargeFor(request.provider, total),
    coupon: couponMeta,
    couponError,
    errors,
    payable: !isZeroPrice(total),
  };
}

/* ------------------------------------------------------------------ */
/* Orders                                                             */
/* ------------------------------------------------------------------ */

export async function getOrders(): Promise<MarketplaceOrder[]> {
  return readCollection<MarketplaceOrder>(KEYS.orders);
}

export async function getOrder(id: string): Promise<MarketplaceOrder | null> {
  const orders = await getOrders();
  return orders.find((order) => order.id === id) ?? null;
}

export async function listOrdersForUser(userId: string): Promise<MarketplaceOrder[]> {
  const orders = await getOrders();
  return orders
    .filter((order) => order.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listOrdersByEmail(email: string): Promise<MarketplaceOrder[]> {
  const orders = await getOrders();
  return orders
    .filter((order) => order.buyer.email.toLowerCase() === email.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveOrder(order: MarketplaceOrder): Promise<MarketplaceOrder> {
  const next = { ...order, updatedAt: new Date().toISOString() };
  await mutateCollection<MarketplaceOrder, void>(KEYS.orders, (items) => {
    const index = items.findIndex((item) => item.id === order.id);
    if (index === -1) return { next: [...items, next], result: undefined };
    const copy = items.slice();
    copy[index] = next;
    return { next: copy, result: undefined };
  });
  return next;
}

export interface CreateOrderInput {
  userId: string | null;
  buyer: MarketplaceOrder["buyer"];
  lines: OrderLine[];
  subscription?: MarketplaceOrder["subscription"];
  subtotal: PricePair;
  discount: PricePair;
  tax: PricePair;
  total: PricePair;
  charge: MarketplaceOrder["charge"];
  couponCode?: string;
  coupon?: Quote["coupon"];
  notes?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<MarketplaceOrder> {
  const order: MarketplaceOrder = {
    id: `MKT-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    userId: input.userId,
    buyer: input.buyer,
    lines: input.lines,
    subscription: input.subscription,
    subtotal: input.subtotal,
    discount: input.discount,
    tax: input.tax,
    total: input.total,
    charge: input.charge,
    couponCode: input.couponCode,
    affiliateUserId: input.coupon?.affiliateUserId ?? null,
    status: "pending_payment",
    fulfillment: { licenses: [], emails: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: input.notes,
  };
  await mutateCollection<MarketplaceOrder, void>(KEYS.orders, (items) => ({ next: [...items, order], result: undefined }));
  return order;
}

export async function setOrderStatus(id: string, status: MarketplaceOrderStatus, note?: string): Promise<MarketplaceOrder | null> {
  const order = await getOrder(id);
  if (!order) return null;
  return saveOrder({
    ...order,
    status,
    notes: note ?? order.notes,
    ...(status === "paid" ? { paidAt: order.paidAt ?? new Date().toISOString() } : {}),
  });
}

/* ------------------------------------------------------------------ */
/* Licenses                                                           */
/* ------------------------------------------------------------------ */

export async function getLicenses(): Promise<License[]> {
  return readCollection<License>(KEYS.licenses);
}

export async function getLicense(id: string): Promise<License | null> {
  const licenses = await getLicenses();
  return licenses.find((license) => license.id === id) ?? null;
}

export async function getLicensesForUser(userId: string): Promise<License[]> {
  const licenses = await getLicenses();
  return licenses
    .filter((license) => license.buyerUserId === userId)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}

export async function getLicensesForArtist(artistId: string): Promise<License[]> {
  const licenses = await getLicenses();
  return licenses
    .filter((license) => license.artistId === artistId)
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}

export async function saveLicense(license: License): Promise<License> {
  await mutateCollection<License, void>(KEYS.licenses, (items) => {
    const index = items.findIndex((item) => item.id === license.id);
    if (index === -1) return { next: [...items, license], result: undefined };
    const copy = items.slice();
    copy[index] = license;
    return { next: copy, result: undefined };
  });
  return license;
}

export async function findLicenseBySerial(serial: string): Promise<License | null> {
  const licenses = await getLicenses();
  return licenses.find((license) => license.serial.toUpperCase() === serial.trim().toUpperCase()) ?? null;
}

export async function revokeLicense(id: string, reason: string, by: string): Promise<License | null> {
  const license = await getLicense(id);
  if (!license) return null;
  return saveLicense({ ...license, status: "revoked", revokedAt: new Date().toISOString(), revokedReason: `${reason} (${by})` });
}

/* ------------------------------------------------------------------ */
/* Fulfilment                                                          */
/* ------------------------------------------------------------------ */

export interface FulfillmentResult {
  ok: boolean;
  alreadyFulfilled: boolean;
  licenses: License[];
  emails: string[];
}

/**
 * Turns a paid order into licenses, royalties and delivery.
 *
 * Safe to call from the gateway callback, the sandbox page and the admin panel —
 * the `fulfillment.completedAt` guard makes the second call a no-op.
 */
export async function fulfillOrder(
  orderId: string,
  options: { provider?: PaymentProviderId; reference?: string } = {},
): Promise<FulfillmentResult> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, alreadyFulfilled: false, licenses: [], emails: [] };
  if (order.fulfillment.completedAt) {
    const licenses = await getLicenses();
    return {
      ok: true,
      alreadyFulfilled: true,
      licenses: licenses.filter((license) => license.orderId === order.id),
      emails: order.fulfillment.emails,
    };
  }

  const isFreeOrder = isZeroPrice(order.total);
  if (order.status !== "paid" && !isFreeOrder) {
    return { ok: false, alreadyFulfilled: false, licenses: [], emails: [] };
  }

  /* ---------- mark paid ---------- */
  if (order.status !== "paid") {
    await setOrderStatus(order.id, "paid");
  }

  const licenses: License[] = [];
  const netByArtist = new Map<string, PricePair>();

  for (const line of order.lines) {
    const asset = await getAsset(line.assetId);
    if (!asset) continue;
    const tier = asset.tiers.find((item) => item.id === line.tierId);
    /* Artist share: the asset's own override, else the platform default (40 %).
       Site-owned works (no artist) keep everything with the platform. */
    const sharePct = asset.artistId ? defaultArtistPct(asset.revenueSharePct) : 0;
    const net = clampPrice(subPrice(line.price, line.discount ?? ZERO_PRICE));
    const split = splitRevenue({
      net,
      artistPct: sharePct,
      affiliatePct: order.affiliateUserId ? defaultAffiliatePct() : 0,
      siteOwned: !asset.artistId,
    });

    const serial = await nextLicenseSerial();
    const license: License = {
      id: newId("lic"),
      serial,
      orderId: order.id,
      assetId: asset.id,
      tierId: line.tierId,
      licenseKind: line.licenseKind,
      exclusive: Boolean(tier?.exclusive),
      title: asset.title,
      artistId: asset.artistId,
      artistName: await artistNameFor(asset.artistId),
      buyerUserId: order.userId,
      buyerName: order.buyer.name,
      buyerEmail: order.buyer.email,
      pricePaid: line.price,
      royalty: { pct: sharePct, amount: split.artist, platformFee: split.platform },
      issuedAt: new Date().toISOString(),
      /**
       * A license must cover the whole delivery: a work with six formats across
       * three colours is twelve files, so the allowance is never smaller than
       * the number of files (plus the tier's own re-download allowance).
       */
      maxDownloads: Math.max(tier?.maxDownloads ?? 5, assetDeliverables(asset).length),
      downloads: [],
      status: "active",
    };
    licenses.push(await saveLicense(license));

    await recordAssetSale(asset.id, line.price);
    if (asset.artistId) {
      netByArtist.set(asset.artistId, addPrice(netByArtist.get(asset.artistId) ?? ZERO_PRICE, split.artist));
    }

    /* exclusive sale → the work leaves the shop for good */
    if (tier?.exclusive) {
      await mutateCollection<Asset, void>(KEYS.assets, (items) => ({
        next: items.map((item) =>
          item.id === asset.id ? { ...item, status: "sold_exclusive" as const, visibility: "private" as const } : item,
        ),
        result: undefined,
      }));
    }
  }

  /* ---------- download pass: consume one credit per covered line ---------- */
  const covered = order.lines.filter((line) => line.coveredByPass);
  if (covered.length && order.userId) {
    const pass = await getSubscriptionForUser(order.userId);
    const plan = pass ? SUBSCRIPTION_PLANS.find((item) => item.id === pass.planId) : null;
    if (pass && plan && pass.currentPeriodEnd > new Date().toISOString()) {
      await saveSubscription({ ...pass, downloadsUsed: pass.downloadsUsed + covered.length });
    }
  }

  /* ---------- subscription purchase ---------- */
  if (order.subscription && order.userId) {
    await activateSubscription({
      userId: order.userId,
      planId: order.subscription.planId,
      gateway: options.provider,
      orderId: order.id,
    });
  }

  /* ---------- coupon redemption counter ---------- */
  if (order.couponCode) {
    await mutateCollection<Coupon, void>(KEYS.coupons, (items) => ({
      next: items.map((item) =>
        item.code.toUpperCase() === order.couponCode!.toUpperCase() ? { ...item, redemptions: item.redemptions + 1 } : item,
      ),
      result: undefined,
    }));
  }

  /* ---------- ledger ---------- */
  for (const license of licenses) {
    const asset = await getAsset(license.assetId);
    const split = splitRevenue({
      net: clampPrice(subPrice(license.pricePaid, order.lines.find((line) => line.assetId === license.assetId)?.discount ?? ZERO_PRICE)),
      artistPct: license.royalty.pct,
      affiliatePct: order.affiliateUserId ? defaultAffiliatePct() : 0,
      siteOwned: !license.artistId,
    });
    const entries = saleEntries({
      orderId: order.id,
      licenseId: license.id,
      artistId: license.artistId,
      net: split.gross,
      artistPct: license.royalty.pct,
      affiliateUserId: order.affiliateUserId,
      affiliatePct: order.affiliateUserId ? defaultAffiliatePct() : 0,
      note: asset ? { fa: `فروش «${asset.title.fa}»`, en: `Sale of “${asset.title.en}”` } : undefined,
    });
    for (const entry of entries) await appendLedger(entry);
  }

  /* ---------- delivery ---------- */
  const emails = await deliverOrder(order, licenses);

  const updated = await getOrder(order.id);
  if (updated) {
    await saveOrder({
      ...updated,
      status: "paid",
      paidAt: updated.paidAt ?? new Date().toISOString(),
      fulfillment: { completedAt: new Date().toISOString(), licenses: licenses.map((license) => license.id), emails },
    });
  }

  return { ok: true, alreadyFulfilled: false, licenses, emails };
}

/**
 * Sends the buyer receipt + artist sale notices. Kept in `email.ts` so the
 * templates live next to the other transactional mail.
 */
async function deliverOrder(order: MarketplaceOrder, licenses: License[]): Promise<string[]> {
  try {
    const { sendOrderDelivery } = await import("./email");
    return await sendOrderDelivery({ order, licenses });
  } catch (error) {
    console.error("[marketplace] delivery email failed:", error);
    return [];
  }
}

async function artistNameFor(artistId: string | null): Promise<Localized> {
  if (!artistId) return { fa: "رزی آتلیه", en: "Rosie Atelier" };
  try {
    const { getContent } = await import("@/lib/data/store");
    const content = await getContent();
    const artist = content.artists.find((item) => item.id === artistId);
    return artist?.name ?? { fa: "هنرمند", en: "Artist" };
  } catch {
    return { fa: "هنرمند", en: "Artist" };
  }
}

/* ------------------------------------------------------------------ */
/* Refunds                                                             */
/* ------------------------------------------------------------------ */

export async function refundOrder(orderId: string, adminEmail: string): Promise<{ ok: boolean; licenses: License[] }> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, licenses: [] };
  if (order.status !== "paid") return { ok: false, licenses: [] };

  const licenses = (await getLicenses()).filter((license) => license.orderId === orderId);
  for (const license of licenses) {
    await saveLicense({
      ...license,
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokedReason: `refunded by ${adminEmail}`,
    });
  }

  const { reversalEntries } = await import("./royalty");
  const ledger = await readCollection(KEYS.ledger);
  const reversals = reversalEntries(ledger as never[], orderId);
  for (const entry of reversals) await appendLedger(entry);

  await saveOrder({ ...order, status: "refunded", notes: `${order.notes ?? ""}\nrefunded by ${adminEmail}`.trim() });

  /* exclusive licenses return the work to the shop */
  for (const license of licenses.filter((item) => item.exclusive)) {
    await mutateCollection<Asset, void>(KEYS.assets, (items) => ({
      next: items.map((item) =>
        item.id === license.assetId
          ? { ...item, status: "approved" as const, visibility: "public" as const, rejectionNote: undefined }
          : item,
      ),
      result: undefined,
    }));
  }

  return { ok: true, licenses };
}

/* ------------------------------------------------------------------ */
/* Artist wallet                                                       */
/* ------------------------------------------------------------------ */

export async function artistWallet(artistId: string) {
  const ledger = await readCollection<LedgerEntry>(KEYS.ledger);
  const payouts = await readCollection<Payout>(KEYS.payouts);
  return artistBalance({
    ledger: ledger.filter((entry) => entry.artistId === artistId),
    payouts: payouts.filter((payout) => payout.artistId === artistId),
  });
}

export function planById(id: string): SubscriptionPlan | null {
  return getPlan(id);
}
