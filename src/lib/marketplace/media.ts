import "server-only";
import { derivedKey, putBuffer } from "./storage";
import type { DerivedFile, SeamlessReport } from "./types";

/**
 * Deterministic, server-side image pipeline for the marketplace:
 *
 *   • watermarked public previews (the clean master is never web-reachable)
 *   • automatic seam analysis → "is this pattern really seamless?" report
 *   • a wrap-around 2×2 tile preview that makes a bad seam obvious
 *   • five auto-generated product mockups per approved asset
 *
 * Everything runs on sharp/libvips (loaded lazily so the rest of the site still
 * boots if the native binary is unavailable); overlay scenes are composed as SVG
 * first, which keeps rendering deterministic and vector-sharp.
 */

/** sharp's callable factory — the module's default export. */
type Sharp = typeof import("sharp")["default"];

let sharpModule: Promise<Sharp | null> | null = null;

/**
 * Lazily loads sharp. Returns null when the binary is unavailable so callers can
 * degrade gracefully instead of crashing a route.
 */
export async function loadSharp(): Promise<Sharp | null> {
  if (!sharpModule) {
    sharpModule = import("sharp")
      .then((mod) => ((mod as { default?: Sharp }).default ?? (mod as unknown as Sharp)))
      .catch(() => null);
  }
  return sharpModule;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function svgEscape(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const toDataUri = (buffer: Buffer, mime = "image/png") => `data:${mime};base64,${buffer.toString("base64")}`;

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic PRNG → the same asset always renders the same mockups. */
function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

/** Standard watermark copy — one place so previews never drift apart. */
export const WATERMARK_LINES = ["Rosie Atelier", "PREVIEW", "رزی آتلیه"];

/** Short, readable tag burned into each preview so leaks are traceable. */
export function cornerTagFor(assetId: string): string {
  return assetId.slice(0, 12).toUpperCase();
}

export const PREVIEW_MAX = 1600;
export const THUMB_MAX = 640;
export const MOCKUP_SIZE = 1200;

/* ------------------------------------------------------------------ */
/* Watermark                                                           */
/* ------------------------------------------------------------------ */

export interface WatermarkOptions {
  /** Lines repeated across the image (brand, artist, "PREVIEW", buyer email…). */
  lines: string[];
  opacity?: number;
  /** Relative to the image width. */
  fontSizeRatio?: number;
  color?: string;
  /** Small corner tag (asset id / order reference). */
  cornerTag?: string;
}

/**
 * Builds a tiled, rotated watermark overlay exactly the size of the target
 * image. Repeating the mark makes it impractical to crop out.
 */
export function watermarkSvg(width: number, height: number, options: WatermarkOptions): string {
  const { lines, opacity = 0.16, fontSizeRatio = 0.045, color = "#0f172a", cornerTag } = options;
  const fontSize = Math.max(14, Math.round(width * fontSizeRatio));
  const lineHeight = Math.round(fontSize * 1.6);
  const text = lines.filter(Boolean).join("   ·   ");
  const stepX = Math.round(Math.max(width * 0.55, text.length * fontSize * 0.4));
  const stepY = Math.round(lineHeight * 4);

  const marks: string[] = [];
  for (let y = -stepY; y < height + stepY; y += stepY) {
    for (let x = -stepX; x < width + stepX; x += stepX) {
      marks.push(
        `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${fontSize}" ` +
          `fill="${color}" fill-opacity="${opacity}" letter-spacing="${(fontSize * 0.08).toFixed(2)}">${svgEscape(text)}</text>`,
      );
    }
  }

  const corner = cornerTag
    ? `<g><rect x="${width - Math.round(width * 0.34)}" y="${height - 58}" rx="10" width="${Math.round(width * 0.34) - 16}" height="42" fill="#0f172a" fill-opacity="0.55"/>` +
      `<text x="${width - Math.round(width * 0.34) + 12}" y="${height - 30}" font-family="Helvetica, Arial, sans-serif" ` +
      `font-size="20" fill="#ffffff" fill-opacity="0.92">${svgEscape(cornerTag)}</text></g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <g transform="rotate(-28 ${width / 2} ${height / 2})">${marks.join("")}</g>
  ${corner}
</svg>`;
}

/** Watermarks a raster image and returns the encoded buffer. */
export async function renderWatermarked(
  source: Buffer,
  options: WatermarkOptions & { maxWidth?: number; format?: "jpeg" | "png" },
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp_unavailable");

  const maxWidth = options.maxWidth ?? PREVIEW_MAX;
  const resized = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });

  const width = resized.info.width;
  const height = resized.info.height;
  const overlay = Buffer.from(watermarkSvg(width, height, options));

  const composed = sharp(resized.data)
    .flatten({ background: "#ffffff" })
    .composite([{ input: overlay, top: 0, left: 0 }]);

  const format = options.format ?? "jpeg";
  const buffer =
    format === "png"
      ? await composed.png({ compressionLevel: 9 }).toBuffer()
      : await composed.jpeg({ quality: 86, mozjpeg: true }).toBuffer();

  return { buffer, width, height };
}

/** Small thumbnail (also watermarked — thumbnails are public too). */
export async function renderThumb(source: Buffer, options: WatermarkOptions): Promise<Buffer> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp_unavailable");

  const base = await sharp(source, { failOn: "none" })
    .rotate()
    .resize(THUMB_MAX, THUMB_MAX, { fit: "cover", position: "centre" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const overlay = Buffer.from(
    watermarkSvg(base.info.width, base.info.height, { ...options, fontSizeRatio: 0.055, opacity: 0.18 }),
  );
  return sharp(base.data).composite([{ input: overlay }]).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}

/* ------------------------------------------------------------------ */
/* Seamless analysis                                                   */
/* ------------------------------------------------------------------ */

interface RawImage {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

async function toRaw(source: Buffer, maxWidth = 720): Promise<RawImage> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp_unavailable");
  const { data, info } = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function columnDelta(raw: RawImage, a: number, b: number): number {
  const { data, width, height, channels } = raw;
  let sum = 0;
  for (let y = 0; y < height; y += 1) {
    const ia = (y * width + a) * channels;
    const ib = (y * width + b) * channels;
    for (let c = 0; c < channels; c += 1) sum += Math.abs(data[ia + c] - data[ib + c]);
  }
  return sum / (height * channels);
}

function rowDelta(raw: RawImage, a: number, b: number): number {
  const { data, width, channels } = raw;
  let sum = 0;
  for (let x = 0; x < width; x += 1) {
    const ia = (a * width + x) * channels;
    const ib = (b * width + x) * channels;
    for (let c = 0; c < channels; c += 1) sum += Math.abs(data[ia + c] - data[ib + c]);
  }
  return sum / (width * channels);
}

/**
 * Edge-continuity analysis.
 *
 * A tile is seamless when the pixels either side of the wrap seam differ no more
 * than ordinary neighbouring pixels *inside* the image, so the seam delta is
 * compared against an interior baseline rather than an absolute threshold —
 * which keeps the verdict meaningful for both flat vector repeats and busy
 * watercolour textures.
 */
export async function analyzeSeamless(source: Buffer): Promise<SeamlessReport> {
  const raw = await toRaw(source);
  const { width, height } = raw;

  const horizontalSeam = columnDelta(raw, width - 1, 0);
  const verticalSeam = rowDelta(raw, height - 1, 0);

  const samples = 12;
  let baselineSum = 0;
  for (let i = 1; i <= samples; i += 1) {
    const col = Math.max(1, Math.round((width * i) / (samples + 1)));
    baselineSum += columnDelta(raw, col - 1, col);
    const row = Math.max(1, Math.round((height * i) / (samples + 1)));
    baselineSum += rowDelta(raw, row - 1, row);
  }
  const baseline = baselineSum / (samples * 2);

  const edgeDelta = Math.max(horizontalSeam, verticalSeam);
  // 40/255 reads as a clearly visible seam to the human eye.
  const penalty = Math.max(0, edgeDelta - baseline) / 40;
  const score = Math.max(0, Math.min(1, 1 - penalty));
  const verdict: SeamlessReport["verdict"] = score >= 0.9 ? "seamless" : score >= 0.72 ? "near-seamless" : "not-seamless";

  return {
    score: Math.round(score * 1000) / 1000,
    verdict,
    edgeDelta: Math.round(edgeDelta * 100) / 100,
    baselineDelta: Math.round(baseline * 100) / 100,
    width,
    height,
    tileable: verdict !== "not-seamless",
    checkedAt: new Date().toISOString(),
    engine: "sharp",
  };
}

/** Cheap sanity check used by the uploader before the file is even stored. */
export function classifyScore(score: number): SeamlessReport["verdict"] {
  return score >= 0.9 ? "seamless" : score >= 0.72 ? "near-seamless" : "not-seamless";
}

/* ------------------------------------------------------------------ */
/* Wrap-around tile preview                                            */
/* ------------------------------------------------------------------ */

/** Renders the tile 2×2 so the wrap seam is visible exactly as it repeats. */
export async function renderTiledPreview(source: Buffer, size = MOCKUP_SIZE, markSeams = true): Promise<Buffer> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp_unavailable");

  const half = Math.round(size / 2);
  const tile = await sharp(source, { failOn: "none" })
    .rotate()
    .resize(half, half, { fit: "fill" })
    .png()
    .toBuffer();

  const seam = markSeams
    ? Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
          <line x1="${half}" y1="0" x2="${half}" y2="${size}" stroke="#b5713a" stroke-width="2" stroke-dasharray="8 6" stroke-opacity="0.7"/>
          <line x1="0" y1="${half}" x2="${size}" y2="${half}" stroke="#b5713a" stroke-width="2" stroke-dasharray="8 6" stroke-opacity="0.7"/>
        </svg>`,
      )
    : null;

  return sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } })
    .composite([
      { input: tile, top: 0, left: 0 },
      { input: tile, top: 0, left: half },
      { input: tile, top: half, left: 0 },
      { input: tile, top: half, left: half },
      ...(seam ? [{ input: seam, top: 0, left: 0 }] : []),
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

/* ------------------------------------------------------------------ */
/* Mockup generator                                                    */
/* ------------------------------------------------------------------ */

export type MockupVariant = "grid" | "framed" | "fabric" | "cushion" | "repeat";

export const MOCKUP_VARIANTS: MockupVariant[] = ["grid", "framed", "fabric", "cushion", "repeat"];

export const MOCKUP_LABELS: Record<MockupVariant, { fa: string; en: string }> = {
  grid: { fa: "چیدمان چهارخانه", en: "Flat four-up" },
  framed: { fa: "تابلوی دیواری", en: "Framed on wall" },
  fabric: { fa: "پارچه با چین", en: "Draped fabric" },
  cushion: { fa: "کوسن / منسوجات", en: "Home textile" },
  repeat: { fa: "تکرار نامحدود", en: "Infinite repeat" },
};

/**
 * Generates one mockup as a JPEG buffer. Templates are procedural SVG scenes
 * (no stock photos required): the pattern is embedded as a `<pattern>` fill and
 * then lit with gradients and shadows so the result reads as a product shot.
 */
export async function renderMockup(source: Buffer, variant: MockupVariant, seed = 1): Promise<Buffer> {
  const sharp = await loadSharp();
  if (!sharp) throw new Error("sharp_unavailable");

  const size = MOCKUP_SIZE;
  const tile = await sharp(source, { failOn: "none" })
    .rotate()
    .resize(600, 600, { fit: "cover" })
    .png()
    .toBuffer();
  const uri = toDataUri(tile);
  const rand = seededRandom(seed * 7919 + hashString(variant));

  let svg: string;

  switch (variant) {
    case "grid": {
      const gap = 28;
      const cell = (size - gap * 3) / 2;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs><pattern id="p" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
          <image href="${uri}" width="${cell}" height="${cell}" preserveAspectRatio="xMidYMid slice"/>
        </pattern>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="#0f172a" flood-opacity="0.18"/>
        </filter></defs>
        <rect width="${size}" height="${size}" fill="#f3f4f6"/>
        ${[0, 1]
          .map((row) =>
            [0, 1]
              .map((col) => {
                const x = gap + col * (cell + gap);
                const y = gap + row * (cell + gap);
                return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="url(#p)" filter="url(#shadow)" rx="6"/>`;
              })
              .join(""),
          )
          .join("")}
      </svg>`;
      break;
    }
    case "framed": {
      const frameW = 660;
      const frameH = 640;
      const inner = 500;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs>
          <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#eef1f6"/><stop offset="100%" stop-color="#dfe4ec"/>
          </linearGradient>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.22"/>
          </filter>
          <clipPath id="artClip"><rect x="${(size - inner) / 2}" y="${(size - inner) / 2}" width="${inner}" height="${inner}" rx="2"/></clipPath>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#wall)"/>
        <rect x="${(size - frameW) / 2}" y="${(size - frameH) / 2}" width="${frameW}" height="${frameH}" rx="6" fill="#8b6f4e" filter="url(#soft)"/>
        <rect x="${(size - inner - 44) / 2}" y="${(size - inner - 44) / 2}" width="${inner + 44}" height="${inner + 44}" fill="#ffffff"/>
        <image href="${uri}" x="${(size - inner) / 2}" y="${(size - inner) / 2}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid slice" clip-path="url(#artClip)"/>
        <rect x="${(size - inner) / 2}" y="${(size - inner) / 2}" width="${inner}" height="${inner}" fill="none" stroke="#0f172a" stroke-opacity="0.08"/>
        <rect x="0" y="${size - 90}" width="${size}" height="90" fill="#0f172a" fill-opacity="0.05"/>
      </svg>`;
      break;
    }
    case "fabric": {
      const folds = Array.from({ length: 6 }, (_, i) => {
        const x = (size / 6) * i + rand() * 30;
        const width = 40 + rand() * 70;
        return `<rect x="${x.toFixed(1)}" y="0" width="${width.toFixed(1)}" height="${size}" fill="url(#fold)" opacity="${(0.12 + rand() * 0.2).toFixed(2)}"/>`;
      }).join("");
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs>
          <pattern id="p" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
            <image href="${uri}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>
          </pattern>
          <linearGradient id="fold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75"/>
            <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0.55"/>
          </linearGradient>
          <radialGradient id="vignette" cx="50%" cy="45%" r="72%">
            <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.32"/>
          </radialGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#p)"/>
        ${folds}
        <rect width="${size}" height="${size}" fill="url(#vignette)"/>
      </svg>`;
      break;
    }
    case "cushion": {
      const cushionW = 700;
      const cushionH = 520;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f7f7f5"/><stop offset="100%" stop-color="#e7e5e0"/>
          </linearGradient>
          <filter id="soft" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.25"/>
          </filter>
          <clipPath id="cushionClip">
            <rect x="${(size - cushionW) / 2}" y="${(size - cushionH) / 2}" width="${cushionW}" height="${cushionH}" rx="34"/>
          </clipPath>
          <linearGradient id="shade" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
            <stop offset="60%" stop-color="#000000" stop-opacity="0.06"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0.24"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" fill="url(#bg)"/>
        <g filter="url(#soft)">
          <rect x="${(size - cushionW) / 2}" y="${(size - cushionH) / 2}" width="${cushionW}" height="${cushionH}" rx="34" fill="#ffffff"/>
          <image href="${uri}" x="${(size - cushionW) / 2}" y="${(size - cushionH) / 2}" width="${cushionW}" height="${cushionH}" preserveAspectRatio="xMidYMid slice" clip-path="url(#cushionClip)"/>
          <rect x="${(size - cushionW) / 2}" y="${(size - cushionH) / 2}" width="${cushionW}" height="${cushionH}" rx="34" fill="url(#shade)" clip-path="url(#cushionClip)"/>
        </g>
      </svg>`;
      break;
    }
    default: {
      // "repeat" — a 3×3 field with a slow zoom, proving the tile repeats cleanly.
      const cell = size / 3;
      const scale = 1 + rand() * 0.06;
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <defs><pattern id="p" width="${cell * scale}" height="${cell * scale}" patternUnits="userSpaceOnUse">
          <image href="${uri}" width="${cell * scale}" height="${cell * scale}" preserveAspectRatio="xMidYMid slice"/>
        </pattern>
        <radialGradient id="v" cx="50%" cy="50%" r="70%">
          <stop offset="55%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.22"/>
        </radialGradient></defs>
        <rect width="${size}" height="${size}" fill="url(#p)"/>
        <rect width="${size}" height="${size}" fill="url(#v)"/>
      </svg>`;
      break;
    }
  }

  return sharp(Buffer.from(svg)).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

/* ------------------------------------------------------------------ */
/* Derivative orchestration                                            */
/* ------------------------------------------------------------------ */

export interface DerivationResult {
  derivatives: DerivedFile[];
  mockups: DerivedFile[];
  previewKey: string;
  tileKey: string;
  seamless: SeamlessReport;
}

/**
 * Builds the full public derivative set for an asset and stores it in the
 * private bucket (served through the access-controlled media route, never
 * straight out of `public/`).
 */
export async function buildDerivatives(input: {
  assetId: string;
  master: Buffer;
  watermarkLines: string[];
  cornerTag?: string;
  mockupVariants?: MockupVariant[];
}): Promise<DerivationResult> {
  const { assetId, master, watermarkLines, cornerTag } = input;
  const stamp = Date.now().toString(36);
  const now = new Date().toISOString();
  const out: DerivedFile[] = [];

  const preview = await renderWatermarked(master, { lines: watermarkLines, cornerTag, maxWidth: PREVIEW_MAX });
  const previewName = `preview-${stamp}.jpg`;
  await putBuffer(derivedKey(assetId, previewName), preview.buffer, "image/jpeg");
  out.push({
    key: derivedKey(assetId, previewName),
    width: preview.width,
    height: preview.height,
    bytes: preview.buffer.byteLength,
    kind: "watermarked",
    createdAt: now,
  });
  out.push({
    key: derivedKey(assetId, previewName),
    width: preview.width,
    height: preview.height,
    bytes: preview.buffer.byteLength,
    kind: "preview",
    createdAt: now,
  });

  const thumb = await renderThumb(master, { lines: watermarkLines.slice(0, 2), opacity: 0.2 });
  const thumbName = `thumb-${stamp}.jpg`;
  await putBuffer(derivedKey(assetId, thumbName), thumb, "image/jpeg");
  out.push({
    key: derivedKey(assetId, thumbName),
    width: Math.min(THUMB_MAX, preview.width),
    height: Math.min(THUMB_MAX, preview.height),
    bytes: thumb.byteLength,
    kind: "thumb",
    createdAt: now,
  });

  const seamless = await analyzeSeamless(master);

  const tiled = await renderTiledPreview(master, MOCKUP_SIZE, true);
  const tileName = `tile-${stamp}.jpg`;
  await putBuffer(derivedKey(assetId, tileName), tiled, "image/jpeg");
  out.push({
    key: derivedKey(assetId, tileName),
    width: MOCKUP_SIZE,
    height: MOCKUP_SIZE,
    bytes: tiled.byteLength,
    kind: "tiled",
    createdAt: now,
  });

  const variants = input.mockupVariants ?? MOCKUP_VARIANTS;
  const mockups: DerivedFile[] = [];
  for (const variant of variants) {
    const buffer = await renderMockup(master, variant, hashString(assetId));
    const name = `mockup-${variant}-${stamp}.jpg`;
    await putBuffer(derivedKey(assetId, name), buffer, "image/jpeg");
    mockups.push({
      key: derivedKey(assetId, name),
      width: MOCKUP_SIZE,
      height: MOCKUP_SIZE,
      bytes: buffer.byteLength,
      kind: "mockup",
      variant,
      createdAt: now,
    });
  }

  return { derivatives: out, mockups, previewKey: derivedKey(assetId, previewName), tileKey: derivedKey(assetId, tileName), seamless };
}

/**
 * Pixel size of a raster file, or null when it is not one (PSD/PDF/SVG…).
 * Best-effort: the uploader stores the size when sharp can read it.
 */
export async function readImageSize(source: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const sharp = await loadSharp();
    if (!sharp) return null;
    const meta = await sharp(source, { failOn: "none" }).metadata();
    if (!meta.width || !meta.height) return null;
    return { width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

/**
 * Watermarked public preview for one colourway of an asset.
 *
 * The primary preview comes out of `buildDerivatives`; this is the same
 * treatment applied to the extra colour versions an artist uploads, so every
 * swatch in the gallery shows real, protected artwork.
 */
export async function renderColourwayPreview(
  source: Buffer,
  options: { assetId: string; format?: "jpeg" | "png" } = { assetId: "" },
): Promise<{ buffer: Buffer; width: number; height: number }> {
  return renderWatermarked(source, {
    lines: WATERMARK_LINES,
    cornerTag: options.assetId ? cornerTagFor(options.assetId) : undefined,
    maxWidth: PREVIEW_MAX,
    format: options.format ?? "jpeg",
  });
}

/** Buyer-specific watermarked comp (used for pre-payment approval flows). */
export async function renderBuyerComp(master: Buffer, buyerEmail: string, brand: string): Promise<Buffer> {
  const result = await renderWatermarked(master, {
    lines: [buyerEmail, brand, "COMP"],
    opacity: 0.22,
    fontSizeRatio: 0.04,
    cornerTag: buyerEmail,
    maxWidth: PREVIEW_MAX,
  });
  return result.buffer;
}
