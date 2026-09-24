import { EXPORT_FORMATS, detectFormat, formatById, isDeliverableFormatId, type DeliverableFormatId, type ExportFormatId } from "./formats";
import type { Asset, Colourway, ColourwayFile } from "./types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Colourways and the files behind them.
 *
 * A work (`Asset`) has one or more colour versions; every version carries its
 * own deliverable files (PNG/JPG/AI/PSD/SVG/EPS). Nothing here touches storage
 * or the network — it is the shared, pure view that the uploader, the studio,
 * the storefront, the license vault and the download endpoint all agree on.
 *
 * Assets uploaded before colourways existed (and the site's own test assets)
 * simply have no `colourways` array; `assetColourways()` presents them as one
 * default colourway built from the legacy `master` + `previewKey`, so every
 * storefront surface keeps working without special cases.
 */

/** Id given to the synthetic colourway of a legacy single-file asset. */
export const DEFAULT_COLOURWAY_ID = "cw-default";

/** The palette offered as one-click swatches in the uploader. */
export const COLOUR_PRESETS: { hex: string; name: Localized }[] = [
  { hex: "#0f172a", name: { fa: "سرمه‌ای", en: "Midnight" } },
  { hex: "#7c3aed", name: { fa: "بنفش", en: "Violet" } },
  { hex: "#0ea5e9", name: { fa: "آبی", en: "Sky" } },
  { hex: "#0d9488", name: { fa: "فیروزه‌ای", en: "Teal" } },
  { hex: "#16a34a", name: { fa: "سبز", en: "Green" } },
  { hex: "#ca8a04", name: { fa: "طلایی", en: "Gold" } },
  { hex: "#ea580c", name: { fa: "نارنجی", en: "Orange" } },
  { hex: "#be123c", name: { fa: "زرشکی", en: "Crimson" } },
  { hex: "#e11d48", name: { fa: "سرخابی", en: "Rose" } },
  { hex: "#a16207", name: { fa: "قهوه‌ای", en: "Cocoa" } },
  { hex: "#64748b", name: { fa: "خاکستری", en: "Slate" } },
  { hex: "#f5f5f4", name: { fa: "شیری", en: "Ivory" } },
];

/** `#abc` / `#aabbcc` → normalised `#aabbcc`; anything else → the fallback. */
export function sanitizeHex(value: unknown, fallback = "#0f172a"): string {
  if (typeof value !== "string") return fallback;
  const hex = value.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(hex)) return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;
  return fallback;
}

/** Readable text colour for a swatch background. */
export function contrastingInk(hex: string): string {
  const clean = sanitizeHex(hex).slice(1);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
}

export function colourwayName(colourway: Colourway, locale: "fa" | "en"): string {
  return colourway.name[locale] || colourway.name.fa || colourway.name.en || colourway.id;
}

/** Format of a legacy master, inferred from its filename and MIME. */
function masterFormatId(asset: Asset): ExportFormatId {
  const detected = detectFormat(asset.master.filename, asset.master.mime);
  if (detected && isDeliverableFormatId(detected.id)) return detected.id;
  return "png";
}

function legacyFile(asset: Asset): ColourwayFile {
  return {
    id: `${asset.id}-legacy`,
    formatId: masterFormatId(asset),
    key: asset.master.key,
    provider: asset.master.provider,
    filename: asset.master.filename,
    mime: asset.master.mime,
    sizeBytes: asset.master.sizeBytes,
    sha256: asset.master.sha256,
    width: asset.master.width,
    height: asset.master.height,
    uploadedAt: asset.master.uploadedAt,
  };
}

/**
 * Colourways of an asset, always at least one. Legacy assets get a synthetic
 * «رنگ اصلی / Original» entry so callers never need a null check.
 */
export function assetColourways(asset: Asset): Colourway[] {
  if (asset.colourways?.length) {
    return [...asset.colourways].sort((a, b) => a.order - b.order);
  }
  return [
    {
      id: DEFAULT_COLOURWAY_ID,
      name: { fa: "رنگ اصلی", en: "Original" },
      hex: "#0f172a",
      files: [legacyFile(asset)],
      previewKey: asset.previewKey ?? null,
      order: 0,
      createdAt: asset.createdAt,
    },
  ];
}

export function colourwayById(asset: Asset, id: string | null | undefined): Colourway | null {
  if (!id) return null;
  return assetColourways(asset).find((colourway) => colourway.id === id) ?? null;
}

/** Files of one colourway, newest last, with `formatId` guaranteed to be valid. */
export function colourwayFiles(colourway: Colourway): ColourwayFile[] {
  return colourway.files.filter((file) => Boolean(formatById(file.formatId)));
}

/** A single file of a work, addressed the way the buyer's vault addresses it. */
export interface DeliverableRef {
  colourwayId: string;
  colourwayName: Localized;
  hex: string;
  formatId: ExportFormatId;
  file: ColourwayFile;
}

/** Every sellable file of a work (cover images are not part of the delivery). */
export function assetDeliverables(asset: Asset): DeliverableRef[] {
  const out: DeliverableRef[] = [];
  for (const colourway of assetColourways(asset)) {
    for (const file of colourwayFiles(colourway)) {
      if (!isDeliverableFormatId(file.formatId)) continue;
      out.push({
        colourwayId: colourway.id,
        colourwayName: colourway.name,
        hex: colourway.hex,
        formatId: file.formatId,
        file,
      });
    }
  }
  return out;
}

export function assetDeliverableFor(asset: Asset, colourwayId: string, formatId: string): DeliverableRef | null {
  return (
    assetDeliverables(asset).find((item) => item.colourwayId === colourwayId && item.formatId === formatId) ?? null
  );
}

/** Formats present in a work, in the canonical PNG→EPS order, de-duplicated. */
export function assetFormatIds(asset: Asset): DeliverableFormatId[] {
  const present = new Set(assetDeliverables(asset).map((item) => item.formatId));
  return EXPORT_FORMATS.filter((format) => present.has(format.id as DeliverableFormatId)).map(
    (format) => format.id as DeliverableFormatId,
  );
}

/**
 * Object keys a license may hand out for this work: every colourway file, the
 * legacy master, and the public previews. The download endpoint accepts a token
 * only for one of these.
 */
export function assetDownloadableKeys(asset: Asset): Set<string> {
  const keys = new Set<string>([asset.master.key]);
  for (const colourway of assetColourways(asset)) {
    if (colourway.previewKey) keys.add(colourway.previewKey);
    for (const file of colourway.files) keys.add(file.key);
  }
  if (asset.previewKey) keys.add(asset.previewKey);
  if (asset.tileKey) keys.add(asset.tileKey);
  for (const file of [...asset.derivatives, ...asset.mockups]) keys.add(file.key);
  return keys;
}

/** Derived (publicly servable) keys of a work, for the media route. */
export function assetDerivedKeys(asset: Asset): Set<string> {
  const keys = new Set<string>();
  if (asset.previewKey) keys.add(asset.previewKey);
  if (asset.tileKey) keys.add(asset.tileKey);
  for (const file of [...asset.derivatives, ...asset.mockups]) keys.add(file.key);
  for (const colourway of assetColourways(asset)) {
    if (colourway.previewKey) keys.add(colourway.previewKey);
    const cover = colourway.files.find((file) => file.cover);
    if (cover) keys.add(cover.key);
  }
  return keys;
}

/** Does this work carry at least one raster delivery file (so previews exist)? */
export function hasRasterDelivery(asset: Asset): boolean {
  return assetDeliverables(asset).some((item) => {
    const format = formatById(item.formatId);
    return format?.raster === true && item.formatId !== "preview";
  });
}

/** Total bytes the buyer receives — shown next to the license. */
export function deliveryBytes(asset: Asset): number {
  return assetDeliverables(asset).reduce((total, item) => total + item.file.sizeBytes, 0);
}
