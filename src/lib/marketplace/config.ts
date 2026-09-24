import "server-only";
import type {
  LicenseTier,
  MarketplaceCapabilities,
  PricePair,
  StorageProvider,
  SubscriptionPlan,
} from "./types";

/**
 * Marketplace configuration — one place for fees, defaults, storage layout and
 * the *capability probe* that tells the UI what is genuinely wired up in the
 * current deployment (so the admin/artist panels never promise something the
 * environment cannot do).
 */

/* ------------------------------------------------------------------ */
/* Storage layout                                                      */
/* ------------------------------------------------------------------ */

/** Private objects (masters, staging chunks) — never web-reachable directly. */
export const PRIVATE_PREFIX = "masters";
/** Public derivative objects (watermarked previews, thumbnails, mockups). */
export const DERIVED_PREFIX = "derived";

export const LOCAL_PRIVATE_DIR = ["data", "private"];
export const LOCAL_DERIVED_DIR = ["data", "derived"];
export const LOCAL_STAGING_DIR = ["data", "private", "staging"];

/** Files ≥ this size switch to multipart upload (explicit setting, or the S3 default). */
export const MULTIPART_THRESHOLD_BYTES = Number(process.env.MARKETPLACE_MULTIPART_THRESHOLD_MB ?? 200) * 1024 * 1024;
/** Chunk size used for multipart sessions (S3 requires ≥ 5 MiB). */
export const MULTIPART_PART_SIZE = Math.max(5 * 1024 * 1024, Number(process.env.MARKETPLACE_PART_SIZE_MB ?? 8) * 1024 * 1024);

/**
 * The threshold that actually applies to a new upload session.
 *
 * On the local backend every chunk travels through the app, so anything larger
 * than one part is sent in verified, individually retried chunks — a dropped
 * connection costs one part instead of the whole file, and no request body grows
 * past what reverse proxies accept. S3 keeps the 200 MB default: its chunks are
 * PUT straight to the bucket, which needs a CORS rule on the bucket.
 * An explicit `MARKETPLACE_MULTIPART_THRESHOLD_MB` always wins.
 */
export function multipartThresholdFor(provider: StorageProvider): number {
  const configured = process.env.MARKETPLACE_MULTIPART_THRESHOLD_MB;
  if (configured !== undefined && configured.trim() !== "") return MULTIPART_THRESHOLD_BYTES;
  return provider === "local" ? MULTIPART_PART_SIZE : MULTIPART_THRESHOLD_BYTES;
}
/** Hard cap for a single master upload. */
export const MAX_MASTER_BYTES = Number(process.env.MARKETPLACE_MAX_MASTER_MB ?? 2048) * 1024 * 1024;

export const MIN_MASTER_BYTES = 1024; // 1 KiB

/**
 * Accepted master file types → canonical storage extension.
 *
 * The list mirrors `EXPORT_FORMATS` in `lib/marketplace/formats.ts` plus the
 * archive/print types artists also hand over. Several rows share an extension
 * on purpose: browsers report Photoshop, Illustrator and EPS files through a
 * handful of different MIME aliases, and the *chosen format* (not this table)
 * decides the extension we finally store — see `createUploadSession`.
 */
export const ACCEPTED_MASTER_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/tiff": "tif",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/postscript": "ai",
  "application/illustrator": "ai",
  "application/x-illustrator": "ai",
  "application/vnd.adobe.illustrator": "ai",
  "image/vnd.adobe.photoshop": "psd",
  "image/x-photoshop": "psd",
  "image/psd": "psd",
  "application/x-photoshop": "psd",
  "application/photoshop": "psd",
  "application/eps": "eps",
  "application/x-eps": "eps",
  "image/eps": "eps",
  "image/x-eps": "eps",
  "image/svg+xml": "svg",
};

/** Canonical extension for an accepted master MIME type (null when unsupported). */
export function acceptedMasterMime(mime: string): string | null {
  return ACCEPTED_MASTER_MIME[mime.trim().toLowerCase()] ?? null;
}

export function isAcceptedMasterMime(mime: string): boolean {
  return acceptedMasterMime(mime) !== null;
}

/* ------------------------------------------------------------------ */
/* Economics                                                           */
/* ------------------------------------------------------------------ */

/** Artist share of the *net* license revenue, when the artist record is silent. */
export const DEFAULT_ARTIST_SHARE_PCT = Number(process.env.MARKETPLACE_ARTIST_SHARE_PCT ?? 40);
/** Referral commission paid to an affiliate, taken from the platform fee. */
export const DEFAULT_AFFILIATE_PCT = Number(process.env.MARKETPLACE_AFFILIATE_PCT ?? 10);
/** Domestic VAT applied to Iranian (IRT) charges. 0 disables it. */
export const VAT_PCT_IRAN = Number(process.env.MARKETPLACE_VAT_PCT ?? 9);
/** Minimum balance an artist needs before requesting a payout (toman). */
export const MIN_PAYOUT_FA = Number(process.env.MARKETPLACE_MIN_PAYOUT_TOMAN ?? 500_000);
export const MIN_PAYOUT_EN = Number(process.env.MARKETPLACE_MIN_PAYOUT_USD ?? 25);

/** How long a signed download link stays valid. */
export const DOWNLOAD_TOKEN_TTL_S = Number(process.env.MARKETPLACE_DOWNLOAD_TTL_S ?? 900);
/** How long the emailed delivery links stay valid. */
export const EMAIL_LINK_TTL_S = Number(process.env.MARKETPLACE_EMAIL_LINK_TTL_S ?? 60 * 60 * 24 * 7);

/** Human wording for the delivery-link lifetime, kept next to the value itself. */
export const GIFT_LINK_TTL_LABEL = {
  fa: EMAIL_LINK_TTL_S >= 86_400 ? `${Math.round(EMAIL_LINK_TTL_S / 86_400)} روز` : `${Math.round(EMAIL_LINK_TTL_S / 3600)} ساعت`,
  en: EMAIL_LINK_TTL_S >= 86_400 ? `${Math.round(EMAIL_LINK_TTL_S / 86_400)} days` : `${Math.round(EMAIL_LINK_TTL_S / 3600)} hours`,
} as const;
/** Max downloads when a tier does not specify. */
export const DEFAULT_MAX_DOWNLOADS = 5;
/** Period length for subscription passes. */
export const SUBSCRIPTION_PERIOD_DAYS = 30;
/** Tax label used on receipts. */
export const TAX_LABEL = { fa: "مالیات بر ارزش افزوده", en: "VAT" };

/* ------------------------------------------------------------------ */
/* Default license tier presets for a new upload                       */
/* ------------------------------------------------------------------ */

export function defaultTiers(basePrice: PricePair = { fa: 900_000, en: 39 }): LicenseTier[] {
  return [
    {
      id: "tier-personal",
      kind: "personal",
      title: { fa: "لایسنس شخصی", en: "Personal license" },
      terms: {
        fa: "استفاده در پروژه‌های شخصی و غیرتجاری؛ چاپ حداکثر ۲ نسخه؛ بدون فروش اثر.",
        en: "Personal, non-commercial use; up to 2 prints; no resale.",
      },
      price: basePrice,
      maxDownloads: DEFAULT_MAX_DOWNLOADS,
      maxUnits: 2,
      exclusive: false,
      enabled: true,
    },
    {
      id: "tier-commercial",
      kind: "commercial",
      title: { fa: "لایسنس تجاری", en: "Commercial license" },
      terms: {
        fa: "استفاده تجاری تا ۵۰۰ واحد یا یک پروژه؛ شامل چاپ، بسته‌بندی و محصولات فروشی.",
        en: "Commercial use up to 500 units or one project; print, packaging and products for sale.",
      },
      price: { fa: Math.round(basePrice.fa * 3), en: Math.round(basePrice.en * 3) },
      maxDownloads: DEFAULT_MAX_DOWNLOADS,
      maxUnits: 500,
      exclusive: false,
      enabled: true,
    },
    {
      id: "tier-extended",
      kind: "extended",
      title: { fa: "لایسنس گسترده", en: "Extended license" },
      terms: {
        fa: "استفاده نامحدود، شامل برندینگ و محصولات انبوه؛ بدون محدودیت تعداد.",
        en: "Unlimited use, including branding and mass products; no volume limit.",
      },
      price: { fa: Math.round(basePrice.fa * 8), en: Math.round(basePrice.en * 8) },
      maxDownloads: DEFAULT_MAX_DOWNLOADS,
      maxUnits: 0,
      exclusive: false,
      enabled: true,
    },
    {
      id: "tier-exclusive",
      kind: "exclusive",
      title: { fa: "لایسنس انحصاری", en: "Exclusive license" },
      terms: {
        fa: "مالکیت انحصاری اثر؛ پس از فروش، اثر از فروشگاه حذف می‌شود و دیگر به کسی فروخته نمی‌شود.",
        en: "Sole ownership of the work; once sold it is delisted and never sold again.",
      },
      price: { fa: Math.round(basePrice.fa * 25), en: Math.round(basePrice.en * 25) },
      maxDownloads: DEFAULT_MAX_DOWNLOADS,
      maxUnits: 0,
      exclusive: true,
      enabled: false,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Subscription plans                                                  */
/* ------------------------------------------------------------------ */

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "pass-starter",
    title: { fa: "پاس ماهانه", en: "Monthly pass" },
    description: {
      fa: "هر ماه ۵ فایل با لایسنس شخصی و تجاری — مناسب طراحان فردی.",
      en: "5 personal & commercial downloads every month — for solo designers.",
    },
    price: { fa: 1_200_000, en: 29 },
    downloadsPerMonth: 5,
    covers: ["personal", "commercial"],
    excludesExclusive: true,
    features: [
      { fa: "۵ دانلود در ماه", en: "5 downloads / month" },
      { fa: "لایسنس شخصی و تجاری", en: "Personal & commercial licenses" },
      { fa: "گواهی لایسنس PDF", en: "PDF license certificate" },
      { fa: "دسترسی به موکاپ‌های آماده", en: "Ready-made mockups" },
    ],
    order: 1,
    enabled: true,
  },
  {
    id: "pass-studio",
    title: { fa: "پاس استودیو", en: "Studio pass" },
    description: {
      fa: "۱۵ دانلود در ماه با تمام لایسنس‌های غیرانحصاری — برای تیم‌ها و کارگاه‌ها.",
      en: "15 downloads / month across every non-exclusive license — for teams and workshops.",
    },
    price: { fa: 2_900_000, en: 69 },
    downloadsPerMonth: 15,
    covers: ["personal", "commercial", "extended"],
    excludesExclusive: true,
    features: [
      { fa: "۱۵ دانلود در ماه", en: "15 downloads / month" },
      { fa: "شامل لایسنس گسترده", en: "Includes extended license" },
      { fa: "گواهی لایسنس با نام شرکت", en: "Certificates in your company name" },
      { fa: "پشتیبانی اولویت‌دار", en: "Priority support" },
    ],
    featured: true,
    order: 2,
    enabled: true,
  },
  {
    id: "pass-unlimited",
    title: { fa: "پاس بی‌نهایت", en: "Unlimited pass" },
    description: {
      fa: "دانلود نامحدود لایسنس‌های غیرانحصاری برای آژانس‌ها و تولیدکنندگان.",
      en: "Unlimited non-exclusive downloads for agencies and manufacturers.",
    },
    price: { fa: 6_500_000, en: 149 },
    downloadsPerMonth: 0,
    covers: ["personal", "commercial", "extended"],
    excludesExclusive: true,
    features: [
      { fa: "دانلود نامحدود", en: "Unlimited downloads" },
      { fa: "تمام لایسنس‌های غیرانحصاری", en: "All non-exclusive licenses" },
      { fa: "گواهی و فاکتور شرکتی", en: "Certificates & company invoices" },
      { fa: "مدیر موفقیت اختصاصی", en: "Dedicated success manager" },
    ],
    order: 3,
    enabled: true,
  },
];

export function getPlan(id: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id && plan.enabled) ?? null;
}

/* ------------------------------------------------------------------ */
/* Capability probe                                                    */
/* ------------------------------------------------------------------ */

export function storageProvider(): StorageProvider {
  return process.env.MARKETPLACE_S3_BUCKET && process.env.MARKETPLACE_S3_ACCESS_KEY_ID ? "s3" : "local";
}

export function clamavHost(): string | null {
  return process.env.CLAMAV_HOST ?? null;
}

export function zarinpalMerchantId(): string | null {
  const id = process.env.ZARINPAL_MERCHANT_ID?.trim();
  return id ? id : null;
}

export function stripeSecret(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key ? key : null;
}

export function mailProvider(): "resend" | "smtp" | "outbox" {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_HOST && process.env.SMTP_USER) return "smtp";
  return "outbox";
}

export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (url) return url;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return "https://rosie-atelier.example";
}

/** Absolute URL helper that respects a sub-path deployment. */
export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${siteUrl()}${base}${path.startsWith("/") ? path : `/${path}`}`;
}

let sharpProbe: boolean | null = null;

/** Probes the optional `sharp` dependency once per process. */
export async function sharpAvailable(): Promise<boolean> {
  if (sharpProbe !== null) return sharpProbe;
  try {
    await import("sharp");
    sharpProbe = true;
  } catch {
    sharpProbe = false;
  }
  return sharpProbe;
}

export async function capabilities(): Promise<MarketplaceCapabilities> {
  const sharp = await sharpAvailable();
  const provider = storageProvider();
  const clam = clamavHost();
  const zarinpal = zarinpalMerchantId();
  const stripe = stripeSecret();
  const mail = mailProvider();

  return {
    privateStorage: {
      provider,
      configured: Boolean(provider),
      note:
        provider === "s3"
          ? "S3-compatible private bucket (presigned multipart uploads)"
          : "Local private directory `data/private` (dev / single-node)",
    },
    multipart: {
      enabled: true,
      thresholdBytes: multipartThresholdFor(provider),
      partSize: MULTIPART_PART_SIZE,
      note:
        provider === "s3"
          ? "Presigned S3 multipart — browser uploads straight to the bucket"
          : "Local multipart chunks streamed through /api/marketplace/upload/part",
    },
    virusScan: {
      engine: clam ? "clamav" : "heuristic",
      configured: Boolean(clam),
      note: clam
        ? `clamd at ${clam} (INSTREAM protocol)`
        : "Built-in signature/heuristic scanner (EICAR, executables, embedded payloads, archive bombs). Set CLAMAV_HOST for clamd.",
    },
    watermark: {
      engine: sharp ? "sharp" : "svg",
      available: true,
      note: sharp
        ? "Raster tiling watermark rendered with sharp/libvips"
        : "Vector watermark composed as SVG (install `sharp` for raster output)",
    },
    certificates: {
      pdf: true,
      persian: true,
      note: "pdf-lib + fontkit with the bundled IranSans web font and a bidi/re-shaping pass",
    },
    zarinpal: {
      mode: zarinpal ? "live" : "sandbox",
      configured: Boolean(zarinpal),
      note: zarinpal
        ? "Live Zarinpal REST v4 (payment/request.json → StartPay → verify.json)"
        : "Built-in test gateway that speaks the same request/verify contract — real end-to-end test purchases",
    },
    stripe: {
      mode: stripe ? "live" : "sandbox",
      configured: Boolean(stripe),
      note: stripe ? "Live Stripe Checkout + payment intents" : "Stripe-compatible test provider (no live keys configured)",
    },
    email: {
      provider: mail,
      configured: mail !== "outbox",
      note:
        mail === "outbox"
          ? "Outbox: every message is stored and readable in the admin panel (set RESEND_API_KEY or SMTP_* for real delivery)"
          : mail === "resend"
            ? "Resend HTTP API"
            : `SMTP via ${process.env.SMTP_HOST}`,
    },
    subscriptions: { enabled: true },
    affiliates: { enabled: true },
  };
}
