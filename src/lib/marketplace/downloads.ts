import "server-only";
import { DOWNLOAD_TOKEN_TTL_S, MAX_MASTER_BYTES, siteUrl } from "./config";
import { KEYS, mutateCollection, readCollection } from "./store";
import { getLicense, getSubscriptionForUser } from "./orders";
import { getAsset } from "./assets";
import { getPlan } from "./config";
import {
  contentDisposition,
  getStream,
  objectExists,
  presignDownload,
  signObjectToken,
  verifyObjectToken,
  type ObjectTokenPayload,
} from "./storage";
import { assetDeliverables, assetDownloadableKeys, type DeliverableRef } from "./colourways";
import { formatById, type DeliverableFormatId } from "./formats";
import type { Asset, ColourwayFile, License } from "./types";

/**
 * Signed, audited downloads.
 *
 * A license never exposes a storage URL. Instead:
 *
 *   1. `createDownloadToken(license)` — HMAC-signed token (15 min by default)
 *      that names the license, the buyer and the object key.
 *   2. `GET /api/marketplace/download?token=…` — verifies the signature and
 *      expiry, checks the license is still active and under its download quota,
 *      records the download on the license, then streams the master (local
 *      backend) or 302s to a freshly presigned bucket URL (S3 backend).
 *
 * Emailed links reuse the same machinery with a longer TTL and `src: "email"`,
 * so the tenant stays auditable either way.
 */

export interface DownloadTokenOptions {
  /** Override the TTL (seconds). */
  ttl?: number;
  /** inline vs attachment */
  disposition?: "inline" | "attachment";
  /** Audit trail: where the link came from. */
  source?: "account" | "email" | "api" | "admin";
  /** Override the file name offered to the buyer. */
  filename?: string;
  /**
   * Which deliverable of the work this token unlocks. Omitted → the primary
   * master, which is what every pre-existing token does.
   */
  file?: ColourwayFile | null;
  /** Colourway a file belongs to, used only to name the download nicely. */
  colourwayName?: { fa: string; en: string } | null;
}

export interface ResolvedDownload {
  ok: true;
  license: License;
  asset: Asset;
  stream: { body: ReadableStream<Uint8Array>; size: number };
  filename: string;
  disposition: "inline" | "attachment";
  /** When the backend is S3 we hand back a presigned URL instead of streaming. */
  redirectUrl?: string;
}

export type DownloadError =
  | "invalid_token"
  | "expired"
  | "license_missing"
  | "license_revoked"
  | "quota_exceeded"
  | "asset_missing"
  | "object_missing"
  | "storage_error"
  /** The token names a file that is not part of the licensed work. */
  | "file_forbidden";

/* ------------------------------------------------------------------ */
/* Token issuing                                                       */
/* ------------------------------------------------------------------ */

export function createDownloadToken(license: License, asset: Asset, options: DownloadTokenOptions = {}): string {
  const file = options.file ?? null;
  const filename =
    options.filename ??
    (file
      ? deliverableFilename(asset, {
          file,
          formatId: file.formatId as DeliverableFormatId,
          colourwayName: options.colourwayName ?? { fa: "", en: "" },
        })
      : masterFilename(asset));
  return signObjectToken({
    k: file?.key ?? asset.master.key,
    exp: Math.floor(Date.now() / 1000) + (options.ttl ?? DOWNLOAD_TOKEN_TTL_S),
    lic: license.id,
    uid: license.buyerUserId ?? undefined,
    fn: filename,
    d: options.disposition ?? "attachment",
    src: options.source ?? "account",
  });
}

export function buildDirectUrl(token: string): string {
  return `${siteUrl()}/api/marketplace/download?token=${encodeURIComponent(token)}`;
}

export function masterFilename(asset: Asset): string {
  const base = (asset.title.en || asset.title.fa || asset.slug)
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const ext = asset.master.filename.split(".").pop() ?? "bin";
  return `${base}-${asset.id.slice(-6)}.${ext}`;
}

/**
 * Name the buyer sees in their downloads folder: work, colour version and
 * format — `Quiet-Garden-rose-PSD.psd`. Falls back to the stored file name.
 */
export function deliverableFilename(asset: Asset, ref: Pick<DeliverableRef, "file" | "formatId" | "colourwayName">): string {
  const format = formatById(ref.formatId);
  const base = (asset.title.en || asset.title.fa || asset.slug)
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
  const colourway = (ref.colourwayName?.en || ref.colourwayName?.fa || "")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/-+/g, "-")
    .slice(0, 24);
  const suffix = [colourway, format?.label.en ?? ref.formatId].filter(Boolean).join("-");
  return `${[base, suffix].filter(Boolean).join("-")}.${format?.ext ?? "bin"}`;
}

/* ------------------------------------------------------------------ */
/* Quota                                                              */
/* ------------------------------------------------------------------ */

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
  canDownload: boolean;
}

export function licenseQuota(license: License): QuotaInfo {
  const limit = license.maxDownloads;
  const used = license.downloads.length;
  const unlimited = limit <= 0;
  return {
    used,
    limit,
    remaining: unlimited ? Number.POSITIVE_INFINITY : Math.max(0, limit - used),
    unlimited,
    canDownload: license.status === "active" && (unlimited || used < limit),
  };
}

/* ------------------------------------------------------------------ */
/* Redemption                                                          */
/* ------------------------------------------------------------------ */

export interface RedeemOptions {
  ip?: string;
  userAgent?: string;
  /** Account making the request (null for emailed guest links). */
  userId?: string | null;
}

export async function redeemDownloadToken(token: string, options: RedeemOptions = {}): Promise<ResolvedDownload | { ok: false; error: DownloadError; license?: License }> {
  const payload: ObjectTokenPayload | null = verifyObjectToken(token);
  if (!payload) return { ok: false, error: "invalid_token" };

  const license = payload.lic ? await getLicense(payload.lic) : null;
  if (!license) return { ok: false, error: "license_missing" };
  if (license.status !== "active") return { ok: false, error: "license_revoked", license };

  // Emailed links may be used by a guest, but an account-bound link must match.
  const bindingUserId = payload.uid;
  if (bindingUserId && options.userId && bindingUserId !== options.userId) {
    return { ok: false, error: "invalid_token", license };
  }

  const quota = licenseQuota(license);
  if (!quota.canDownload) return { ok: false, error: "quota_exceeded", license };

  const asset = await getAsset(license.assetId);
  if (!asset) return { ok: false, error: "asset_missing", license };

  /* A token may only name one of the work's own colourway files. The old
     `k = assetId` tokens from queued emails are remapped to the master. */
  const objectKey = payload.k && payload.k !== asset.id ? payload.k : asset.master.key;
  if (!assetDownloadableKeys(asset).has(objectKey)) {
    return { ok: false, error: "invalid_token", license };
  }

  const exists = await objectExists(objectKey);
  if (!exists) return { ok: false, error: "object_missing", license };

  // Record the download *before* streaming so a broken connection cannot be
  // replayed for free.
  const record = {
    at: new Date().toISOString(),
    ip: options.ip ?? "unknown",
    userAgent: (options.userAgent ?? "unknown").slice(0, 200),
    tokenId: `${payload.n}`,
  };
  await appendDownload(license.id, record);

  const filename = payload.fn ? `${payload.fn}` : masterFilename(asset);
  const disposition = payload.d === "inline" ? "inline" : "attachment";

  const objectSize = assetDeliverables(asset).find((item) => item.file.key === objectKey)?.file.sizeBytes ?? asset.master.sizeBytes;

  const presigned = presignDownload(objectKey, { expiresIn: DOWNLOAD_TOKEN_TTL_S, filename });
  if (presigned) {
    return { ok: true, license, asset, stream: { body: new ReadableStream(), size: objectSize }, filename, disposition, redirectUrl: presigned };
  }

  try {
    const stream = await getStream(objectKey);
    return { ok: true, license, asset, stream: { body: stream.body, size: stream.size }, filename, disposition };
  } catch {
    return { ok: false, error: "storage_error", license };
  }
}

export async function appendDownload(licenseId: string, record: License["downloads"][number]): Promise<License | null> {
  return mutateCollection<License, License | null>(KEYS.licenses, (items) => {
    const index = items.findIndex((item) => item.id === licenseId);
    if (index === -1) return { result: null };
    const updated: License = { ...items[index], downloads: [...items[index].downloads, record] };
    const copy = items.slice();
    copy[index] = updated;
    return { next: copy, result: updated };
  });
}

/* ------------------------------------------------------------------ */
/* Subscription downloads                                              */
/* ------------------------------------------------------------------ */

export interface SubscriptionGrant {
  ok: boolean;
  reason?: "no_subscription" | "quota_exhausted" | "not_covered" | "exclusive_excluded" | "already_licensed";
  license?: License;
  remaining?: number;
}

/**
 * Redeems one file with a subscription pass: returns an existing license when
 * the buyer already owns the work, otherwise burns one download from the pass.
 */
export async function redeemWithSubscription(input: {
  userId: string;
  assetId: string;
  tierId: string;
}): Promise<SubscriptionGrant> {
  const { getLicensesForUser, activateSubscription } = await import("./orders");
  const existing = (await getLicensesForUser(input.userId)).find((license) => license.assetId === input.assetId);
  if (existing && existing.status === "active") return { ok: true, license: existing, reason: "already_licensed" };

  const subscription = await getSubscriptionForUser(input.userId);
  if (!subscription) return { ok: false, reason: "no_subscription" };
  const plan = getPlan(subscription.planId);
  if (!plan) return { ok: false, reason: "no_subscription" };

  const asset = await getAsset(input.assetId);
  if (!asset) return { ok: false, reason: "not_covered" };
  const tier = asset.tiers.find((item) => item.id === input.tierId && item.enabled);
  if (!tier) return { ok: false, reason: "not_covered" };
  if (plan.excludesExclusive && tier.exclusive) return { ok: false, reason: "exclusive_excluded" };
  if (!plan.covers.includes(tier.kind)) return { ok: false, reason: "not_covered" };

  const unlimited = plan.downloadsPerMonth === 0;
  if (!unlimited && subscription.downloadsUsed >= plan.downloadsPerMonth) {
    return { ok: false, reason: "quota_exhausted" };
  }

  await mutateCollection<{ id: string; downloadsUsed: number }, void>(KEYS.subscriptions, (items) => ({
    next: items.map((item) =>
      item.id === subscription.id ? { ...item, downloadsUsed: item.downloadsUsed + 1 } : item,
    ),
    result: undefined,
  }));

  void activateSubscription;
  return {
    ok: true,
    remaining: unlimited ? Number.POSITIVE_INFINITY : plan.downloadsPerMonth - subscription.downloadsUsed - 1,
  };
}

/* ------------------------------------------------------------------ */
/* Download history (buyer + admin views)                              */
/* ------------------------------------------------------------------ */

export async function recentDownloads(limit = 100): Promise<{ license: License; record: License["downloads"][number] }[]> {
  const licenses = await readCollection<License>(KEYS.licenses);
  const flat = licenses.flatMap((license) => license.downloads.map((record) => ({ license, record })));
  return flat.sort((a, b) => new Date(b.record.at).getTime() - new Date(a.record.at).getTime()).slice(0, limit);
}

export function contentDispositionFor(filename: string, disposition: "inline" | "attachment") {
  return contentDisposition(filename, disposition);
}

export function maxUploadBytes() {
  return MAX_MASTER_BYTES;
}
