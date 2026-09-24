/**
 * Demo seeder — fills an empty store with a couple of complete, sellable works
 * so the artist dashboard, the storefront and the buyer flow can be *seen* on a
 * fresh install (the local store is wiped whenever the standalone build runs
 * without a data snapshot).
 *
 *   node scripts/marketplace-smoke/mkformats.mjs /tmp/fmt
 *   DATA=dist/.next/standalone/data node scripts/marketplace-smoke/seed-demo-works.mjs
 *
 * It uses the real APIs a browser would (login → upload session → complete →
 * admin approval → pricing), so nothing in the store is fake: every file is a
 * genuinely valid PNG/JPG/PSD/SVG/EPS/AI built by `mkformats.mjs`, and the
 * deliverable filenames, colourways and formats land exactly as an artist
 * upload would.
 *
 * Requires the server to be running and the artist account to exist:
 *   DATA=<store> node scripts/marketplace-smoke/seed-artist-user.mjs
 *
 * Dev/demo helper only — the checks live in *-e2e.sh, this only makes a screen
 * worth looking at.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE ?? "http://localhost:3000";
const DATA = process.env.DATA ?? "dist/.next/standalone/data";
const FILES = process.env.FILES ?? "/tmp/fmt";
const ARTIST_EMAIL = process.env.ARTIST_EMAIL ?? "niloufar@example.com";
const ARTIST_PASSWORD = process.env.ARTIST_PASSWORD ?? "artist-dev-pass";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@rosie-atelier.ir";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin-dev-pass";

const here = dirname(fileURLToPath(import.meta.url));
const artistJar = join("/tmp", "seed-demo-artist.txt");
const adminJar = join("/tmp", "seed-demo-admin.txt");

/** The works to create: two colourways each, six deliverables per colour. */
const WORKS = [
  {
    title: { fa: "باغ پنهان", en: "Quiet Garden" },
    description: {
      fa: "نقش گل و برگ با ریتم آرام برای کاغذ دیواری و پارچه‌ی دکوراسیون داخلی.",
      en: "A calm floral repeat for wallpaper and home fabric.",
    },
    tags: ["floral", "persian", "wallpaper"],
    familyId: "fam-wallpaper",
    tiers: { commercial: { fa: 2_700_000, en: 117 }, extended: { fa: 7_400_000, en: 320 } },
    colourways: [
      { id: "cw-rose", name: { fa: "زرشکی", en: "Crimson" }, hex: "#be123c" },
      { id: "cw-sage", name: { fa: "مریم‌گلی", en: "Sage" }, hex: "#6b8e6b" },
    ],
  },
  {
    title: { fa: "کاشی ترنج", en: "Toranj Tile" },
    description: {
      fa: "الگوی کاشی ایرانی با ترنج مرکزی؛ مناسب رومیزی، کوسن و روتختی.",
      en: "An Iranian tile pattern with a central medallion — tablecloth, cushions, bedding.",
    },
    tags: ["tile", "geometric", "persian"],
    familyId: "fam-tablecloth",
    tiers: { commercial: { fa: 1_900_000, en: 79 }, extended: { fa: 5_400_000, en: 220 } },
    colourways: [
      { id: "cw-turquoise", name: { fa: "فیروزه‌ای", en: "Turquoise" }, hex: "#0d9488" },
      { id: "cw-indigo", name: { fa: "نیلی", en: "Indigo" }, hex: "#3730a3" },
    ],
  },
];

const PLAN = [
  { formatId: "png", file: "png.png", mime: "image/png" },
  { formatId: "jpg", file: "jpg.jpg", mime: "image/jpeg" },
  { formatId: "preview", file: "preview.jpg", mime: "image/jpeg" },
  { formatId: "psd", file: "psd.psd", mime: "image/vnd.adobe.photoshop" },
  { formatId: "svg", file: "svg.svg", mime: "image/svg+xml" },
  { formatId: "eps", file: "eps.eps", mime: "application/postscript" },
];

function curl(args, stdin) {
  const out = execFileSync("curl", ["-s", ...args], { input: stdin, maxBuffer: 64 * 1024 * 1024 });
  return out.toString();
}

function json(method, path, body, jar) {
  const args = ["-X", method, `${BASE}${path}`];
  if (jar) args.push("-b", jar, "-c", jar);
  let data;
  if (body !== undefined) {
    args.push("-H", "content-type: application/json", "--data-binary", "@-");
    data = Buffer.from(JSON.stringify(body));
  }
  const raw = curl(args, data);
  try {
    return JSON.parse(raw);
  } catch {
    return { ok: false, raw };
  }
}

function login(jar, email, password) {
  const result = json("POST", "/api/auth/login", { email, password }, jar);
  if (!result.ok) throw new Error(`login failed for ${email}: ${JSON.stringify(result)}`);
  return result;
}

function upload(jar, work, colourway, slot, attachToAssetId) {
  const source = join(FILES, slot.file);
  if (!existsSync(source)) throw new Error(`missing ${source} — run mkformats.mjs first`);
  const size = readFileSync(source).byteLength;

  const session = json(
    "POST",
    "/api/marketplace/upload/session",
    {
      filename: `${work.title.en.toLowerCase().replace(/\s+/g, "-")}-${colourway.id}-${slot.formatId}.${slot.file.split(".").pop()}`,
      sizeBytes: size,
      mime: slot.mime,
      title: work.title,
      description: work.description,
      tags: work.tags,
      kind: "pattern",
      familyId: work.familyId,
      formatId: slot.formatId,
      colourwayId: colourway.id,
      colourway: { name: colourway.name, hex: colourway.hex },
      ...(attachToAssetId ? { attachToAssetId } : {}),
    },
    jar,
  );
  if (!session.ok) throw new Error(`session failed: ${JSON.stringify(session).slice(0, 200)}`);

  const completed = JSON.parse(
    curl(
      ["-X", "POST", `${BASE}/api/marketplace/upload/complete`, "-b", jar, "-c", jar,
       "-F", `sessionId=${session.session.id}`, "-F", `file=@${source};type=${slot.mime}`],
    ),
  );
  if (!completed.ok) throw new Error(`complete failed: ${JSON.stringify(completed).slice(0, 200)}`);
  return completed.asset.id;
}

/* ------------------------------------------------------------------ */

if (!existsSync(join(FILES, "png.png"))) {
  console.log(`building test files → ${FILES}`);
  execFileSync(process.execPath, [join(here, "mkformats.mjs"), FILES], { stdio: "inherit" });
}
mkdirSync(resolve(DATA), { recursive: true });

console.log(`demo seed → ${BASE}   (store: ${DATA})`);
login(artistJar, ARTIST_EMAIL, ARTIST_PASSWORD);
login(adminJar, ADMIN_EMAIL, ADMIN_PASSWORD);

for (const work of WORKS) {
  let assetId = "";
  for (const colourway of work.colourways) {
    for (const slot of PLAN) {
      assetId = upload(artistJar, work, colourway, slot, assetId || undefined);
    }
    console.log(`  ✔ ${work.title.fa} · ${colourway.name.fa} — six deliverables attached (${assetId})`);
  }

  const approved = json("POST", "/api/marketplace/admin/review", { action: "approve", assetId, publish: true }, adminJar);
  if (!approved.ok) throw new Error(`approval failed: ${JSON.stringify(approved).slice(0, 200)}`);

  const priced = json(
    "PATCH",
    "/api/marketplace/artist/assets",
    {
      id: assetId,
      tiers: [
        { id: "tier-commercial", priceFa: work.tiers.commercial.fa, priceEn: work.tiers.commercial.en, enabled: true },
        { id: "tier-extended", priceFa: work.tiers.extended.fa, priceEn: work.tiers.extended.en, enabled: true },
      ],
    },
    artistJar,
  );
  if (!priced.ok) throw new Error(`pricing failed: ${JSON.stringify(priced).slice(0, 200)}`);
  console.log(`  ✔ ${work.title.fa} approved, published and priced — ${assetId}`);
}

console.log("\n✿ demo store ready — open /fa/marketplace and /fa/artist");
