import "server-only";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { drawTextPath, hasRtl, measureTextPath } from "./textpath";
import type { FontWeight } from "./shaper";
import { toPersianDigits } from "./text";

/**
 * License certificate generator.
 *
 * Produces a bilingual, print-ready A4 PDF:
 *   page 1 — the certificate (brand frame, holder, work, license terms, QR)
 *   page 2 — the full license agreement + payment summary
 *
 * Rendering strategy:
 *   • Persian  → shaped, bidi-ordered **vector outlines** (`./textpath`). The
 *     bundled IranSans web font is a WOFF2 whose `glyf` table is transformed, so
 *     PDF viewers reject it as an embedded font; outlines are the robust answer
 *     and they render identically everywhere.
 *   • Latin    → real embedded Helvetica, so serials, e-mails, order references
 *     and dates stay selectable and searchable in the PDF.
 */

export interface CertificateArtist {
  name: { fa: string; en: string };
  slug?: string;
}

export interface CertificateAsset {
  title: { fa: string; en: string };
  sku?: string;
  kind?: string;
  /** Formats the license delivers — printed so the document matches the files. */
  formats?: { fa: string; en: string } | null;
}

export interface CertificateLicense {
  serial: string;
  id: string;
  licenseKind: string;
  licenseKindLabel: { fa: string; en: string };
  exclusivity?: { fa: string; en: string };
  issuedAt: string;
  maxDownloads: number;
  maxUnits: number;
  terms: { fa: string; en: string };
  pricePaid: { fa: number; en: number };
  royalty?: { pct: number; amount: { fa: number; en: number } };
}

export interface CertificateOrderInfo {
  id: string;
  date: string;
  provider?: string;
  reference?: string;
  couponCode?: string;
}

export interface CertificateInput {
  locale: "fa" | "en";
  brand: { fa: string; en: string };
  siteUrl: string;
  license: CertificateLicense;
  asset: CertificateAsset;
  artist: CertificateArtist;
  buyer: { name: string; email: string; company?: string; country?: string };
  order: CertificateOrderInfo;
  verificationUrl: string;
  accent?: string;
}

/* ------------------------------------------------------------------ */
/* Small colour helpers                                                */
/* ------------------------------------------------------------------ */

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );
}

type Rgb = ReturnType<typeof hexToRgb>;

const INK = hexToRgb("#101828");
const MUTED = hexToRgb("#667085");
const PAPER = hexToRgb("#fffdf9");
const LINE = hexToRgb("#e7e0d5");
const PANEL = hexToRgb("#f8f5f0");
const WHITE = rgb(1, 1, 1);
const A4 = { w: 842, h: 595 };

/* ------------------------------------------------------------------ */
/* Render context                                                      */
/* ------------------------------------------------------------------ */

interface Ctx {
  page: PDFPage;
  fa: boolean;
  accent: Rgb;
  latin: PDFFont;
  latinBold: PDFFont;
}

interface TextOptions {
  x: number;
  y: number;
  size?: number;
  weight?: FontWeight;
  color?: Rgb;
  align?: "start" | "end" | "center";
  maxWidth?: number;
  lineHeight?: number;
}

/**
 * Draws a string in the right pipeline: real embedded text when it is Latin,
 * shaped vector outlines when it is Persian.
 * Returns the width of the widest line.
 */
async function text(ctx: Ctx, value: string, options: TextOptions): Promise<number> {
  if (!value) return 0;
  const size = options.size ?? 10;
  const color = options.color ?? INK;

  if (!hasRtl(value)) {
    const font = options.weight === "bold" || options.weight === "semibold" ? ctx.latinBold : ctx.latin;
    const width = font.widthOfTextAtSize(value, size);
    let x = options.x;
    if (options.align === "end") x = options.x - width;
    else if (options.align === "center") x = options.x - width / 2;
    ctx.page.drawText(value, { x, y: options.y, size, font, color });
    return width;
  }

  const measured = await measureTextPath(value, size, options.weight, options.maxWidth);
  await drawTextPath(ctx.page, value, {
    x: options.x,
    y: options.y,
    size,
    weight: options.weight,
    color,
    align: options.align,
    maxWidth: options.maxWidth,
    lineHeight: options.lineHeight,
  });
  return measured.width;
}

const L = (fa: boolean, faText: string, enText: string) => (fa ? faText : enText);

function money(price: { fa: number; en: number }, fa: boolean) {
  if (price.fa > 0) {
    const value = price.fa.toLocaleString("en-US");
    return fa ? `${toPersianDigits(value)} تومان` : `${value} IRT`;
  }
  return `$${price.en.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function gregorian(date: Date, fa: boolean) {
  const formatted = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(date);
  return fa ? toPersianDigits(formatted) : formatted;
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

export async function generateLicenseCertificate(input: CertificateInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${input.license.serial} — ${input.brand.en} license certificate`);
  doc.setAuthor(input.brand.en);
  doc.setSubject(input.asset.title.en);
  doc.setProducer(`${input.brand.en} marketplace`);
  doc.setCreationDate(new Date());

  const latin = await doc.embedFont(StandardFonts.Helvetica);
  const latinBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ctx: Ctx = {
    page: doc.addPage([A4.w, A4.h]),
    fa: input.locale === "fa",
    accent: hexToRgb(input.accent ?? "#b5713a"),
    latin,
    latinBold,
  };

  await drawCertificatePage(ctx, input);
  ctx.page = doc.addPage([A4.w, A4.h]);
  await drawAgreementPage(ctx, input);

  return doc.save();
}

/* ------------------------------------------------------------------ */
/* Page 1 — the certificate                                            */
/* ------------------------------------------------------------------ */

async function drawCertificatePage(ctx: Ctx, input: CertificateInput) {
  const { page, fa, accent } = ctx;

  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: PAPER });
  page.drawRectangle({ x: 0, y: A4.h - 8, width: A4.w, height: 8, color: accent });
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: 4, color: INK });
  page.drawRectangle({ x: 28, y: 26, width: A4.w - 56, height: A4.h - 56, borderColor: LINE, borderWidth: 1, color: WHITE });
  page.drawRectangle({ x: 36, y: 34, width: A4.w - 72, height: A4.h - 72, borderColor: accent, borderWidth: 0.8 });

  /* ---------- header ---------- */
  const headerY = A4.h - 92;
  await text(ctx, fa ? input.brand.fa : input.brand.en, { x: 64, y: headerY, size: 19, weight: "bold" });
  await text(ctx, L(fa, "فروشگاه آثار دیجیتال و لایسنس", "Digital art marketplace & licensing"), {
    x: 64,
    y: headerY - 20,
    size: 9.5,
    color: MUTED,
  });
  await text(ctx, L(fa, "شماره گواهی", "Certificate no."), { x: A4.w - 64, y: headerY, size: 8.5, color: MUTED, align: "end" });
  await text(ctx, input.license.serial, { x: A4.w - 64, y: headerY - 15, size: 12, weight: "bold", align: "end" });
  page.drawLine({ start: { x: 64, y: headerY - 36 }, end: { x: A4.w - 64, y: headerY - 36 }, thickness: 0.8, color: LINE });

  /* ---------- title ---------- */
  const titleY = headerY - 92;
  await text(ctx, L(fa, "گواهی لایسنس", "License certificate"), {
    x: A4.w / 2,
    y: titleY,
    size: 30,
    weight: "bold",
    align: "center",
  });
  await text(ctx, fa ? input.license.licenseKindLabel.fa : input.license.licenseKindLabel.en, {
    x: A4.w / 2,
    y: titleY - 28,
    size: 14,
    color: accent,
    align: "center",
  });
  await text(ctx, L(fa, `اثر: ${input.asset.title.fa}`, `Work: ${input.asset.title.en}`), {
    x: A4.w / 2,
    y: titleY - 50,
    size: 11.5,
    color: MUTED,
    align: "center",
  });
  page.drawLine({
    start: { x: A4.w / 2 - 90, y: titleY - 64 },
    end: { x: A4.w / 2 + 90, y: titleY - 64 },
    thickness: 1.2,
    color: accent,
  });

  /* ---------- field grid ---------- */
  const rows: [string, string][] = [
    [L(fa, "دارنده لایسنس", "License holder"), input.buyer.company ? `${input.buyer.name} — ${input.buyer.company}` : input.buyer.name],
    [L(fa, "ایمیل", "Email"), input.buyer.email],
    [L(fa, "اثر / شناسه", "Work / SKU"), `${fa ? input.asset.title.fa : input.asset.title.en}${input.asset.sku ? ` · ${input.asset.sku}` : ""}`],
    [L(fa, "هنرمند", "Artist"), fa ? input.artist.name.fa : input.artist.name.en],
    ...(input.asset.formats
      ? ([[L(fa, "فرمت‌های تحویل", "Delivered formats"), fa ? input.asset.formats.fa : input.asset.formats.en]] as [string, string][])
      : []),
    [L(fa, "نوع لایسنس", "License type"), fa ? input.license.licenseKindLabel.fa : input.license.licenseKindLabel.en],
    [
      L(fa, "محدوده استفاده", "Usage scope"),
      input.license.maxUnits > 0
        ? L(fa, `حداکثر ${toPersianDigits(String(input.license.maxUnits))} واحد / پروژه`, `Up to ${input.license.maxUnits} units`)
        : L(fa, "بدون محدودیت تعداد", "Unlimited units"),
    ],
    [
      L(fa, "تعداد دانلود مجاز", "Allowed downloads"),
      input.license.maxDownloads > 0
        ? L(fa, `${toPersianDigits(String(input.license.maxDownloads))} بار`, `${input.license.maxDownloads} downloads`)
        : L(fa, "نامحدود", "Unlimited"),
    ],
    [L(fa, "تاریخ صدور", "Issued at"), gregorian(new Date(input.license.issuedAt), fa)],
    [L(fa, "شماره سفارش", "Order reference"), input.order.id],
    [L(fa, "مبلغ پرداخت‌شده", "Amount paid"), money(input.license.pricePaid, fa)],
  ];

  const fieldTop = titleY - 94;
  const columnWidth = (A4.w - 128) / 2;
  const rowHeight = 26;
  for (let index = 0; index < rows.length; index += 1) {
    const [key, value] = rows[index];
    const logicalColumn = fa ? 1 - (index % 2) : index % 2;
    const x = 64 + logicalColumn * columnWidth;
    const y = fieldTop - Math.floor(index / 2) * rowHeight;
    await text(ctx, key, { x, y, size: 8.5, color: MUTED });
    await text(ctx, value, { x, y: y - 12, size: 10.5, weight: "bold", maxWidth: columnWidth - 28 });
  }

  /* ---------- terms ---------- */
  const termsTop = fieldTop - Math.ceil(rows.length / 2) * rowHeight - 10;
  page.drawRectangle({ x: 64, y: termsTop - 62, width: A4.w - 128, height: 70, color: PANEL });
  await text(ctx, L(fa, "شرایط لایسنس", "License terms"), { x: 78, y: termsTop - 10, size: 9.5, weight: "bold" });
  await text(ctx, fa ? input.license.terms.fa : input.license.terms.en, {
    x: 78,
    y: termsTop - 26,
    size: 9,
    color: MUTED,
    maxWidth: A4.w - 200,
    lineHeight: 13.5,
  });

  /* ---------- footer: signature + QR ---------- */
  const footerY = 92;
  const qrPng = await QRCode.toBuffer(input.verificationUrl, { type: "png", margin: 1, width: 240 });
  const qr = await page.doc.embedPng(qrPng);
  const qrSize = 66;
  page.drawImage(qr, { x: fa ? A4.w - 64 - qrSize : 64, y: footerY - 48, width: qrSize, height: qrSize });

  const textX = fa ? 64 : 152;
  await text(ctx, L(fa, "امضای هنرمند", "Artist signature"), { x: textX, y: footerY + 14, size: 8.5, color: MUTED });
  await text(ctx, fa ? input.artist.name.fa : input.artist.name.en, { x: textX, y: footerY - 4, size: 13, weight: "bold" });
  await text(ctx, L(fa, "رزی آتلیه — گواهی رسمی لایسنس دیجیتال", "Rosie Atelier — official digital license"), {
    x: textX,
    y: footerY - 24,
    size: 8.5,
    color: MUTED,
  });
  await text(ctx, `${L(fa, "اعتبارسنجی", "Verify")}: ${input.verificationUrl}`, {
    x: textX,
    y: footerY - 36,
    size: 7.5,
    color: MUTED,
    maxWidth: A4.w - 280,
  });

  await text(
    ctx,
    L(
      fa,
      "این گواهی به‌صورت خودکار توسط سیستم رزی آتلیه صادر شده و با شماره گواهی در وب‌سایت قابل راستی‌آزمایی است.",
      "Issued automatically by Rosie Atelier; verifiable on the website using the certificate number.",
    ),
    { x: A4.w / 2, y: 40, size: 7.5, color: MUTED, align: "center", maxWidth: A4.w - 220 },
  );
}

/* ------------------------------------------------------------------ */
/* Page 2 — full agreement + payment summary                           */
/* ------------------------------------------------------------------ */

async function drawAgreementPage(ctx: Ctx, input: CertificateInput) {
  const { page, fa, accent } = ctx;
  page.drawRectangle({ x: 0, y: 0, width: A4.w, height: A4.h, color: WHITE });
  page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: accent });

  await text(ctx, L(fa, "متن کامل توافق‌نامه لایسنس", "Full license agreement"), {
    x: 64,
    y: A4.h - 70,
    size: 18,
    weight: "bold",
  });
  await text(ctx, `${L(fa, "شماره گواهی", "Certificate")}: ${input.license.serial}`, {
    x: 64,
    y: A4.h - 92,
    size: 10,
    color: MUTED,
  });

  const clauses: [string, string][] = fa
    ? [
        ["۱. اعطای مجوز", input.license.terms.fa],
        [
          "۲. محدوده استفاده",
          input.license.maxUnits > 0
            ? `استفاده از اثر در قالب حداکثر ${toPersianDigits(String(input.license.maxUnits))} واحد محصول یا یک پروژه مجاز است. استفاده بیش از این مقدار نیازمند ارتقای لایسنس است.`
            : "استفاده از اثر برای هر تعداد محصول یا پروژه مجاز است، اما فروش مجدد خودِ فایل به‌عنوان اثر دیجیتال مجاز نیست.",
        ],
        [
          "۳. محدودیت‌ها",
          "فروش، توزیع یا انتشار فایل مادر (Master) به هر شکل ممنوع است. انتقال لایسنس به اشخاص ثالث تنها با موافقت کتبی رزی آتلیه امکان‌پذیر است.",
        ],
        [
          "۴. حق مالکیت",
          input.license.exclusivity?.fa ?? "حق مالکیت معنوی اثر نزد هنرمند باقی می‌ماند؛ لایسنس صرفاً حق استفاده را منتقل می‌کند.",
        ],
        [
          "۵. راستی‌آزمایی",
          "اصالت این گواهی از طریق شماره گواهی یا کد QR صفحه اول، در بخش «راستی‌آزمایی گواهی» وب‌سایت قابل بررسی است.",
        ],
        [
          "۶. بازگشت و ابطال",
          "در صورت نقض شرایط، رزی آتلیه می‌تواند لایسنس را باطل کند. آثار دیجیتال پس از دانلود قابل بازگشت نیستند، مگر در صورت اثبات نقص فایل.",
        ],
      ]
    : [
        ["1. Grant", input.license.terms.en],
        [
          "2. Scope",
          input.license.maxUnits > 0
            ? `You may use the work in up to ${input.license.maxUnits} product units or one project. Larger volumes require a license upgrade.`
            : "You may use the work in unlimited product units or projects, but reselling the digital file itself is not permitted.",
        ],
        [
          "3. Restrictions",
          "Redistributing, reselling or publishing the master file in any form is prohibited. Transferring this license to a third party requires written approval from Rosie Atelier.",
        ],
        [
          "4. Ownership",
          input.license.exclusivity?.en ?? "Intellectual property remains with the artist; this license grants usage rights only.",
        ],
        ["5. Verification", "Authenticity can be checked at any time with the certificate number or the QR code on page 1."],
        [
          "6. Revocation & refunds",
          "Rosie Atelier may revoke a license in case of breach. Digital goods are non-refundable after download unless the file is proven defective.",
        ],
      ];

  let y = A4.h - 132;
  for (const [heading, body] of clauses) {
    await text(ctx, heading, { x: 64, y, size: 11, weight: "bold" });
    y -= 16;
    const lines = await wrapLines(ctx, body, 9.5, A4.w - 190);
    for (const line of lines) {
      const width = await text(ctx, line, { x: 64, y, size: 9.5, color: MUTED });
      void width;
      y -= 13.5;
    }
    y -= 9;
  }

  /* ---------- payment summary ---------- */
  const receiptY = 112;
  page.drawLine({ start: { x: 64, y: receiptY + 42 }, end: { x: A4.w - 64, y: receiptY + 42 }, thickness: 0.8, color: LINE });
  await text(ctx, L(fa, "خلاصه پرداخت", "Payment summary"), { x: 64, y: receiptY + 22, size: 11, weight: "bold" });

  const rows: [string, string][] = [
    [L(fa, "سفارش", "Order"), input.order.id],
    [L(fa, "درگاه پرداخت", "Gateway"), input.order.provider ?? "—"],
    [L(fa, "کد پیگیری", "Gateway reference"), input.order.reference ?? "—"],
    [L(fa, "مبلغ کل", "Amount paid"), money(input.license.pricePaid, fa)],
    [
      L(fa, "سهم هنرمند", "Artist royalty"),
      input.license.royalty
        ? `${toPersianDigits(String(input.license.royalty.pct))}${fa ? "٪" : "%"} · ${money(input.license.royalty.amount, fa)}`
        : "—",
    ],
  ];
  let ly = receiptY - 2;
  for (const [key, value] of rows) {
    await text(ctx, key, { x: 64, y: ly, size: 8.5, color: MUTED });
    await text(ctx, value, { x: A4.w - 64, y: ly, size: 9, weight: "bold", align: "end" });
    ly -= 15;
  }

  await text(
    ctx,
    L(fa, "رزی آتلیه · rosie-atelier.ir · پشتیبانی: hello@rosie-atelier.ir", "Rosie Atelier · rosie-atelier.ir · support hello@rosie-atelier.ir"),
    { x: A4.w / 2, y: 60, size: 8, color: MUTED, align: "center" },
  );
}

/** Splits a paragraph into lines that fit `maxWidth`. */
async function wrapLines(ctx: Ctx, value: string, size: number, maxWidth: number): Promise<string[]> {
  if (!hasRtl(value)) {
    const words = value.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.latin.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  const { lines } = await import("./shaper").then((shaper) =>
    shaper.loadShapingFont("regular").then((font) => shaper.wrapShaped(font, value, size, maxWidth)),
  );
  return lines;
}
