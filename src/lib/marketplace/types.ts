/**
 * Rosie Atelier — Digital Marketplace domain types.
 *
 * This module is purely additive: nothing in the existing store/catalog model is
 * changed. A marketplace `Asset` is an *optionally linked* digital product that
 * references an existing pattern/product by id, so the rest of the site keeps
 * working exactly as before.
 *
 * Money is always carried as the site's bilingual pair `{ fa: toman, en: usd }`
 * (same shape as `Pattern.price`), plus — at charge time — an explicit
 * `ChargeAmount` that pins one currency to one gateway.
 */

import type { Localized } from "@/lib/i18n/types";
import type { DeliverableFormatId, ExportFormatId } from "./formats";

export type ID = string;

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

/** Toman / USD pair — the project-wide price shape. */
export interface PricePair {
  fa: number;
  en: number;
}

/** What a gateway is actually asked to charge. */
export interface ChargeAmount {
  currency: "IRT" | "USD";
  /** Minor units: toman for IRT (whole units), cents for USD. */
  amount: number;
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

export type StorageProvider = "local" | "s3";

/** A file living in the *private* bucket — never web-reachable without a token. */
export interface StoredFile {
  /** Provider-relative object key, e.g. `masters/ast_ab12/original.tif`. */
  key: string;
  provider: StorageProvider;
  filename: string;
  sizeBytes: number;
  mime: string;
  /** sha256 hex of the full object — integrity + deduplication. */
  sha256: string;
  width?: number;
  height?: number;
  uploadedAt: string;
}

/** Publicly servable derivative (watermarked preview, thumbnail, mockup…). */
export interface DerivedFile {
  key: string;
  width: number;
  height: number;
  bytes: number;
  kind: "thumb" | "preview" | "watermarked" | "tiled" | "mockup" | "seam-report";
  /** For mockups: which template produced it. */
  variant?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

export interface SeamlessReport {
  /** 0…1 — edge-continuity score (1 = perfectly seamless). */
  score: number;
  verdict: "seamless" | "near-seamless" | "not-seamless";
  /** Mean absolute per-channel difference on the wrap seam (0…255). */
  edgeDelta: number;
  /** Mean absolute difference of a random *interior* seam, as a baseline. */
  baselineDelta: number;
  width: number;
  height: number;
  tileable: boolean;
  checkedAt: string;
  engine: "sharp" | "heuristic";
  note?: string;
}

export interface ScanThreat {
  id: string;
  label: Localized;
  severity: "low" | "medium" | "high";
  detail?: string;
}

export interface ScanReport {
  engine: "clamav" | "heuristic";
  status: "pending" | "clean" | "infected" | "suspicious" | "error";
  threats: ScanThreat[];
  /** ClamAV signature version, when a real daemon answered. */
  signatureDb?: string;
  scannedAt?: string;
  durationMs?: number;
  detail?: string;
}

/* ------------------------------------------------------------------ */
/* Assets & licensing                                                  */
/* ------------------------------------------------------------------ */

export type AssetKind = "pattern" | "illustration" | "photo" | "vector" | "template" | "font";

export type LicenseKind = "personal" | "commercial" | "extended" | "exclusive";

export interface LicenseTier {
  id: ID;
  kind: LicenseKind;
  title: Localized;
  terms: Localized;
  price: PricePair;
  /** 0 = unlimited. */
  maxDownloads: number;
  /** Max printed/sold units covered by this license. 0 = unlimited. */
  maxUnits: number;
  /** Exclusive tiers are removed from sale once sold. */
  exclusive: boolean;
  enabled: boolean;
}

export type AssetStatus =
  | "uploading"
  | "scanning"
  | "pending_review"
  | "approved"
  | "rejected"
  | "delisted"
  | "sold_exclusive";

export interface AssetStats {
  views: number;
  sales: number;
  revenue: PricePair;
  lastSaleAt?: string;
}

/**
 * One stored deliverable: the bytes behind a single (colourway, format) pair.
 *
 * Every file lives in private storage; the buyer only ever sees it through a
 * signed, quota-counted download.
 */
export interface ColourwayFile {
  id: ID;
  /** Which deliverable this file is — see `lib/marketplace/formats.ts`. */
  formatId: DeliverableFormatId | ExportFormatId;
  key: string;
  provider: StorageProvider;
  filename: string;
  mime: string;
  sizeBytes: number;
  /** sha256 hex — integrity check and duplicate detection. */
  sha256: string;
  width?: number;
  height?: number;
  /** Set when the artist supplied this file as the storefront cover. */
  cover?: boolean;
  uploadedAt: string;
}

/** A colour version of one design (`رنگ‌بندی`): name, swatch and its own files. */
export interface Colourway {
  id: ID;
  name: Localized;
  /** `#rrggbb` swatch used in the uploader, the shop and the license vault. */
  hex: string;
  files: ColourwayFile[];
  /** Watermarked public preview of *this* colour (`private/derived/…`). */
  previewKey?: string | null;
  order: number;
  createdAt: string;
}

export interface Asset {
  id: ID;
  /** Owning account (artist user id) — null for site-owned assets. */
  ownerUserId: ID | null;
  /** Linked artist record (content store) — null for site-owned assets. */
  artistId: ID | null;
  /** Optional link into the existing catalog. */
  patternId?: ID | null;
  productId?: ID | null;

  title: Localized;
  slug: string;
  description: Localized;
  kind: AssetKind;
  tags: string[];
  /**
   * Product family the work is made for (`lib/data/families.ts`) — chosen by the
   * artist on upload, used by the shop's «الگو» tree.
   */
  familyId?: ID | null;

  /** The private master file (full resolution, clean) — the primary raster. */
  master: StoredFile;
  /**
   * Colourways of this design, each holding its own deliverable files
   * (PNG/JPG/AI/PSD/SVG/EPS). Empty/absent on legacy assets, which
   * `lib/marketplace/colourways.ts` presents as a single default colourway.
   */
  colourways?: Colourway[];
  /** Small preview used on the storefront (watermarked). */
  previewKey?: string;
  /** Public derivative set. */
  derivatives: DerivedFile[];
  mockups: DerivedFile[];
  /** 2×2 tile preview that visualises the repeat. */
  tileKey?: string;

  seamless: SeamlessReport;
  scan: ScanReport;

  tiers: LicenseTier[];
  /** Artist revenue share (0–100). Falls back to the platform default. */
  revenueSharePct?: number;

  status: AssetStatus;
  /** Public visibility switch (site-owned assets are public by default). */
  visibility: "public" | "private";
  review: {
    reviewedBy?: string;
    reviewedAt?: string;
    note?: string;
    /** Set when the artist added colourways/files after approval. */
    filesUpdatedAt?: string;
  };
  rejectionNote?: string;

  stats: AssetStats;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Upload sessions                                                     */
/* ------------------------------------------------------------------ */

export interface UploadSession {
  id: ID;
  userId: ID;
  artistId: ID | null;
  filename: string;
  mime: string;
  sizeBytes: number;
  provider: StorageProvider;
  key: string;
  mode: "single" | "multipart";
  /** Multipart chunk size used for this session. */
  partSize: number;
  parts: { partNumber: number; bytes: number; etag: string }[];
  /** Filesystem staging dir (local provider) or S3 uploadId, per provider. */
  staging?: string;
  s3UploadId?: string;
  /**
   * Which deliverable this session carries, and which colourway of which asset
   * it belongs to. The first file of a work creates the asset; every following
   * file is attached to it via `attachToAssetId`.
   */
  formatId?: ExportFormatId;
  colourwayId?: ID;
  /** Name and swatch used when this session introduces a new colourway. */
  colourway?: { name: Localized; hex: string } | null;
  attachToAssetId?: ID | null;
  /** Metadata collected in the upload form. */
  meta: {
    title: Localized;
    description: Localized;
    kind: AssetKind;
    tags: string[];
    /** Product family chosen in the upload form. */
    familyId?: string | null;
    patternId?: string | null;
    tiers: LicenseTier[];
  };
  status: "open" | "completed" | "aborted";
  createdAt: string;
  completedAt?: string;
  /** Asset created on completion. */
  assetId?: ID;
}

/* ------------------------------------------------------------------ */
/* Orders, payments, licenses                                          */
/* ------------------------------------------------------------------ */

export type PaymentProviderId = "zarinpal" | "stripe" | "wallet";

export type PaymentStatus =
  | "created"
  | "redirected"
  | "authorized"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export interface PaymentAttempt {
  id: ID;
  orderId: ID;
  provider: PaymentProviderId;
  /** Gateway-side reference: Zarinpal authority / Stripe PaymentIntent id. */
  reference: string;
  amount: ChargeAmount;
  status: PaymentStatus;
  /** true when the provider is the built-in test gateway (no live credentials). */
  sandbox: boolean;
  /** Card/PSP details echoed back by the gateway for the receipt. */
  cardMask?: string;
  refId?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  raw?: Record<string, unknown>;
}

export interface OrderLine {
  assetId: ID;
  tierId: ID;
  title: string;
  kind: AssetKind;
  licenseKind: LicenseKind;
  price: PricePair;
  /** Share of the order-level discount attributed to this line. */
  discount?: PricePair;
  /** True when the line was paid for by the buyer's download pass. */
  coveredByPass?: boolean;
  /** The pass that covered it, so the licence can be traced back. */
  viaSubscriptionId?: ID;
}

export interface SubscriptionLine {
  planId: ID;
  seats?: number;
  price: PricePair;
}

export type MarketplaceOrderStatus =
  | "pending_payment"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export interface MarketplaceOrder {
  id: ID;
  userId: ID | null;
  buyer: { name: string; email: string; phone?: string; company?: string; vatId?: string; country?: string };
  lines: OrderLine[];
  subscription?: SubscriptionLine;
  subtotal: PricePair;
  discount: PricePair;
  tax: PricePair;
  total: PricePair;
  couponCode?: string;
  affiliateUserId?: ID | null;
  charge: ChargeAmount;
  status: MarketplaceOrderStatus;
  fulfillment: { completedAt?: string; licenses: ID[]; emails: string[] };
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  notes?: string;
}

export interface DownloadRecord {
  at: string;
  ip: string;
  userAgent: string;
  tokenId: string;
  bytes?: number;
}

export type LicenseStatus = "active" | "revoked" | "expired";

export interface License {
  id: ID;
  /** Human-readable, printed on the certificate: RA-LIC-2026-000123 */
  serial: string;
  orderId: ID;
  assetId: ID;
  tierId: ID;
  licenseKind: LicenseKind;
  exclusive: boolean;
  title: Localized;
  artistId: ID | null;
  artistName: Localized;
  buyerUserId: ID | null;
  buyerName: string;
  buyerEmail: string;
  pricePaid: PricePair;
  /** Artist royalty accrued for this license. */
  royalty: { pct: number; amount: PricePair; platformFee: PricePair };
  issuedAt: string;
  /** Set when the license came from a subscription download grant. */
  viaSubscriptionId?: ID;
  maxDownloads: number;
  downloads: DownloadRecord[];
  status: LicenseStatus;
  revokedAt?: string;
  revokedReason?: string;
}

/* ------------------------------------------------------------------ */
/* Coupons & affiliates                                                */
/* ------------------------------------------------------------------ */

export type CouponKind = "percent" | "fixed" | "free";

export interface Coupon {
  code: string;
  kind: CouponKind;
  /** percent: 0–100. fixed: currency pair. */
  percent?: number;
  fixed?: PricePair;
  active: boolean;
  /** null = applies to everything. */
  assetIds?: ID[] | null;
  artistId?: ID | null;
  /** Only for international (Stripe) checkout. */
  internationalOnly?: boolean;
  maxRedemptions?: number;
  maxRedemptionsPerUser?: number;
  redemptions: number;
  startsAt?: string;
  expiresAt?: string;
  minSubtotal?: PricePair;
  /** Affiliate attribution: the account that gets the referral commission. */
  affiliateUserId?: ID | null;
  affiliatePct?: number;
  note?: string;
  createdBy?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Subscriptions                                                       */
/* ------------------------------------------------------------------ */

export interface SubscriptionPlan {
  id: ID;
  title: Localized;
  description: Localized;
  price: PricePair;
  /** Downloads included per billing period. 0 = unlimited. */
  downloadsPerMonth: number;
  /** License kinds the pass can unlock. */
  covers: LicenseKind[];
  /** Excluded assets (e.g. exclusive works). */
  excludesExclusive: boolean;
  features: Localized[];
  featured?: boolean;
  order: number;
  enabled: boolean;
}

export interface Subscription {
  id: ID;
  userId: ID;
  planId: ID;
  status: "active" | "canceled" | "expired" | "pending";
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  downloadsUsed: number;
  gateway?: PaymentProviderId;
  orderIds: ID[];
  canceledAt?: string;
  autoRenew: boolean;
}

/* ------------------------------------------------------------------ */
/* Royalties, payouts, ledger                                          */
/* ------------------------------------------------------------------ */

export type LedgerKind =
  | "sale"
  | "platform_fee"
  | "referral"
  | "payout"
  | "adjustment"
  | "reversal";

export interface LedgerEntry {
  id: ID;
  artistId: ID | null;
  userId?: ID | null;
  kind: LedgerKind;
  /** Signed: positive credits the artist, negative debits. */
  amount: PricePair;
  orderId?: ID;
  licenseId?: ID;
  payoutId?: ID;
  note?: Localized;
  createdAt: string;
}

export type PayoutStatus = "requested" | "approved" | "paid" | "rejected";

export interface PayoutProfile {
  artistId: ID;
  holder: string;
  method: "iban" | "card" | "paypal";
  iban?: string;
  cardNumber?: string;
  paypalEmail?: string;
  nationalId?: string;
  bankName?: string;
  updatedAt: string;
}

export interface Payout {
  id: ID;
  artistId: ID;
  userId: ID | null;
  amount: PricePair;
  method: PayoutProfile["method"];
  destination: string;
  status: PayoutStatus;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  paidAt?: string;
  reference?: string;
  note?: string;
  /** Balance snapshot at request time (audit trail). */
  balanceAtRequest?: PricePair;
}

/* ------------------------------------------------------------------ */
/* Outbox (email delivery)                                             */
/* ------------------------------------------------------------------ */

export interface OutboxMessage {
  id: ID;
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind: "delivery" | "receipt" | "sale-notice" | "payout" | "subscription" | "test" | "review";
  status: "queued" | "sent" | "failed" | "logged";
  provider: "resend" | "smtp" | "outbox";
  error?: string;
  createdAt: string;
  sentAt?: string;
  meta?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export type AnalyticsEventKind = "view" | "checkout_start" | "purchase" | "download" | "certificate";

export interface AnalyticsEvent {
  id: ID;
  kind: AnalyticsEventKind;
  assetId?: ID;
  artistId?: ID | null;
  userId?: ID | null;
  sessionId?: string;
  value?: PricePair;
  at: string;
  meta?: Record<string, string>;
}

export interface SalesSeriesPoint {
  date: string;
  revenueFa: number;
  revenueEn: number;
  orders: number;
  downloads: number;
}

export interface ArtistAnalytics {
  artistId: ID;
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
  series: SalesSeriesPoint[];
  topAssets: { assetId: ID; title: Localized; sales: number; revenue: PricePair }[];
  byLicense: { kind: LicenseKind; sales: number; revenue: PricePair }[];
  byCountry: { country: string; sales: number; revenue: PricePair }[];
  byProvider: { provider: PaymentProviderId; sales: number; revenue: PricePair }[];
  subscribers: number;
  referral: { clicks: number; conversions: number; commission: PricePair };
}

/* ------------------------------------------------------------------ */
/* Feature capabilities (what is really wired up in this deployment)   */
/* ------------------------------------------------------------------ */

export interface MarketplaceCapabilities {
  privateStorage: { provider: StorageProvider; configured: boolean; note: string };
  multipart: { enabled: boolean; thresholdBytes: number; partSize: number; note: string };
  virusScan: { engine: "clamav" | "heuristic"; configured: boolean; note: string };
  watermark: { engine: "sharp" | "svg"; available: boolean; note: string };
  certificates: { pdf: boolean; persian: boolean; note: string };
  zarinpal: { mode: "live" | "sandbox"; configured: boolean; note: string };
  stripe: { mode: "live" | "sandbox"; configured: boolean; note: string };
  email: { provider: "resend" | "smtp" | "outbox"; configured: boolean; note: string };
  subscriptions: { enabled: boolean };
  affiliates: { enabled: boolean };
}
