import "server-only";
import { PDFOperator, PDFOperatorNames, rgb, type PDFPage } from "pdf-lib";
import { loadShapingFont, shapeLine, wrapShaped, type FontWeight, type ShapedGlyph } from "./shaper";

/**
 * Vector text renderer.
 *
 * `pdf-lib` can only write text with an embedded font, and the IranSans/Vazirmatn
 * web build ships as WOFF2 with a *transformed* `glyf` table — the bytes it hands
 * back for `/FontFile2` are the original `wOF2` payload, which every PDF viewer
 * refuses (invisible text, no error). Re-drawing the glyph outlines as PDF paths
 * sidesteps the whole problem and has a bonus: the output is resolution-free.
 *
 * A Persian string is drawn like this:
 *
 *   shape (fontkit GSUB) → bidi order (./shaper) → glyph outlines (fontkit)
 *   → `m / l / c / h` path operators → `f` (non-zero fill)
 *
 * Latin-only strings can still be drawn as real text (see `drawLatinText`), so
 * serials, e-mails, order numbers and dates stay selectable and searchable.
 */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface TextPathOptions {
  x: number;
  y: number;
  size?: number;
  weight?: FontWeight;
  color?: ReturnType<typeof rgb>;
  align?: "start" | "end" | "center";
  /** Wrap to this width (points). */
  maxWidth?: number;
  lineHeight?: number;
  /** Paragraph direction hint; "auto" inspects the content. */
  direction?: "auto" | "rtl" | "ltr";
  opacity?: number;
}

export interface TextPathResult {
  width: number;
  height: number;
  lines: number;
  /** Bounding box for debugging / layout tests. */
  boxes: { x: number; y: number; width: number; height: number }[];
}

/**
 * pdf-lib serialises operator arguments either as PDF objects or as raw strings.
 * Plain JS numbers would crash its size calculation, so coordinates are emitted
 * as short decimal strings (which is exactly what a content stream contains).
 */
function pdfNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = Math.round(value * 1e4) / 1e4;
  return String(rounded);
}

const numArgs = (...values: number[]) =>
  values.map(pdfNumber) as unknown as Parameters<typeof PDFOperator.of>[1];

type GlyphPath = { id: number; path: { commands: { command: string; args: number[] }[] } };

/**
 * Emits the path operators for one glyph, translated so the glyph origin sits at
 * (penX, baselineY) with `scale` points per font unit.
 */
function pushGlyphPath(
  ops: PDFOperator[],
  glyph: GlyphPath,
  penX: number,
  baselineY: number,
  scale: number,
) {
  const tx = (value: number) => penX + value * scale;
  const ty = (value: number) => baselineY + value * scale;

  let started = false;
  // fontkit path commands are absolute, so the current point is simply the last
  // coordinate we emitted (needed to convert quadratic curves to cubics).
  let current = { x: 0, y: 0 };
  for (const command of glyph.path.commands) {
    const args = command.args;
    switch (command.command) {
      case "moveTo":
        ops.push(PDFOperator.of(PDFOperatorNames.MoveTo, numArgs(tx(args[0]), ty(args[1]))));
        current = { x: args[0], y: args[1] };
        started = true;
        break;
      case "lineTo":
        ops.push(PDFOperator.of(PDFOperatorNames.LineTo, numArgs(tx(args[0]), ty(args[1]))));
        current = { x: args[0], y: args[1] };
        break;
      case "quadraticCurveTo": {
        // Convert the quadratic to a cubic: c1 = p0 + 2/3(c − p0), c2 = p2 + 2/3(c − p2).
        const [cx, cy, x, y] = args;
        const p0 = current;
        const c1x = p0.x + (2 / 3) * (cx - p0.x);
        const c1y = p0.y + (2 / 3) * (cy - p0.y);
        const c2x = x + (2 / 3) * (cx - x);
        const c2y = y + (2 / 3) * (cy - y);
        current = { x, y };
        ops.push(
          PDFOperator.of(PDFOperatorNames.AppendBezierCurve, numArgs(tx(c1x), ty(c1y), tx(c2x), ty(c2y), tx(x), ty(y))),
        );
        break;
      }
      case "bezierCurveTo": {
        const [c1x, c1y, c2x, c2y, x, y] = args;
        current = { x, y };
        ops.push(
          PDFOperator.of(PDFOperatorNames.AppendBezierCurve, numArgs(tx(c1x), ty(c1y), tx(c2x), ty(c2y), tx(x), ty(y))),
        );
        break;
      }
      case "closePath":
        ops.push(PDFOperator.of(PDFOperatorNames.ClosePath, []));
        break;
      default:
        break;
    }
  }
  if (started) ops.push(PDFOperator.of(PDFOperatorNames.FillNonZero, []));
}

/** Draws one already-shaped line. */
function drawLine(
  page: PDFPage,
  font: Awaited<ReturnType<typeof loadShapingFont>>,
  text: string,
  options: Required<Pick<TextPathOptions, "x" | "y" | "size">> & TextPathOptions,
): number {
  const shape = shapeLine(font, text, options.direction ?? "auto");
  const scale = options.size / font.unitsPerEm;
  const width = shape.advanceUnits * scale;

  let penX = options.x;
  if (options.align === "end") penX -= width;
  else if (options.align === "center") penX -= width / 2;

  const ops: PDFOperator[] = [];
  const { r, g, b } = (options.color ?? rgb(0.06, 0.09, 0.15)) as unknown as Rgb;

  for (const glyph of shape.glyphs) {
    if (glyph.id === 0) {
      penX += glyph.advance * scale;
      continue;
    }
    const vector = font.getGlyph(glyph.id) as unknown as GlyphPath;
    if (vector?.path?.commands?.length) {
      pushGlyphPath(ops, vector, penX, options.y, scale);
    }
    penX += glyph.advance * scale;
  }

  if (ops.length) {
    page.pushOperators(PDFOperator.of(PDFOperatorNames.PushGraphicsState, []));
    page.pushOperators(PDFOperator.of(PDFOperatorNames.NonStrokingColorRgb, numArgs(r, g, b)));
    page.pushOperators(...ops);
    page.pushOperators(PDFOperator.of(PDFOperatorNames.PopGraphicsState, []));
  }
  return width;
}

/**
 * Draws a (possibly multi-line) string as vector outlines.
 * Returns the measured width of the widest line and the block height.
 */
export async function drawTextPath(page: PDFPage, text: string, options: TextPathOptions): Promise<TextPathResult> {
  if (!text) return { width: 0, height: 0, lines: 0, boxes: [] };
  const size = options.size ?? 10;
  const weight = options.weight ?? "regular";
  const font = await loadShapingFont(weight);
  const lineHeight = options.lineHeight ?? size * 1.7;

  const lines = options.maxWidth
    ? wrapShaped(font, text, size, options.maxWidth).lines
    : text.split("\n");

  let widest = 0;
  const boxes: TextPathResult["boxes"] = [];
  let y = options.y;
  for (const line of lines) {
    const width = drawLine(page, font, line, { ...options, size, y, maxWidth: undefined } as TextPathOptions & {
      x: number;
      y: number;
      size: number;
    });
    widest = Math.max(widest, width);
    boxes.push({ x: options.x, y: y - size * 0.8, width, height: size * 1.2 });
    y -= lineHeight;
  }

  return { width: widest, height: lines.length * lineHeight, lines: lines.length, boxes };
}

/** Measures without drawing (used by layout code). */
export async function measureTextPath(text: string, size: number, weight: FontWeight = "regular", maxWidth?: number) {
  const font = await loadShapingFont(weight);
  const lines = maxWidth ? wrapShaped(font, text, size, maxWidth).lines : [text];
  const widths = lines.map((line) => (shapeLine(font, line).advanceUnits / font.unitsPerEm) * size);
  return { lines: lines.length, width: Math.max(0, ...widths) };
}

/** True when the string contains any Arabic/Persian character. */
export function hasRtl(text: string): boolean {
  return Array.from(text).some((char) => {
    const cp = char.codePointAt(0) ?? 0;
    return (
      (cp >= 0x0600 && cp <= 0x06ff) ||
      (cp >= 0x0750 && cp <= 0x077f) ||
      (cp >= 0xfb50 && cp <= 0xfdff) ||
      (cp >= 0xfe70 && cp <= 0xfeff)
    );
  });
}

export type { ShapedGlyph };
