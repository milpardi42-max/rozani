/**
 * Builds one genuinely valid file per deliverable format, so the upload/download
 * tests carry real artwork instead of renamed dummies.
 *
 *   node scripts/marketplace-smoke/mkformats.mjs /tmp/fmt
 *
 * Uses the project's own dependencies (`sharp` for raster, `pdf-lib` for the
 * PDF-compatible Illustrator file) so nothing extra has to be installed.
 *
 *   png.png      PNG   — tileable artwork with real transparency
 *   jpg.jpg      JPEG  — the same artwork, flattened
 *   preview.jpg  JPEG  — the artist's own cover image (different composition)
 *   ai.ai        AI    — PDF-compatible Illustrator file (starts with %PDF)
 *   psd.psd      PSD   — 8BPS header + raw RGB planes (Photoshop-readable)
 *   svg.svg      SVG   — real <svg> vector
 *   eps.eps      EPS   — PostScript ("%!PS-Adobe-3.0 EPSF-3.0")
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { PDFDocument, rgb } from "pdf-lib";

const SIZE = 512;
const target = process.argv[2] ?? "/tmp/fmt";
mkdirSync(target, { recursive: true });

/* ---------- pixels: a quarter-symmetric, genuinely tileable pattern -------- */
const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    const at = (y * SIZE + x) * 4;
    const wave = Math.sin((2 * Math.PI * 4 * x) / SIZE) * Math.cos((2 * Math.PI * 4 * y) / SIZE);
    const band = Math.floor(y / 64) % 2 === 0;
    const crimson = x % 128 < 64;
    pixels[at] = crimson ? 190 : 13;
    pixels[at + 1] = crimson ? 18 : 148;
    pixels[at + 2] = crimson ? 60 : 136;
    pixels[at + 3] = wave > 0.1 || band ? 255 : 0; // real alpha channel
  }
}

const cover = Buffer.alloc((SIZE / 2) * 256 * 3, 244);
for (let y = 0; y < 256; y += 1) {
  for (let x = 0; x < SIZE / 2; x += 1) {
    const at = (y * (SIZE / 2) + x) * 3;
    const blob = Math.hypot(x - (40 + (x % 200)) * 0.5, y - 120) < 60;
    cover[at] = blob ? 190 : 250;
    cover[at + 1] = blob ? 18 : 247;
    cover[at + 2] = blob ? 60 : 243;
  }
}

/* ---------- raster -------------------------------------------------------- */
await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(join(target, "png.png"));
await sharp(pixels, { raw: { width: SIZE, height: SIZE, channels: 4 } })
  .flatten({ background: "#ffffff" })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(join(target, "jpg.jpg"));
await sharp(cover, { raw: { width: SIZE / 2, height: 256, channels: 3 } })
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(join(target, "preview.jpg"));
await sharp(cover, { raw: { width: SIZE / 2, height: 256, channels: 3 } })
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(join(target, "ai-cover.jpg"));

/* ---------- AI = PDF-compatible Illustrator document ---------------------- */
const pdf = await PDFDocument.create();
const page = pdf.addPage([SIZE, SIZE]);
page.drawRectangle({ x: 24, y: 24, width: SIZE - 48, height: SIZE - 48, color: rgb(0.75, 0.07, 0.23) });
page.drawRectangle({ x: 80, y: 80, width: 120, height: 120, color: rgb(0.05, 0.58, 0.53) });
page.drawCircle({ x: 320, y: 320, size: 72, color: rgb(0.79, 0.54, 0.02) });
writeFileSync(join(target, "ai.ai"), await pdf.save());

/* ---------- PSD: header + empty sections + raw RGB planes ----------------- */
const header = Buffer.concat([
  Buffer.from("8BPS"),
  Buffer.from([0, 1]), // version 1
  Buffer.alloc(6), // reserved
  Buffer.from([0, 3]), // 3 channels
  Buffer.from([(SIZE >> 24) & 0xff, (SIZE >> 16) & 0xff, (SIZE >> 8) & 0xff, SIZE & 0xff]),
  Buffer.from([(SIZE >> 24) & 0xff, (SIZE >> 16) & 0xff, (SIZE >> 8) & 0xff, SIZE & 0xff]),
  Buffer.from([0, 8]), // 8-bit
  Buffer.from([0, 3]), // RGB colour mode
  Buffer.alloc(4 * 3), // colour mode data + image resources + layer info: empty
  Buffer.from([0, 0]), // compression: raw
]);
const interleaved = Buffer.alloc(SIZE * SIZE * 3);
for (let index = 0; index < SIZE * SIZE; index += 1) {
  interleaved[index * 3] = pixels[index * 4];
  interleaved[index * 3 + 1] = pixels[index * 4 + 1];
  interleaved[index * 3 + 2] = pixels[index * 4 + 2];
}
/* PSD stores one plane per channel, not interleaved pixels. */
const planes = Buffer.concat([0, 1, 2].map((channel) => Buffer.from(interleaved.filter((_, at) => at % 3 === channel))));
writeFileSync(join(target, "psd.psd"), Buffer.concat([header, planes]));

/* ---------- SVG ----------------------------------------------------------- */
writeFileSync(
  join(target, "svg.svg"),
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <pattern id="quatrefoil" width="128" height="128" patternUnits="userSpaceOnUse">
      <circle cx="32" cy="32" r="24" fill="#be123c"/>
      <circle cx="96" cy="96" r="24" fill="#0d9488"/>
      <rect x="60" y="60" width="8" height="8" fill="#0f172a"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#quatrefoil)"/>
</svg>
`,
);

/* ---------- EPS ----------------------------------------------------------- */
writeFileSync(
  join(target, "eps.eps"),
  `%!PS-Adobe-3.0 EPSF-3.0
%%Creator: Rosie Atelier smoke rig
%%BoundingBox: 0 0 ${SIZE} ${SIZE}
%%Pages: 1
%%EndComments
0.75 0.07 0.23 setrgbcolor
24 24 ${SIZE - 48} ${SIZE - 48} rectfill
0.05 0.58 0.53 setrgbcolor
80 80 120 120 rectfill
showpage
%%EOF
`,
);

for (const name of ["png.png", "jpg.jpg", "preview.jpg", "ai.ai", "psd.psd", "svg.svg", "eps.eps"]) {
  const path = join(target, name);
  console.log(`${name.padEnd(12)} ${String(statSync(path).size).padStart(8)} B`);
}
