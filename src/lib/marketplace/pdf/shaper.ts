import "server-only";
import { promises as fs } from "fs";
import path from "path";
import fontkit from "@pdf-lib/fontkit";

/**
 * Glyph-level Persian text shaping for PDF output.
 *
 * PDF renderers have no text engine: whatever glyphs the content stream names
 * are drawn left-to-right in the order given. `pdf-lib` runs fontkit's
 * `layout()` when it encodes a string, so *shaping* (letter joining, ligatures)
 * happens correctly — but `layout()` is direction-agnostic and returns glyphs in
 * **logical** order, which renders Persian backwards.
 *
 * This module therefore does the two jobs `pdf-lib` cannot:
 *
 *   1. bidi analysis  — split the line into directional runs, resolve neutrals,
 *                       decide the base direction (UBA, single paragraph).
 *   2. glyph ordering — shape each run with fontkit, reverse the glyph arrays of
 *                       RTL runs, then emit the runs in visual order.
 *
 * The result is a visual glyph sequence + advances that `drawShapedText()`
 * writes straight into a PDF content stream (Identity-H, 2-byte glyph ids).
 */

type FontkitFont = ReturnType<typeof fontkit.create> & {
  layout: (text: string, features?: string[]) => { glyphs: { id: number; advanceWidth: number; codePoints: number[] }[] };
  unitsPerEm: number;
};

/* ------------------------------------------------------------------ */
/* Font loading                                                        */
/* ------------------------------------------------------------------ */

export const FONT_FILES = {
  regular: "IRANSansWeb.woff2",
  medium: "IRANSansWeb_Medium.woff2",
  semibold: "IRANSansWeb_SemiBold.woff2",
  bold: "IRANSansWeb_Bold.woff2",
} as const;

export type FontWeight = keyof typeof FONT_FILES;

const fontDir = () => path.join(process.cwd(), "public", "fonts", "iransanse-web");

const bufferCache = new Map<FontWeight, Buffer>();
const parsedCache = new Map<FontWeight, FontkitFont>();

export async function loadFontBuffer(weight: FontWeight = "regular"): Promise<Buffer> {
  const cached = bufferCache.get(weight);
  if (cached) return cached;
  const buffer = await fs.readFile(path.join(fontDir(), FONT_FILES[weight]));
  bufferCache.set(weight, buffer);
  return buffer;
}

/** Parsed fontkit font — used for shaping and for advance-width measurement. */
export async function loadShapingFont(weight: FontWeight = "regular"): Promise<FontkitFont> {
  const cached = parsedCache.get(weight);
  if (cached) return cached;
  const font = fontkit.create(await loadFontBuffer(weight)) as FontkitFont;
  parsedCache.set(weight, font);
  return font;
}

/* ------------------------------------------------------------------ */
/* BiDi                                                                */
/* ------------------------------------------------------------------ */

export type Direction = "rtl" | "ltr" | "neutral";

/** Strong-direction classification (subset of the Unicode Bidi classes). */
export function charDirection(cp: number): Direction {
  if (
    (cp >= 0x0590 && cp <= 0x05ff) || // Hebrew
    (cp >= 0x0600 && cp <= 0x06ff) || // Arabic
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  ) {
    // Arabic-Indic and Extended Arabic-Indic digits are weak but written LTR.
    if ((cp >= 0x0660 && cp <= 0x0669) || (cp >= 0x06f0 && cp <= 0x06f9)) return "ltr";
    return "rtl";
  }
  if (cp >= 0x30 && cp <= 0x39) return "ltr"; // ASCII digits
  if (cp >= 0x41 && cp <= 0x5a) return "ltr";
  if (cp >= 0x61 && cp <= 0x7a) return "ltr";
  return "neutral";
}

export interface DirectionalRun {
  text: string;
  direction: Direction;
}

/**
 * Splits a line into directional runs and resolves neutral runs to the
 * surrounding direction (falling back to the paragraph direction), which is the
 * behaviour the Unified Bidi Algorithm defines for N1/N2.
 */
export function bidiRuns(input: string, baseDirection: "rtl" | "ltr" = "rtl"): DirectionalRun[] {
  const chars = Array.from(input);
  const dirs = chars.map((c) => charDirection(c.codePointAt(0) ?? 0));
  const paragraph: Direction = baseDirection;

  /** Thousands separators, decimal points, dates and percent signs (UBA CS/ES/ET). */
  const NUMERIC_NEIGHBOURS = new Set([",", ".", ":", "/", "-", "+", "%", "٪", "٬", "٫", "،"]);

  const resolved: Direction[] = dirs.map((d) => d);
  for (let i = 0; i < resolved.length; i += 1) {
    if (resolved[i] !== "neutral") continue;
    let prev: Direction | null = null;
    for (let j = i - 1; j >= 0; j -= 1) {
      if (resolved[j] !== "neutral") {
        prev = resolved[j];
        break;
      }
    }
    let next: Direction | null = null;
    for (let j = i + 1; j < resolved.length; j += 1) {
      if (resolved[j] !== "neutral") {
        next = resolved[j];
        break;
      }
    }
    // A separator between two numbers belongs to the number, not to the paragraph:
    // otherwise "۱,۰۸۰,۰۰۰" would be torn into three reversed runs.
    if (NUMERIC_NEIGHBOURS.has(chars[i]) && prev === "ltr" && next === "ltr") {
      resolved[i] = "ltr";
      continue;
    }
    resolved[i] = prev && next && prev === next ? prev : paragraph;
  }

  const runs: DirectionalRun[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    const last = runs[runs.length - 1];
    if (last && last.direction === resolved[i]) last.text += chars[i];
    else runs.push({ direction: resolved[i], text: chars[i] });
  }
  return runs;
}

export function detectBaseDirection(input: string): "rtl" | "ltr" {
  for (const char of Array.from(input)) {
    const dir = charDirection(char.codePointAt(0) ?? 0);
    if (dir === "rtl") return "rtl";
    if (dir === "ltr") return "ltr";
  }
  return "rtl";
}

/* ------------------------------------------------------------------ */
/* Shaping                                                             */
/* ------------------------------------------------------------------ */

export interface ShapedGlyph {
  id: number;
  advance: number;
  /** Logical text this glyph came from — used to build the ToUnicode map. */
  codePoints: number[];
}

export interface ShapedText {
  glyphs: ShapedGlyph[];
  /** Sum of advances in font units (divide by unitsPerEm for em). */
  advanceUnits: number;
  unitsPerEm: number;
  /** Direction the caller should treat as primary for alignment purposes. */
  baseDirection: "rtl" | "ltr";
}

/**
 * Shapes a line into a *visual* glyph sequence.
 *
 * @param baseDirection "auto" derives the paragraph direction from the content.
 */
export function shapeLine(
  font: FontkitFont,
  input: string,
  baseDirection: "auto" | "rtl" | "ltr" = "auto",
): ShapedText {
  const base = baseDirection === "auto" ? detectBaseDirection(input) : baseDirection;
  const runs = bidiRuns(input, base);

  const shapedRuns = runs.map((run) => {
    const layout = font.layout(run.text);
    const glyphs: ShapedGlyph[] = layout.glyphs.map((g) => ({
      id: g.id,
      advance: g.advanceWidth,
      codePoints: g.codePoints ?? [],
    }));
    return { direction: run.direction, glyphs: orderRun(run.text, glyphs, run.direction === "rtl" ? "rtl" : "ltr") };
  });

  // Runs are emitted left-to-right for drawing. In an RTL paragraph the
  // logically-first run sits on the right, so the run sequence is reversed.
  const ordered = base === "rtl" ? shapedRuns.slice().reverse() : shapedRuns;
  const glyphs = ordered.flatMap((run) => run.glyphs);

  return {
    glyphs,
    advanceUnits: glyphs.reduce((sum, g) => sum + g.advance, 0),
    unitsPerEm: font.unitsPerEm,
    baseDirection: base,
  };
}

/**
 * Normalises a shaped run into *visual* (drawing) order.
 *
 * fontkit applies the joining and ligature substitution for us, but its glyph
 * order depends on the script:
 *
 *   • RTL runs (Arabic/Persian letters) come back already in **visual** order —
 *     the rightmost glyph first — which is exactly the order a PDF content
 *     stream wants. Reordering them again is what used to mirror the text.
 *   • Numeric runs are returned **reversed** (fontkit treats Arabic-Indic digits
 *     as RTL and flips them, so «۲,۷۰۰,۰۰۰» came out as «۰۰۰,۰۰۷,۲»). They carry
 *     no ligatures, so the flip can be detected by comparing the glyphs' source
 *     code points against the run text and undone here.
 *
 * The comparison is only trusted for runs without Arabic letters: those are the
 * only ones where fontkit's reported `codePoints` are guaranteed to map back
 * one-to-one (contextual forms can report a neighbouring code point).
 */
function orderRun(text: string, glyphs: ShapedGlyph[], direction: "rtl" | "ltr"): ShapedGlyph[] {
  if (direction === "rtl" || glyphs.length < 2) return glyphs;

  const logical = Array.from(text).map((char) => char.codePointAt(0) ?? 0);
  const flattened = glyphs.flatMap((glyph) => glyph.codePoints);
  if (flattened.length !== logical.length) return glyphs;

  const identical = flattened.every((codePoint, index) => codePoint === logical[index]);
  if (identical) return glyphs;

  const reversed = logical.slice().reverse();
  const isReversed = flattened.every((codePoint, index) => codePoint === reversed[index]);
  return isReversed ? glyphs.slice().reverse() : glyphs;
}

/** Shaped width of a string at a given point size. */
export async function measureShaped(text: string, size: number, weight: FontWeight = "regular"): Promise<number> {
  const font = await loadShapingFont(weight);
  const shaped = shapeLine(font, text);
  return (shaped.advanceUnits / shaped.unitsPerEm) * size;
}

/* ------------------------------------------------------------------ */
/* Encoding for the PDF content stream                                 */
/* ------------------------------------------------------------------ */

/** Identity-H: every glyph is written as its 16-bit glyph id. */
export function glyphsToHex(glyphs: ShapedGlyph[]): string {
  return glyphs.map((g) => g.id.toString(16).padStart(4, "0")).join("");
}

/**
 * Splits a shaped line so it fits `maxWidth` points, breaking on spaces when
 * possible. Returns the remaining text so callers can continue on the next line.
 */
export function wrapShaped(
  font: FontkitFont,
  text: string,
  size: number,
  maxWidth: number,
): { lines: string[] } {
  const scale = size / font.unitsPerEm;
  const words = text.split(/(\s+)/); // keep the separators
  const lines: string[] = [];
  let current = "";

  const widthOf = (value: string) => shapeLine(font, value).advanceUnits * scale;

  for (const word of words) {
    const candidate = current + word;
    if (widthOf(candidate.trimEnd()) <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current.trimEnd());
    current = word.trimStart();
  }
  if (current.trim()) lines.push(current.trimEnd());
  return { lines };
}
