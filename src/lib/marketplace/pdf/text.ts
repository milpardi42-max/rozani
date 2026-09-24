import "server-only";

/**
 * Persian/Arabic text preparation for PDF rendering.
 *
 * PDF has no text-shaping engine: a renderer draws exactly the code points it
 * is given, left to right, in the order they appear. Persian therefore needs a
 * three-step transformation *before* the string reaches `pdf-lib`:
 *
 *   1. Arabic shaping      — pick the correct isolated/initial/medial/final form
 *                            (Unicode Arabic Presentation Forms where available).
 *   2. Bidi reordering     — produce visual order from logical order (RTL base
 *                            direction, with embedded LTR runs for serials, URLs,
 *                            e-mails and Latin words).
 *   3. Optional mirroring  — flip brackets in RTL context.
 *
 * The tables below cover Persian, the standard Arabic letters and the Persian
 * digits; anything unmapped is passed through untouched.
 */

/* ------------------------------------------------------------------ */
/* 1. Shaping tables                                                   */
/* ------------------------------------------------------------------ */

/** Joining classes of the letters this module maps. */
const JOINING: Record<number, "D" | "R" | "U"> = {
  0x0621: "U", // ء
  0x0622: "R", // آ
  0x0623: "R", // أ
  0x0624: "R", // ؤ
  0x0625: "R", // إ
  0x0626: "D", // ئ
  0x0627: "R", // ا
  0x0628: "D", // ب
  0x0629: "R", // ة
  0x062a: "D",
  0x062b: "D",
  0x062c: "D",
  0x062d: "D",
  0x062e: "D",
  0x062f: "R",
  0x0630: "R",
  0x0631: "R",
  0x0632: "R",
  0x0633: "D",
  0x0634: "D",
  0x0635: "D",
  0x0636: "D",
  0x0637: "D",
  0x0638: "D",
  0x0639: "D",
  0x063a: "D",
  0x0641: "D",
  0x0642: "D",
  0x0643: "D",
  0x0644: "D",
  0x0645: "D",
  0x0646: "D",
  0x0647: "D",
  0x0648: "R",
  0x0649: "D",
  0x064a: "D",
  0x066e: "D", // ٮ
  0x066f: "D", // ٯ
  0x0671: "R",
  0x067e: "D", // پ
  0x0680: "D", // ڀ
  0x0683: "D",
  0x0684: "D",
  0x0686: "D", // چ
  0x0687: "D",
  0x0688: "R",
  0x0691: "R",
  0x0698: "R", // ژ
  0x06a9: "D", // ک
  0x06aa: "D",
  0x06ad: "D",
  0x06af: "D", // گ
  0x06ba: "R", // ں
  0x06be: "D", // ھ
  0x06c0: "R", // ۀ
  0x06c1: "D", // ہ
  0x06c2: "D",
  0x06c3: "R",
  0x06cc: "D", // ی
  0x06d0: "D",
  0x06d2: "R", // ے
  0x06d3: "R", // ۓ
};

/**
 * Presentation forms. Order: [isolated, final, initial, medial].
 * Missing entries mean "this form does not exist" and fall back to isolated.
 */
const FORMS: Record<number, [number, number?, number?, number?]> = {
  0x0621: [0xfe80],
  0x0622: [0xfe81, 0xfe82],
  0x0623: [0xfe83, 0xfe84],
  0x0624: [0xfe85, 0xfe86],
  0x0625: [0xfe87, 0xfe88],
  0x0626: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  0x0627: [0xfe8d, 0xfe8e],
  0x0628: [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  0x0629: [0xfe93, 0xfe94],
  0x062a: [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  0x062b: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  0x062c: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  0x062d: [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  0x062e: [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  0x062f: [0xfea9, 0xfeaa],
  0x0630: [0xfeab, 0xfeac],
  0x0631: [0xfead, 0xfeae],
  0x0632: [0xfeaf, 0xfeb0],
  0x0633: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  0x0634: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  0x0635: [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  0x0636: [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  0x0637: [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  0x0638: [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  0x0639: [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  0x063a: [0xfecd, 0xfece, 0xfecf, 0xfed0],
  0x0641: [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  0x0642: [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  0x0643: [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  0x0644: [0xfedd, 0xfede, 0xfedf, 0xfee0],
  0x0645: [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  0x0646: [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  0x0647: [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  0x0648: [0xfeed, 0xfeee],
  0x0649: [0xfeef, 0xfef0],
  0x064a: [0xfef1, 0xfef2, 0xfef3, 0xfef4],
  0x0671: [0xfb50, 0xfb51],
  0x0679: [0xfb66, 0xfb67, 0xfb68, 0xfb69],
  0x067a: [0xfb5e, 0xfb5f, 0xfb60, 0xfb61],
  0x067b: [0xfb52, 0xfb53, 0xfb54, 0xfb55],
  0x067e: [0xfb56, 0xfb57, 0xfb58, 0xfb59],
  0x0683: [0xfb76, 0xfb77, 0xfb78, 0xfb79],
  0x0684: [0xfb72, 0xfb73, 0xfb74, 0xfb75],
  0x0686: [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d],
  0x0687: [0xfb7e, 0xfb7f, 0xfb80, 0xfb81],
  0x0688: [0xfb88, 0xfb89],
  0x0691: [0xfb8c, 0xfb8d],
  0x0698: [0xfb8a, 0xfb8b],
  0x06a9: [0xfb8e, 0xfb8f, 0xfb90, 0xfb91],
  0x06ad: [0xfbd3, 0xfbd4, 0xfbd5, 0xfbd6],
  0x06af: [0xfb92, 0xfb93, 0xfb94, 0xfb95],
  0x06ba: [0xfb9e, 0xfb9f],
  0x06be: [0xfbaa, 0xfbab, 0xfbac, 0xfbad],
  0x06c0: [0xfba4, 0xfba5],
  0x06c1: [0xfba6, 0xfba7, 0xfba8, 0xfba9],
  0x06c2: [0xfbae, 0xfbaf],
  0x06c3: [0xfbb0, 0xfbb1],
  0x06cc: [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff],
  0x06d2: [0xfbae, 0xfbaf],
};

/** Harakat and other combining marks are "transparent" for joining purposes. */
function isTransparent(cp: number): boolean {
  return (
    (cp >= 0x064b && cp <= 0x065f) || // Arabic harakat
    cp === 0x0670 || // superscript alef
    (cp >= 0x06d6 && cp <= 0x06ed) || // Quranic / Persian marks
    cp === 0x200c || // ZWNJ (breaks the join, but is invisible)
    cp === 0x200d || // ZWJ (forces the join)
    (cp >= 0xfe00 && cp <= 0xfe0f) // variation selectors
  );
}

export function isArabicChar(cp: number): boolean {
  return (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  );
}

/** Presentation-form characters are already shaped — leave them alone. */
function isPresentationForm(cp: number): boolean {
  return (cp >= 0xfb50 && cp <= 0xfdfc) || (cp >= 0xfe70 && cp <= 0xfefc);
}

/** Lam + alef must become the mandatory ligature. */
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6], // لآ
  0x0623: [0xfef7, 0xfef8], // لأ
  0x0625: [0xfef9, 0xfefa], // لإ
  0x0627: [0xfefb, 0xfefc], // لا
};

/**
 * Converts logical Persian/Arabic text into presentation forms (a "poor man's"
 * shaped string that any PDF viewer renders correctly).
 */
export function shapeArabic(input: string): string {
  const chars = Array.from(input);
  const out: string[] = [];

  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    const cp = char.codePointAt(0) ?? 0;

    if (!isArabicChar(cp) || isPresentationForm(cp)) {
      out.push(char);
      continue;
    }

    const cls = JOINING[cp];
    if (!cls) {
      out.push(char);
      continue;
    }

    // ZWNJ (U+200C) breaks the visual join; ZWJ (U+200D) forces it.
    const scanPrev = (): boolean => {
      for (let j = i - 1; j >= 0; j -= 1) {
        const pcp = chars[j].codePointAt(0) ?? 0;
        if (pcp === 0x200d) return true;
        if (pcp === 0x200c) return false;
        if (isTransparent(pcp)) continue;
        return JOINING[pcp] === "D";
      }
      return false;
    };
    const scanNext = (): boolean => {
      for (let j = i + 1; j < chars.length; j += 1) {
        const ncp = chars[j].codePointAt(0) ?? 0;
        if (ncp === 0x200d) return true;
        if (ncp === 0x200c) return false;
        if (isTransparent(ncp)) continue;
        if (cls !== "D") return false;
        return JOINING[ncp] === "D" || JOINING[ncp] === "R";
      }
      return false;
    };

    const connectsPrev = scanPrev();
    const connectsNext = scanNext();

    // Lam + alef ligature.
    if (cp === 0x0644) {
      let nextIndex = -1;
      for (let j = i + 1; j < chars.length; j += 1) {
        const ncp = chars[j].codePointAt(0) ?? 0;
        if (ncp === 0x200c) break;
        if (isTransparent(ncp) && ncp !== 0x200d) continue;
        nextIndex = j;
        break;
      }
      const nextCp = nextIndex >= 0 ? chars[nextIndex].codePointAt(0) ?? 0 : 0;
      const ligature = LAM_ALEF[nextCp];
      if (ligature && connectsNext) {
        out.push(String.fromCodePoint(ligature[connectsPrev ? 1 : 0]));
        i = nextIndex; // consume the alef
        continue;
      }
    }

    const forms = FORMS[cp];
    if (!forms) {
      out.push(char);
      continue;
    }
    // [isolated, final, initial, medial]
    let formIndex = 0;
    if (connectsPrev && connectsNext && forms[3]) formIndex = 3;
    else if (connectsPrev && forms[1]) formIndex = 1;
    else if (connectsNext && forms[2]) formIndex = 2;
    out.push(String.fromCodePoint(forms[formIndex] ?? forms[0]));
  }

  // Strip join controls — they are invisible and some PDF viewers show them.
  return out.join("").replace(/[\u200c\u200d]/g, (m) => (m === "\u200c" ? "" : ""));
}

/* ------------------------------------------------------------------ */
/* 2. Bidi                                                             */
/* ------------------------------------------------------------------ */

type BidiClass = "R" | "L" | "N" | "EN" | "AN" | "T";

function bidiClass(cp: number): BidiClass {
  if (cp === 0x200c || cp === 0x200d) return "T";
  if (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  ) {
    // Arabic-Indic digits are weak; letters are strong RTL.
    if (cp >= 0x0660 && cp <= 0x0669) return "AN";
    if (cp >= 0x06f0 && cp <= 0x06f9) return "AN";
    return "R";
  }
  if (cp >= 0x30 && cp <= 0x39) return "EN";
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return "L";
  if (cp >= 0x0590 && cp <= 0x05ff) return "R";
  if (cp === 0x20 || cp === 0x09 || cp === 0x0a || cp === 0x0d) return "N";
  if (/\s/.test(String.fromCodePoint(cp))) return "N";
  return "N";
}

const MIRROR: Record<string, string> = {
  "(": ")",
  ")": "(",
  "[": "]",
  "]": "[",
  "{": "}",
  "}": "{",
  "<": ">",
  ">": "<",
  "«": "»",
  "»": "«",
};

/**
 * Reorders a shaped string into visual order.
 *
 * Simplified single-paragraph UBA: numbers and Latin words stay left-to-right
 * as embedded runs, everything else follows the paragraph direction. Sufficient
 * for certificates, invoices and receipts (no explicit embedding codes).
 */
export function bidiReorder(shaped: string, baseDirection: "rtl" | "ltr" = "rtl"): string {
  const chars = Array.from(shaped);
  if (!chars.length) return shaped;

  const classes = chars.map((c) => bidiClass(c.codePointAt(0) ?? 0));

  // Weak: European numbers behave as LTR, Arabic numbers too (they are written
  // left-to-right but positioned inside the RTL flow).
  const resolved: BidiClass[] = classes.map((cls) => {
    if (cls === "EN" || cls === "AN") return "L";
    return cls;
  });

  // Neutrals take the direction of the surrounding strong text, otherwise the
  // paragraph direction.
  const paragraph: BidiClass = baseDirection === "rtl" ? "R" : "L";
  for (let i = 0; i < resolved.length; i += 1) {
    if (resolved[i] !== "N" && resolved[i] !== "T") continue;
    let prev: BidiClass | null = null;
    for (let j = i - 1; j >= 0; j -= 1) {
      if (resolved[j] === "N" || resolved[j] === "T") continue;
      prev = resolved[j];
      break;
    }
    let next: BidiClass | null = null;
    for (let j = i + 1; j < resolved.length; j += 1) {
      if (resolved[j] === "N" || resolved[j] === "T") continue;
      next = resolved[j];
      break;
    }
    if (prev && next && prev === next) resolved[i] = prev;
    else resolved[i] = paragraph;
  }

  // Split into directional runs (contiguous characters of the same class).
  const runs: { dir: BidiClass; text: string }[] = [];
  for (let i = 0; i < chars.length; i += 1) {
    const dir = resolved[i];
    const last = runs[runs.length - 1];
    if (last && last.dir === dir) last.text += chars[i];
    else runs.push({ dir, text: chars[i] });
  }

  /** Renders one run in *visual* character order. */
  const renderRun = (run: { dir: BidiClass; text: string }): string => {
    if (run.dir !== "R") return run.text; // LTR and neutral runs keep their order
    return Array.from(run.text)
      .reverse()
      .map((ch) => MIRROR[ch] ?? ch)
      .join("");
  };

  // An RTL paragraph lays its runs out right-to-left, so the run sequence is
  // emitted in reverse while LTR runs keep their internal order.
  const orderedRuns = baseDirection === "rtl" ? runs.slice().reverse() : runs;
  return orderedRuns.map(renderRun).join("");
}

/* ------------------------------------------------------------------ */
/* 3. Public helper                                                    */
/* ------------------------------------------------------------------ */

export interface PrepareOptions {
  /**
   * "auto" shapes + reorders when Persian/Arabic characters are present.
   * "none" leaves the string untouched (Latin-only content).
   */
  mode?: "auto" | "none";
  direction?: "rtl" | "ltr";
}

/**
 * Prepares a string for PDF drawing.
 *
 * Digits are converted to Persian numerals when the text is Persian, because
 * that is what readers expect on a certificate — pass `persianDigits: false` to
 * keep a serial number as ASCII.
 */
export function prepareText(
  input: string,
  options: PrepareOptions & { persianDigits?: boolean } = {},
): string {
  const { mode = "auto", direction = "rtl", persianDigits } = options;
  if (!input) return "";
  if (mode === "none") return input;

  const hasArabic = Array.from(input).some((c) => isArabicChar(c.codePointAt(0) ?? 0));
  if (!hasArabic) return input;

  const withDigits =
    persianDigits === false
      ? input
      : input.replace(/[0-9]/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
  const shaped = shapeArabic(withDigits);
  return bidiReorder(shaped, direction);
}

/**
 * Builds a *visual* line from a list of logical segments, each with its own
 * direction — handy for `۱۸ مرداد ۱۴۰۴ · RA-LIC-2026-000123` where the serial
 * must stay LTR inside an RTL line.
 */
export function composeBidiLine(
  segments: { text: string; dir?: "rtl" | "ltr"; latin?: boolean }[],
  baseDirection: "rtl" | "ltr" = "rtl",
): string {
  // Compose the logical string with explicit markers, then run the bidi pass on
  // the whole line so spacing behaves naturally.
  const logical = segments
    .map((segment) => {
      const dir = segment.dir ?? (segment.latin ? "ltr" : baseDirection);
      const shaped = dir === "ltr" && segment.latin ? segment.text : prepareText(segment.text, { direction: dir });
      return { shaped, dir };
    })
    .reduce((acc, item, index) => {
      if (index === 0) return item.shaped;
      return `${acc} ${item.shaped}`;
    }, "");

  if (!segments.some((segment) => segment.dir === "ltr" || segment.latin)) return logical;

  // With a mix of directions, reorder segment-by-segment: the RTL base flow is
  // emitted right-to-left, so segments are appended in reverse.
  if (baseDirection === "rtl") {
    return segments
      .slice()
      .reverse()
      .map((segment) => {
        const dir = segment.dir ?? (segment.latin ? "ltr" : "rtl");
        return dir === "ltr" && segment.latin ? segment.text : prepareText(segment.text, { direction: "rtl" });
      })
      .join("  ");
  }
  return segments
    .map((segment) => {
      const dir = segment.dir ?? (segment.latin ? "ltr" : "rtl");
      return dir === "ltr" && segment.latin ? segment.text : prepareText(segment.text, { direction: "rtl" });
    })
    .join("  ");
}

/** Persian digits, exposed for non-PDF surfaces (UI, e-mails). */
export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => String.fromCharCode(0x06f0 + Number(d)));
}

/** Gregorian → Jalali conversion (needed for certificate dates). */
export function toJalali(date: Date): { year: number; month: number; day: number } {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let jy = gy <= 1600 ? 0 : 979;
  const gy2 = gy <= 1600 ? gy - 621 : gy - 1600;
  const gm2 = gm > 2 ? gm : gm;
  let days =
    365 * gy2 +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    gDaysInMonth.slice(0, gm2 - 1).reduce((a, b) => a + b, 0);
  if (gy2 % 4 === 0 && (gy2 % 100 !== 0 || gy2 % 400 === 0) && gm > 2) days += 1;

  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { year: jy, month: jm, day: jd };
}

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** "۱۸ مرداد ۱۴۰۴" — ready for the certificate. */
export function formatJalali(date: Date, withDigits = true): string {
  const { year, month, day } = toJalali(date);
  const text = `${day} ${JALALI_MONTHS[month - 1]} ${year}`;
  return withDigits ? toPersianDigits(text) : text;
}
