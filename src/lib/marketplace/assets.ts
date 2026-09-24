import "server-only";
import crypto from "crypto";
import {
  DEFAULT_ARTIST_SHARE_PCT,
  MAX_MASTER_BYTES,
  MULTIPART_PART_SIZE,
  MULTIPART_THRESHOLD_BYTES,
  acceptedMasterMime,
  defaultTiers,
  storageProvider,
} from "./config";
import { KEYS, mutateCollection, readCollection, readDoc, writeDoc, nextSequence } from "./store";
import { deleteObject, deliverableKey, derivedKey, masterKey, putBuffer, stagedMasterKey, stagingPrefix } from "./storage";
import { scanBuffer, sha256 } from "./scanner";
import { WATERMARK_LINES, buildDerivatives, cornerTagFor, readImageSize, renderColourwayPreview } from "./media";
import { detectFormat, formatById, formatStoredMime, minUploadBytes, verifyFileSignature, type ExportFormatId } from "./formats";
import { DEFAULT_COLOURWAY_ID, sanitizeHex } from "./colourways";
import { refundPrice } from "./royalty";
import type { Localized } from "@/lib/i18n/types";
import type {
  Asset,
  AssetKind,
  AssetStatus,
  Colourway,
  ColourwayFile,
  LedgerEntry,
  LicenseTier,
  PricePair,
  ScanReport,
  SeamlessReport,
  UploadSession,
} from "./types";

/**
 * Asset lifecycle — everything that happens between "artist picked a file" and
 * "an admin can approve or reject it".
 *
 *   createSession → upload parts (single or multipart) → completeUpload
 *     → store master privately → ClamAV/heuristic scan
 *     → watermark + thumbnails + mockups + seamless analysis
 *     → status: pending_review  (or `rejected` when the scan finds something)
 */

/* ------------------------------------------------------------------ */
/* Uid + slug helpers                                                  */
/* ------------------------------------------------------------------ */

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;

export function slugify(input: string, fallback = "asset-x"): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

export async function uniqueAssetSlug(base: string, excludeId?: string): Promise<string> {
  const assets = await getAssets();
  const taken = new Set(assets.filter((a) => a.id !== excludeId).map((a) => a.slug));
  let candidate = slugify(base, `asset-${crypto.randomBytes(3).toString("hex")}`);
  let counter = 2;
  while (taken.has(candidate)) {
    candidate = `${slugify(base)}-${counter}`;
    counter += 1;
  }
  return candidate;
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export interface AssetQuery {
  status?: AssetStatus | AssetStatus[];
  ownerUserId?: string | null;
  artistId?: string;
  kind?: AssetKind | AssetKind[];
  search?: string;
  tag?: string;
  /** Only assets that can be bought right now. */
  purchasable?: boolean;
  limit?: number;
  offset?: number;
}

export async function getAssets(): Promise<Asset[]> {
  return readCollection<Asset>(KEYS.assets);
}

export async function getAsset(id: string): Promise<Asset | null> {
  const assets = await getAssets();
  return assets.find((asset) => asset.id === id) ?? null;
}

export async function getAssetBySlug(slug: string): Promise<Asset | null> {
  const assets = await getAssets();
  return assets.find((asset) => asset.slug === slug) ?? null;
}

export function isPurchasable(asset: Asset): boolean {
  return asset.status === "approved" && asset.visibility === "public" && asset.tiers.some((tier) => tier.enabled);
}

export function filterAssets(assets: Asset[], query: AssetQuery = {}): Asset[] {
  const statuses = query.status ? (Array.isArray(query.status) ? query.status : [query.status]) : null;
  const needle = query.search?.trim().toLowerCase();

  let out = assets.filter((asset) => {
    if (statuses && !statuses.includes(asset.status)) return false;
    if (query.ownerUserId !== undefined && asset.ownerUserId !== query.ownerUserId) return false;
    if (query.artistId && asset.artistId !== query.artistId) return false;
    if (query.kind) {
      const kinds = Array.isArray(query.kind) ? query.kind : [query.kind];
      if (kinds.length && !kinds.includes(asset.kind)) return false;
    }
    if (query.tag && !asset.tags.includes(query.tag)) return false;
    if (query.purchasable && !isPurchasable(asset)) return false;
    if (needle) {
      const haystack = [
        asset.title.fa,
        asset.title.en,
        asset.description.fa,
        asset.description.en,
        asset.slug,
        asset.id,
        ...asset.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  out = out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const offset = query.offset ?? 0;
  if (query.offset || query.limit) out = out.slice(offset, query.limit ? offset + query.limit : undefined);
  return out;
}

export async function listAssets(query: AssetQuery = {}): Promise<Asset[]> {
  return filterAssets(await getAssets(), query);
}

/** Public catalogue — used by the storefront pages. */
export async function listPublicAssets(limit?: number): Promise<Asset[]> {
  const assets = await listAssets({ purchasable: true });
  return limit ? assets.slice(0, limit) : assets;
}

export async function assetsByArtist(artistId: string): Promise<Asset[]> {
  return listAssets({ artistId });
}

export async function assetsForOwner(userId: string): Promise<Asset[]> {
  return listAssets({ ownerUserId: userId });
}

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

export async function saveAsset(asset: Asset): Promise<Asset> {
  const next = { ...asset, updatedAt: new Date().toISOString() };
  await mutateCollection<Asset, void>(KEYS.assets, (assets) => {
    const index = assets.findIndex((item) => item.id === asset.id);
    if (index === -1) return { next: [...assets, next], result: undefined };
    const copy = assets.slice();
    copy[index] = next;
    return { next: copy, result: undefined };
  });
  return next;
}

export async function deleteAsset(id: string, options: { deleteObjects?: boolean } = {}): Promise<boolean> {
  const asset = await getAsset(id);
  if (!asset) return false;

  await mutateCollection<Asset, void>(KEYS.assets, (assets) => ({
    next: assets.filter((item) => item.id !== id),
    result: undefined,
  }));

  if (options.deleteObjects !== false) {
    await deleteObject(asset.master.key).catch(() => undefined);
    for (const file of [...asset.derivatives, ...asset.mockups]) {
      await deleteObject(file.key).catch(() => undefined);
    }
  }
  return true;
}

export async function setAssetStatus(
  id: string,
  status: AssetStatus,
  review: { reviewedBy?: string; note?: string } = {},
): Promise<Asset | null> {
  const asset = await getAsset(id);
  if (!asset) return null;
  return saveAsset({
    ...asset,
    status,
    rejectionNote: status === "rejected" ? review.note : undefined,
    review: { ...asset.review, reviewedBy: review.reviewedBy, reviewedAt: new Date().toISOString(), note: review.note },
  });
}

export async function setAssetVisibility(id: string, visibility: Asset["visibility"]): Promise<Asset | null> {
  const asset = await getAsset(id);
  if (!asset) return null;
  return saveAsset({ ...asset, visibility });
}

export async function updateAssetTiers(id: string, tiers: LicenseTier[]): Promise<Asset | null> {
  const asset = await getAsset(id);
  if (!asset) return null;
  return saveAsset({ ...asset, tiers });
}

export async function updateAssetMeta(
  id: string,
  patch: Partial<Pick<Asset, "title" | "description" | "tags" | "kind" | "patternId" | "productId" | "revenueSharePct">>,
): Promise<Asset | null> {
  const asset = await getAsset(id);
  if (!asset) return null;
  return saveAsset({ ...asset, ...patch });
}

/* ------------------------------------------------------------------ */
/* Stats / analytics hooks                                             */
/* ------------------------------------------------------------------ */

export async function bumpAssetViews(id: string, amount = 1): Promise<void> {
  await mutateCollection<Asset, void>(KEYS.assets, (assets) => {
    const index = assets.findIndex((item) => item.id === id);
    if (index === -1) return { result: undefined };
    const copy = assets.slice();
    copy[index] = { ...copy[index], stats: { ...copy[index].stats, views: copy[index].stats.views + amount } };
    return { next: copy, result: undefined };
  });
}

/**
 * Records a sale in the asset's statistics.
 *
 * Deliberately does **not** touch `status`: merely *offering* an exclusive tier
 * must not delist a work. The work only leaves the shop when an exclusive
 * licence is actually sold (`fulfillOrder`), and returns on refund.
 */
export async function recordAssetSale(id: string, price: PricePair): Promise<void> {
  await mutateCollection<Asset, void>(KEYS.assets, (assets) => {
    const index = assets.findIndex((item) => item.id === id);
    if (index === -1) return { result: undefined };
    const copy = assets.slice();
    const current = copy[index];
    copy[index] = {
      ...current,
      stats: {
        ...current.stats,
        sales: current.stats.sales + 1,
        revenue: { fa: current.stats.revenue.fa + price.fa, en: current.stats.revenue.en + price.en },
        lastSaleAt: new Date().toISOString(),
      },
    };
    return { next: copy, result: undefined };
  });
}

/* ------------------------------------------------------------------ */
/* Upload sessions                                                     */
/* ------------------------------------------------------------------ */

export interface CreateSessionInput {
  userId: string;
  artistId: string | null;
  filename: string;
  mime: string;
  sizeBytes: number;
  meta?: Partial<UploadSession["meta"]>;
  /** Deliverable this file is (PNG/JPG/preview/AI/PSD/SVG/EPS). */
  formatId?: ExportFormatId;
  /** Colour version this file belongs to. */
  colourwayId?: string;
  /** Name + swatch, used when the session introduces a new colourway. */
  colourway?: { name: Localized; hex: string } | null;
  /** Attach the finished file to an existing work (colourways 2..n). */
  attachToAssetId?: string | null;
}

export async function createUploadSession(input: CreateSessionInput): Promise<UploadSession> {
  /* The chosen format owns the extension (`ai`/`eps`/`psd` are reported through
     several MIME aliases), with the MIME table as the fallback. */
  const format = formatById(input.formatId);
  const ext = format?.ext ?? acceptedMasterMime(input.mime) ?? "bin";
  const sizeBytes = Math.max(0, Math.floor(input.sizeBytes));

  if (sizeBytes < minUploadBytes(input.formatId)) throw new Error("file_too_small");
  if (sizeBytes > MAX_MASTER_BYTES) throw new Error("file_too_large");

  const id = newId("upl");
  const provider = storageProvider();
  const multipart = sizeBytes >= MULTIPART_THRESHOLD_BYTES;
  const session: UploadSession = {
    id,
    userId: input.userId,
    artistId: input.artistId,
    filename: input.filename,
    mime: input.mime,
    sizeBytes,
    provider,
    /* The final key is minted at completion time (the asset id is created then).
       For chunked uploads `key` doubles as the staging prefix the client PUTs to. */
    key: multipart ? stagingPrefix(id) : stagedMasterKey(id, ext),
    mode: multipart ? "multipart" : "single",
    partSize: MULTIPART_PART_SIZE,
    parts: [],
    staging: multipart ? id : undefined,
    formatId: input.formatId,
    colourwayId: input.colourwayId,
    colourway: input.colourway
      ? { name: input.colourway.name, hex: sanitizeHex(input.colourway.hex) }
      : null,
    attachToAssetId: input.attachToAssetId ?? null,
    meta: {
      title: input.meta?.title ?? { fa: input.filename, en: input.filename },
      description: input.meta?.description ?? { fa: "", en: "" },
      kind: input.meta?.kind ?? "pattern",
      tags: input.meta?.tags ?? [],
      familyId: input.meta?.familyId ?? null,
      patternId: input.meta?.patternId ?? null,
      tiers: input.meta?.tiers ?? defaultTiers(),
    },
    status: "open",
    createdAt: new Date().toISOString(),
  };

  await mutateCollection<UploadSession, void>(KEYS.uploads, (sessions) => ({
    next: [...sessions, session],
    result: undefined,
  }));
  return session;
}

export async function getUploadSessions(userId?: string): Promise<UploadSession[]> {
  const sessions = await readCollection<UploadSession>(KEYS.uploads);
  const filtered = userId ? sessions.filter((session) => session.userId === userId) : sessions;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getUploadSession(id: string): Promise<UploadSession | null> {
  const sessions = await readCollection<UploadSession>(KEYS.uploads);
  return sessions.find((session) => session.id === id) ?? null;
}

export async function getOpenUploadSession(id: string, userId: string): Promise<UploadSession | null> {
  const session = await getUploadSession(id);
  if (!session || session.status !== "open" || session.userId !== userId) return null;
  return session;
}

/** Records a completed part (multipart) and returns the updated session. */
export async function recordUploadPart(
  id: string,
  partNumber: number,
  bytes: number,
  etag: string,
): Promise<UploadSession | null> {
  return mutateCollection<UploadSession, UploadSession | null>(KEYS.uploads, (sessions) => {
    const index = sessions.findIndex((session) => session.id === id);
    if (index === -1) return { result: null };
    const session = sessions[index];
    const parts = [...session.parts.filter((part) => part.partNumber !== partNumber), { partNumber, bytes, etag }].sort(
      (a, b) => a.partNumber - b.partNumber,
    );
    const updated: UploadSession = { ...session, parts };
    const copy = sessions.slice();
    copy[index] = updated;
    return { next: copy, result: updated };
  });
}

export async function abortUploadSession(id: string): Promise<void> {
  await mutateCollection<UploadSession, void>(KEYS.uploads, (sessions) => ({
    next: sessions.map((session) => (session.id === id ? { ...session, status: "aborted" as const } : session)),
    result: undefined,
  }));
}

export interface CompleteUploadOptions {
  /** Final bytes (single-part sessions) — omitted for multipart, which reads staging parts. */
  buffer?: Buffer;
  /** Called with progress notes so the route can stream a status log if needed. */
  onStage?: (stage: string) => void;
}

export interface CompletedUpload {
  asset: Asset;
  scan: Asset["scan"];
  seamless: SeamlessReport;
}

/**
 * Turns an upload session into an asset: stores the master privately, scans it,
 * builds watermarked derivatives and parks it in the admin review queue.
 *
 * Throws (and leaves the session open) when the scan is unclean, so nothing
 * dangerous ever reaches the review queue.
 */
export async function completeUpload(
  session: UploadSession,
  options: CompleteUploadOptions = {},
): Promise<CompletedUpload> {
  const onStage = options.onStage ?? (() => undefined);
  /* The format the artist picked wins; a legacy client without one falls back to
     sniffing the file name, so old bookmarklets/scripts keep working. */
  const formatId: ExportFormatId = session.formatId ?? detectFormat(session.filename, session.mime)?.id ?? "png";
  const ext = formatById(formatId)?.ext ?? acceptedMasterMime(session.mime) ?? "bin";
  const colourwayId = session.colourwayId ?? DEFAULT_COLOURWAY_ID;

  onStage("storing_master");
  /* The first file of a work mints the asset id; every later file is stored
     inside the asset it belongs to (`private/masters/<assetId>/<colourway>/…`). */
  const assetId = session.attachToAssetId ?? newId("ast");
  const masterStoredKey = session.attachToAssetId
    ? deliverableKey(assetId, colourwayId, formatId, Date.now().toString(36), ext)
    : masterKey(assetId, ext);

  let masterBuffer: Buffer;
  if (session.mode === "single") {
    if (!options.buffer) throw new Error("missing_body");
    masterBuffer = options.buffer;
    await putBuffer(masterStoredKey, masterBuffer, formatStoredMime(formatId));
  } else {
    const { assembleParts, getBuffer: readObject } = await import("./storage");
    const partNumbers = session.parts
      .map((part) => part.partNumber)
      .sort((a, b) => a - b);
    if (!partNumbers.length) throw new Error("no_parts");
    await assembleParts(session.id, partNumbers, masterStoredKey, formatStoredMime(formatId));
    masterBuffer = await readObject(masterStoredKey);
  }

  if (masterBuffer.byteLength < minUploadBytes(formatId)) {
    await deleteObject(masterStoredKey).catch(() => undefined);
    throw Object.assign(new Error("file_too_small"), { minBytes: minUploadBytes(formatId) });
  }

  /* The extension and the MIME come from the client — the header does not. */
  if (!verifyFileSignature(formatId, masterBuffer)) {
    await deleteObject(masterStoredKey).catch(() => undefined);
    throw Object.assign(new Error("invalid_signature"), { formatId });
  }

  onStage("scanning");
  const scan = await scanBuffer(masterBuffer, session.filename);

  if (scan.status === "infected") {
    await deleteObject(masterStoredKey).catch(() => undefined);
    throw Object.assign(new Error("infected"), { scan });
  }

  /* ---------- colourway 2..n: attach the file to an existing work ---------- */
  if (session.attachToAssetId) {
    return attachUploadToAsset(session, {
      assetId,
      formatId,
      colourwayId,
      key: masterStoredKey,
      buffer: masterBuffer,
      scan,
    });
  }

  onStage("derivatives");
  let derivation: Awaited<ReturnType<typeof buildDerivatives>> | null = null;
  try {
    derivation = await buildDerivatives({
      assetId,
      master: masterBuffer,
      watermarkLines: WATERMARK_LINES,
      cornerTag: cornerTagFor(assetId),
    });
  } catch (error) {
    // Imaging is best-effort: a TIFF/PDF master still becomes a reviewable asset.
    console.error("[marketplace] derivative generation failed:", error);
  }

  const size = formatById(formatId)?.raster ? await readImageSize(masterBuffer) : null;
  const colourway: Colourway = {
    id: colourwayId,
    name: session.colourway?.name ?? { fa: "رنگ اصلی", en: "Original" },
    hex: sanitizeHex(session.colourway?.hex),
    files: [
      {
        id: newId("asf"),
        formatId,
        key: masterStoredKey,
        provider: session.provider,
        filename: session.filename,
        mime: formatStoredMime(formatId),
        sizeBytes: masterBuffer.byteLength,
        sha256: sha256(masterBuffer),
        width: size?.width,
        height: size?.height,
        cover: formatId === "preview" || undefined,
        uploadedAt: new Date().toISOString(),
      },
    ],
    previewKey: derivation?.previewKey ?? null,
    order: 0,
    createdAt: new Date().toISOString(),
  };

  const asset: Asset = {
    id: assetId,
    ownerUserId: session.userId,
    artistId: session.artistId,
    patternId: session.meta.patternId ?? null,
    title: session.meta.title,
    slug: await uniqueAssetSlug(session.meta.title.en || session.meta.title.fa || session.filename, assetId),
    description: session.meta.description,
    kind: session.meta.kind,
    tags: session.meta.tags,
    familyId: session.meta.familyId ?? null,
    master: {
      key: masterStoredKey,
      provider: session.provider,
      filename: session.filename,
      sizeBytes: masterBuffer.byteLength,
      mime: formatStoredMime(formatId),
      sha256: sha256(masterBuffer),
      uploadedAt: new Date().toISOString(),
    },
    colourways: [colourway],
    previewKey: derivation?.previewKey,
    tileKey: derivation?.tileKey,
    derivatives: derivation?.derivatives ?? [],
    mockups: derivation?.mockups ?? [],
    seamless:
      derivation?.seamless ??
      ({
        score: 0,
        verdict: "not-seamless",
        edgeDelta: 0,
        baselineDelta: 0,
        width: 0,
        height: 0,
        tileable: false,
        checkedAt: new Date().toISOString(),
        engine: "heuristic",
        note: "image analysis unavailable for this file type",
      } satisfies SeamlessReport),
    scan,
    tiers: session.meta.tiers?.length ? session.meta.tiers : defaultTiers(),
    status: scan.status === "suspicious" ? "pending_review" : "pending_review",
    visibility: "private",
    review: {},
    stats: { views: 0, sales: 0, revenue: { fa: 0, en: 0 } },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await mutateCollection<Asset, void>(KEYS.assets, (assets) => ({ next: [...assets, asset], result: undefined }));
  await mutateCollection<UploadSession, void>(KEYS.uploads, (sessions) => ({
    next: sessions.map((item) =>
      item.id === session.id
        ? { ...item, status: "completed" as const, completedAt: new Date().toISOString(), assetId: asset.id }
        : item,
    ),
    result: undefined,
  }));

  const fileCount = 1;
  void fileCount;
  return { asset, scan, seamless: asset.seamless };
}

/* ------------------------------------------------------------------ */
/* Colourways & formats of an existing work                            */
/* ------------------------------------------------------------------ */

interface AttachInput {
  assetId: string;
  formatId: ExportFormatId;
  colourwayId: string;
  key: string;
  buffer: Buffer;
  scan: ScanReport;
}

/**
 * Adds one deliverable (colourway + format) to a work that already exists.
 *
 * The file is scanned and stored exactly like a master, the colourway is created
 * on first use, a watermarked preview is rendered for the new colour so the shop
 * can show it, and every replaced file is removed from storage. A published work
 * that gains files goes back to `pending_review` — the admin reviews what will
 * actually be delivered.
 */
export async function attachUploadToAsset(session: UploadSession, input: AttachInput): Promise<CompletedUpload> {
  const assets = await getAssets();
  const asset = assets.find((item) => item.id === input.assetId);
  if (!asset) {
    await deleteObject(input.key).catch(() => undefined);
    throw new Error("asset_not_found");
  }
  if (asset.ownerUserId && asset.ownerUserId !== session.userId) {
    await deleteObject(input.key).catch(() => undefined);
    throw new Error("forbidden");
  }
  if (asset.status === "sold_exclusive" || asset.status === "delisted") {
    await deleteObject(input.key).catch(() => undefined);
    throw new Error("asset_locked");
  }

  const raster = formatById(input.formatId)?.raster === true && input.formatId !== "preview";
  const size = raster ? await readImageSize(input.buffer) : null;
  const now = new Date().toISOString();
  const file: ColourwayFile = {
    id: newId("asf"),
    formatId: input.formatId,
    key: input.key,
    provider: session.provider,
    filename: session.filename,
    mime: formatStoredMime(input.formatId),
    sizeBytes: input.buffer.byteLength,
    sha256: sha256(input.buffer),
    width: size?.width,
    height: size?.height,
    cover: input.formatId === "preview" || undefined,
    uploadedAt: now,
  };

  const existing = asset.colourways ?? [];
  const index = existing.findIndex((colourway) => colourway.id === input.colourwayId);
  const previous = index >= 0 ? existing[index] : null;
  const replaced = previous?.files.filter((item) => item.formatId === input.formatId) ?? [];

  /* A raster file or a custom cover gives this colour its public preview. */
  let previewKey = previous?.previewKey ?? null;
  let previewName: string | null = null;
  if ((raster || input.formatId === "preview") && (input.formatId !== "preview" || !previewKey)) {
    try {
      const preview = await renderColourwayPreview(input.buffer, { assetId: asset.id });
      previewName = `colourway-${input.colourwayId.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40)}-${Date.now().toString(36)}.jpg`;
      await putBuffer(derivedKey(asset.id, previewName), preview.buffer, "image/jpeg");
      previewKey = derivedKey(asset.id, previewName);
    } catch (error) {
      console.error("[marketplace] colourway preview failed:", error);
    }
  }

  const colourway: Colourway = {
    id: input.colourwayId,
    name: session.colourway?.name ?? previous?.name ?? { fa: "رنگ اصلی", en: "Original" },
    hex: sanitizeHex(session.colourway?.hex ?? previous?.hex),
    files: [...(previous?.files ?? []).filter((item) => item.formatId !== input.formatId), file],
    previewKey,
    order: previous?.order ?? existing.length,
    createdAt: previous?.createdAt ?? now,
  };

  const colourways = index >= 0 ? existing.map((item, at) => (at === index ? colourway : item)) : [...existing, colourway];
  const isPrimary = colourways[0]?.id === colourway.id;

  const updated: Asset = await saveAsset({
    ...asset,
    colourways,
    /* The first colourway drives the storefront cover and the hero preview. */
    previewKey: isPrimary && previewKey ? previewKey : asset.previewKey,
    master:
      !asset.master || asset.master.mime === "" || !isRasterMime(asset.master.mime)
        ? raster
          ? {
              key: input.key,
              provider: session.provider,
              filename: session.filename,
              sizeBytes: input.buffer.byteLength,
              mime: formatStoredMime(input.formatId),
              sha256: sha256(input.buffer),
              width: size?.width,
              height: size?.height,
              uploadedAt: now,
            }
          : asset.master
        : asset.master,
    /* A published work with new files must be reviewed again before it sells. */
    status: asset.status === "approved" ? "pending_review" : asset.status,
    review: asset.status === "approved" ? { ...asset.review, filesUpdatedAt: now } : asset.review,
    updatedAt: now,
  });

  for (const file of replaced) {
    if (file.key !== input.key) await deleteObject(file.key).catch(() => undefined);
  }
  await mutateCollection<UploadSession, void>(KEYS.uploads, (sessions) => ({
    next: sessions.map((item) =>
      item.id === session.id
        ? { ...item, status: "completed" as const, completedAt: now, assetId: updated.id }
        : item,
    ),
    result: undefined,
  }));

  return { asset: updated, scan: input.scan, seamless: updated.seamless };
}

function isRasterMime(mime: string): boolean {
  return mime.startsWith("image/") && !mime.includes("svg");
}

/** Formats already delivered by a work — used by the uploader and the studio. */
export function assetFormatSet(asset: Asset): Set<string> {
  const set = new Set<string>();
  for (const colourway of asset.colourways ?? []) {
    for (const file of colourway.files) set.add(file.formatId);
  }
  return set;
}

/* ------------------------------------------------------------------ */
/* Royalty helpers                                                     */
/* ------------------------------------------------------------------ */

export async function artistSharePct(artistId: string | null): Promise<number> {
  if (!artistId) return 0;
  const { getContent } = await import("@/lib/data/store");
  const content = await getContent();
  const artist = content.artists.find((item) => item.id === artistId);
  return artist?.revenueSharePct ?? DEFAULT_ARTIST_SHARE_PCT;
}

export async function artistDisplayName(artistId: string | null): Promise<Localized> {
  if (!artistId) return { fa: "رزی آتلیه", en: "Rosie Atelier" };
  const { getContent } = await import("@/lib/data/store");
  const content = await getContent();
  const artist = content.artists.find((item) => item.id === artistId);
  return artist?.name ?? { fa: "هنرمند ناشناس", en: "Unknown artist" };
}

/* ------------------------------------------------------------------ */
/* Simple platform settings (VAT toggle, default share…)               */
/* ------------------------------------------------------------------ */

export interface MarketplaceSettings {
  vatPct: number;
  artistSharePct: number;
  affiliatePct: number;
  /** Default discount handed to buyers through an affiliate code. */
  affiliateDiscountPct: number;
  payoutMinimumFa: number;
  payoutMinimumEn: number;
  autoApproveSeamless: boolean;
  emailOnSale: boolean;
}

const DEFAULT_SETTINGS: MarketplaceSettings = {
  vatPct: Number(process.env.MARKETPLACE_VAT_PCT ?? 9),
  artistSharePct: DEFAULT_ARTIST_SHARE_PCT,
  affiliatePct: Number(process.env.MARKETPLACE_AFFILIATE_PCT ?? 10),
  affiliateDiscountPct: Number(process.env.MARKETPLACE_AFFILIATE_DISCOUNT_PCT ?? 10),
  payoutMinimumFa: Number(process.env.MARKETPLACE_MIN_PAYOUT_TOMAN ?? 500_000),
  payoutMinimumEn: Number(process.env.MARKETPLACE_MIN_PAYOUT_USD ?? 25),
  autoApproveSeamless: false,
  emailOnSale: true,
};

export async function getSettings(): Promise<MarketplaceSettings> {
  return readDoc<MarketplaceSettings>(KEYS.settings, DEFAULT_SETTINGS);
}

export async function saveSettings(patch: Partial<MarketplaceSettings>): Promise<MarketplaceSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await writeDoc(KEYS.settings, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* License serials                                                     */
/* ------------------------------------------------------------------ */

export async function nextLicenseSerial(series = "LIC"): Promise<string> {
  const sequence = await nextSequence("license");
  const year = new Date().getUTCFullYear();
  return `RA-${series}-${year}-${String(sequence).padStart(6, "0")}`;
}

/* ------------------------------------------------------------------ */
/* Ledger                                                              */
/* ------------------------------------------------------------------ */

export async function appendLedger(entry: Omit<LedgerEntry, "id" | "createdAt">): Promise<LedgerEntry> {
  const record: LedgerEntry = { ...entry, id: newId("led"), createdAt: new Date().toISOString() };
  await mutateCollection<LedgerEntry, void>(KEYS.ledger, (items) => ({ next: [...items, record], result: undefined }));
  return record;
}

export async function getLedger(artistId?: string): Promise<LedgerEntry[]> {
  const entries = await readCollection<LedgerEntry>(KEYS.ledger);
  const filtered = artistId ? entries.filter((entry) => entry.artistId === artistId) : entries;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Sums a ledger slice into a `{fa,en}` balance. */
export function ledgerBalance(entries: LedgerEntry[]): PricePair {
  return entries.reduce<PricePair>(
    (acc, entry) => ({ fa: acc.fa + entry.amount.fa, en: acc.en + entry.amount.en }),
    { fa: 0, en: 0 },
  );
}

export { refundPrice };
