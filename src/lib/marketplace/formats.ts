import type { Localized } from "@/lib/i18n/types";

/**
 * Deliverable formats for a pattern or illustration.
 *
 * This is the contract between three places, so it lives in one module:
 *
 *   • the artist uploader — one slot per format, per colourway
 *   • the private storage — every stored file knows which format it is
 *   • the buyer's license vault — the files a license unlocks
 *
 * The order of `EXPORT_FORMATS` is the order the artist sees on upload and the
 * buyer sees on download: PNG/JPG (delivered artwork), the preview image, then
 * the editable sources (AI, PSD, SVG, EPS).
 *
 * `storedMime` is the single place that normalises the MIME a browser reports
 * onto the canonical value we store; the storage whitelist in
 * `lib/marketplace/config.ts` accepts every alias listed here.
 */

export type ExportFormatId = "png" | "jpg" | "preview" | "ai" | "psd" | "svg" | "eps";

/** Formats that can be sold and downloaded. `preview` is the cover image only. */
export type DeliverableFormatId = Exclude<ExportFormatId, "preview">;

export interface ExportFormat {
  id: ExportFormatId;
  /** Canonical extension used for stored objects. */
  ext: string;
  /** All extensions a browser may report for this format. */
  extensions: string[];
  /** MIME types accepted for this format (the browser's own value wins for AI/EPS). */
  mimes: string[];
  /** MIME written to storage — one canonical value per format. */
  storedMime: string;
  label: Localized;
  /** Raster files can be analysed for seams and turned into previews. */
  raster: boolean;
  /** Delivery files are what buyers actually use; sources are the editing files. */
  group: "delivery" | "cover" | "source";
  /** A one-line explanation shown under the upload slot. */
  hint: Localized;
  /** Recommended for a professional hand-off (the uploader nudges, never blocks). */
  recommended: boolean;
}

/**
 * PNG/JPG · Preview Image · AI · PSD · SVG · EPS — in exactly that order.
 *
 * `storedMime` matters: AI and EPS are both reported as `application/postscript`
 * by many browsers, so the *extension* decides the format and the stored MIME is
 * normalised here instead of trusting whatever the client sent.
 */
export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: "png",
    ext: "png",
    extensions: ["png"],
    mimes: ["image/png"],
    storedMime: "image/png",
    label: { fa: "PNG", en: "PNG" },
    raster: true,
    group: "delivery",
    hint: {
      fa: "تصویر بدون افت کیفیت و با پس‌زمینه شفاف — نسخه‌ای که خریدار مستقیم استفاده می‌کند.",
      en: "Lossless artwork with transparency — what buyers use straight away.",
    },
    recommended: true,
  },
  {
    id: "jpg",
    ext: "jpg",
    extensions: ["jpg", "jpeg", "jpe"],
    mimes: ["image/jpeg", "image/jpg", "image/pjpeg"],
    storedMime: "image/jpeg",
    label: { fa: "JPG", en: "JPG" },
    raster: true,
    group: "delivery",
    hint: {
      fa: "نسخهٔ سبک برای چاپ دیجیتال و ارسال سریع. بدون شفافیت، کیفیت بالا.",
      en: "A lighter version for digital print and quick delivery. High quality, no transparency.",
    },
    recommended: false,
  },
  {
    id: "preview",
    ext: "jpg",
    extensions: ["jpg", "jpeg", "jpg", "webp"],
    mimes: ["image/jpeg", "image/png", "image/webp"],
    storedMime: "image/jpeg",
    label: { fa: "تصویر پیش‌نمایش", en: "Preview image" },
    raster: true,
    group: "cover",
    hint: {
      fa: "تصویر اصلی کار در فروشگاه. اگر نفرستید، پیش‌نمایش واترمارک‌دار خودکار ساخته می‌شود.",
      en: "The cover shown in the shop. Leave it out and a watermarked preview is generated for you.",
    },
    recommended: false,
  },
  {
    id: "ai",
    ext: "ai",
    extensions: ["ai"],
    mimes: ["application/illustrator", "application/x-illustrator", "application/postscript", "application/pdf", "application/vnd.adobe.illustrator"],
    storedMime: "application/illustrator",
    label: { fa: "AI", en: "AI" },
    raster: false,
    group: "source",
    hint: {
      fa: "فایل برداری ادوبی ایلاستریتور برای ویرایش رنگ و اندازه.",
      en: "Adobe Illustrator vector source for recolouring and resizing.",
    },
    recommended: true,
  },
  {
    id: "psd",
    ext: "psd",
    extensions: ["psd"],
    mimes: ["image/vnd.adobe.photoshop", "image/x-photoshop", "image/psd", "application/x-photoshop", "application/photoshop"],
    storedMime: "image/vnd.adobe.photoshop",
    label: { fa: "PSD", en: "PSD" },
    raster: false,
    group: "source",
    hint: {
      fa: "فایل لایه‌دار فتوشاپ برای جدا کردن لایه‌ها و ساخت رنگ‌بندی تازه.",
      en: "Layered Photoshop file so layers can be separated and recoloured.",
    },
    recommended: true,
  },
  {
    id: "svg",
    ext: "svg",
    extensions: ["svg"],
    mimes: ["image/svg+xml"],
    storedMime: "image/svg+xml",
    label: { fa: "SVG", en: "SVG" },
    raster: false,
    group: "source",
    hint: {
      fa: "وکتور باز و سبک؛ مناسب وب، برش لیزری و مقیاس‌پذیری بی‌نهایت.",
      en: "Open, lightweight vector — for web, laser cutting and unlimited scaling.",
    },
    recommended: true,
  },
  {
    id: "eps",
    ext: "eps",
    extensions: ["eps", "epsf"],
    mimes: ["application/eps", "application/x-eps", "image/eps", "image/x-eps", "application/postscript"],
    storedMime: "application/postscript",
    label: { fa: "EPS", en: "EPS" },
    raster: false,
    group: "source",
    hint: {
      fa: "فایل چاپ حرفه‌ای برای چاپخانه و نرم‌افزارهای برداری قدیمی‌تر.",
      en: "A professional print file for presses and older vector tooling.",
    },
    recommended: false,
  },
];

export const EXPORT_FORMAT_IDS: ExportFormatId[] = EXPORT_FORMATS.map((format) => format.id);

/**
 * Everything a buyer can receive — the cover image is not sold.
 * The id is narrowed so callers get the deliverable union, not the wider
 * `ExportFormatId` (which also contains `preview`).
 */
export const DELIVERABLE_FORMATS: (ExportFormat & { id: DeliverableFormatId })[] = EXPORT_FORMATS.filter(
  (format): format is ExportFormat & { id: DeliverableFormatId } => format.group !== "cover",
);

/** A product must ship at least one of these so previews can be rendered. */
export const RASTER_DELIVERY_IDS: DeliverableFormatId[] = ["png", "jpg"];

export function formatById(id: string | null | undefined): ExportFormat | null {
  if (!id) return null;
  return EXPORT_FORMATS.find((format) => format.id === id) ?? null;
}

export function isExportFormatId(id: unknown): id is ExportFormatId {
  return typeof id === "string" && EXPORT_FORMATS.some((format) => format.id === id);
}

export function isDeliverableFormatId(id: unknown): id is DeliverableFormatId {
  return isExportFormatId(id) && id !== "preview";
}

export function isRasterFormat(id: string | null | undefined): boolean {
  return formatById(id)?.raster === true;
}

/** Bilingual label with a safe fallback for unknown/legacy values. */
export function formatLabel(id: string | null | undefined, locale: "fa" | "en" = "fa"): string {
  const format = formatById(id);
  if (!format) return id ?? "";
  return format.label[locale] ?? format.label.fa;
}

export function formatStoredMime(id: ExportFormatId): string {
  return formatById(id)?.storedMime ?? "application/octet-stream";
}

/* ------------------------------------------------------------------ */
/* Detection & validation                                              */
/* ------------------------------------------------------------------ */

export function extensionOf(filename: string): string {
  const parts = filename.trim().toLowerCase().split(".");
  return parts.length > 1 ? parts.pop()! : "";
}

/** Format implied by the file name — the most reliable signal for AI/EPS/PSD. */
export function formatFromFilename(filename: string): ExportFormat | null {
  const ext = extensionOf(filename);
  if (!ext) return null;
  return EXPORT_FORMATS.find((format) => format.extensions.includes(ext)) ?? null;
}

/** Format implied by the browser-reported MIME type. */
export function formatFromMime(mime: string): ExportFormat | null {
  const clean = mime.trim().toLowerCase();
  if (!clean) return null;
  return EXPORT_FORMATS.find((format) => format.mimes.includes(clean)) ?? null;
}

/**
 * Best-effort detection: extension first (AI and EPS are commonly reported as
 * `application/postscript`), then the MIME type.
 */
export function detectFormat(filename: string, mime?: string): ExportFormat | null {
  return formatFromFilename(filename) ?? (mime ? formatFromMime(mime) : null);
}

/**
 * Does the uploaded file really belong to the format the artist picked?
 *
 * A file passes when *either* the extension matches (`.psd` → PSD) *or* the MIME
 * type is one this format accepts, so a browser that reports `""` or
 * `application/octet-stream` for an `.ai` file still uploads correctly — while a
 * `.png` claimed as PSD is refused.
 */
export function formatAcceptsUpload(formatId: ExportFormatId, filename: string, mime: string): boolean {
  const format = formatById(formatId);
  if (!format) return false;
  const ext = extensionOf(filename);
  const cleanMime = mime.trim().toLowerCase();
  const extensionMatches = Boolean(ext) && format.extensions.includes(ext);
  const mimeMatches = Boolean(cleanMime) && cleanMime !== "application/octet-stream" && format.mimes.includes(cleanMime);
  return extensionMatches || mimeMatches;
}

/* ------------------------------------------------------------------ */
/* Size floor                                                          */
/* ------------------------------------------------------------------ */

/**
 * Smallest file we accept for a format.
 *
 * Raster artwork is never legitimately tiny, so 1 KiB catches truncated or
 * empty uploads. Vector and source files *are* legitimately small — a clean EPS
 * or SVG can be a few hundred bytes — so they only have to be big enough to
 * carry a signature. The header check (`verifyFileSignature`) is what really
 * proves the file is what it claims to be.
 */
export function minUploadBytes(formatId: string | null | undefined): number {
  const format = formatById(formatId);
  if (!format) return 1024;
  return format.raster ? 1024 : 64;
}

/* ------------------------------------------------------------------ */
/* Content sniffing                                                    */
/* ------------------------------------------------------------------ */

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((value, index) => bytes[offset + index] === value);
}

function looksLikeText(bytes: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 4096)).toLowerCase();
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

/**
 * Does the file's own header match the format the artist chose?
 *
 * A `.psd` that is really a ZIP, or a `PNG` that is really a PDF, is refused
 * before it is stored — the extension and the MIME are both client-controlled,
 * the magic bytes are not. Unknown content (an exotic but harmless AI build)
 * passes: this is a sanity gate, not the virus scanner.
 */
export function verifyFileSignature(formatId: ExportFormatId, bytes: Uint8Array): boolean {
  switch (formatId) {
    case "png":
      return startsWith(bytes, PNG_SIGNATURE);
    case "jpg":
      return startsWith(bytes, JPEG_SIGNATURE);
    case "preview":
      return (
        startsWith(bytes, PNG_SIGNATURE) ||
        startsWith(bytes, JPEG_SIGNATURE) ||
        (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8))
      );
    case "psd":
      return startsWith(bytes, [0x38, 0x42, 0x50, 0x53]); // "8BPS"
    case "ai":
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]) || startsWith(bytes, [0x25, 0x21, 0x50, 0x53]); // %PDF | %!PS
    case "eps":
      return startsWith(bytes, [0x25, 0x21, 0x50, 0x53]); // %!PS
    case "svg":
      return looksLikeText(bytes).includes("<svg");
    default:
      return true;
  }
}

/** Human list of a format set — «PNG · JPG · PSD» / "PNG · JPG · PSD". */
export function formatListLabel(ids: readonly string[], locale: "fa" | "en" = "fa", separator = " · "): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const id of EXPORT_FORMAT_IDS) {
    if (!ids.includes(id) || seen.has(id)) continue;
    seen.add(id);
    labels.push(formatLabel(id, locale));
  }
  return labels.join(separator);
}
