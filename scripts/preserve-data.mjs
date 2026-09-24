/**
 * Keep the runtime data store alive across builds.
 *
 * The store writes to `data/` relative to the process working directory, so the running
 * standalone server (`dist/.next/standalone/server.js`) owns `dist/.next/standalone/data`.
 * `next build` bundles the repository copy of `data/*.json` and `data/objects/**` into the
 * standalone folder (Node file tracing), which silently overwrites whatever the live server
 * had stored there: uploads, orders, licences and reservations would vanish on every deploy.
 *
 * This script therefore snapshots the standalone data store **before** the build (`prebuild`)
 * and puts it back **after** the build (`postbuild`):
 *
 *   prebuild  → .runtime-data/   (copy of dist/.next/standalone/data)
 *   postbuild → dist/.next/standalone/data   (restored verbatim)
 *
 * A fresh clone has no snapshot yet, so the first build still gets seeded from the repository
 * copy. To deliberately re-seed the running store from `data/`, run the build with
 * `ROZVELT_DATA_FROM_REPO=1`.
 *
 * Restoring also *creates* the folder when the build produced none: repositories that keep
 * `data/` out of git would otherwise lose the whole store on every deploy.
 *
 * Usage:
 *   node scripts/preserve-data.mjs --snapshot
 *   node scripts/preserve-data.mjs --restore
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const standaloneData = join(root, "dist/.next/standalone/data");
const snapshot = join(root, ".runtime-data/data");
const mode = process.argv[2] ?? "--snapshot";

const restoring = mode === "--restore";

/* A standard `.next` deployment keeps its data elsewhere, and the very first
   build has nothing to snapshot — both are fine. When restoring, a missing
   folder is *not* a reason to skip: the build may simply have produced no data
   folder at all (nothing committed under `data/`), and the live store must come
   back. */
if (!existsSync(standaloneData) && !restoring) {
  console.log("ℹ dist/.next/standalone/data not found — nothing to snapshot.");
  process.exit(0);
}

const files = existsSync(standaloneData) ? countFiles(standaloneData) : 0;

if (mode === "--snapshot") {
  rmSync(snapshot, { recursive: true, force: true });
  mkdirSync(snapshot, { recursive: true });
  cpSync(standaloneData, snapshot, { recursive: true, force: true });
  writeFileSync(
    join(root, ".runtime-data/manifest.json"),
    `${JSON.stringify({ takenAt: new Date().toISOString(), files, bytes: dirSize(standaloneData) }, null, 2)}\n`,
  );
  console.log(`✓ runtime data snapshotted → .runtime-data/data (${files} files)`);
  process.exit(0);
}

if (mode === "--restore") {
  if (process.env.ROZVELT_DATA_FROM_REPO === "1") {
    console.log("ℹ ROZVELT_DATA_FROM_REPO=1 — keeping the data copied into the build on purpose.");
    process.exit(0);
  }
  if (!existsSync(snapshot) || !countFiles(snapshot)) {
    console.log("ℹ no runtime data snapshot yet — the build seeded the store from data/.");
    process.exit(0);
  }
  const live = countFiles(snapshot);
  rmSync(standaloneData, { recursive: true, force: true });
  mkdirSync(standaloneData, { recursive: true });
  cpSync(snapshot, standaloneData, { recursive: true, force: true });
  console.log(
    `✓ runtime data restored ← .runtime-data/data (${live} files, ${(dirSize(standaloneData) / 1024 / 1024).toFixed(1)} MB) — ${relative(root, standaloneData)}`,
  );
  process.exit(0);
}

console.error(`✖ unknown mode "${mode}" — use --snapshot or --restore`);
process.exit(1);

function countFiles(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}

function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) total += dirSize(join(dir, entry.name));
    else total += statSync(join(dir, entry.name)).size;
  }
  return total;
}
