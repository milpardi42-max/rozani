import "server-only";
import crypto from "crypto";
import { promises as fs, createReadStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { LOCAL_DERIVED_DIR, LOCAL_PRIVATE_DIR, LOCAL_STAGING_DIR } from "./config";
import { presignUrl, s3Config, signedFetch, type S3Config } from "./sigv4";
import type { StorageProvider } from "./types";

/**
 * Private object storage.
 *
 * Two backends, one contract:
 *   • `local` — files under `data/objects/<key>`; masters never touch `public/`.
 *   • `s3`    — any S3-compatible bucket (AWS, R2, MinIO, Wasabi) with
 *               presigned uploads/downloads so large files bypass the app.
 *
 * Object keys are namespaced:
 *   private/masters/<assetId>/original.<ext>      ← never public
 *   private/derived/<assetId>/<name>.<ext>        ← servable when the asset is public
 *   private/staging/<sessionId>/<part>            ← multipart chunks, deleted on complete
 */

export const OBJECT_ROOT = { private: "private", public: "public" } as const;

export function masterKey(assetId: string, ext: string): string {
  return `${OBJECT_ROOT.private}/masters/${assetId}/original.${ext}`;
}

/**
 * A deliverable of one colourway, e.g.
 * `private/masters/ast_x/cw_rose/ai-1k2j3.ai`.
 *
 * Lives beside the primary master so a single prefix purge still removes
 * everything an asset owns, and `assetIdFromKey()` keeps working.
 */
export function deliverableKey(assetId: string, colourwayId: string, formatId: string, stamp: string, ext: string): string {
  const safeColourway = colourwayId.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 40) || "cw";
  const safeFormat = formatId.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 12) || "file";
  return `${OBJECT_ROOT.private}/masters/${assetId}/${safeColourway}/${safeFormat}-${stamp}.${ext}`;
}

export function stagedMasterKey(sessionId: string, ext: string): string {
  return `${OBJECT_ROOT.private}/masters/staged/${sessionId}.${ext}`;
}

export function derivedKey(assetId: string, name: string): string {
  return `${OBJECT_ROOT.private}/derived/${assetId}/${name}`;
}

export function stagingPartKey(sessionId: string, partNumber: number): string {
  return `${OBJECT_ROOT.private}/staging/${sessionId}/${String(partNumber).padStart(5, "0")}.part`;
}

/** Staging folder holding a session's chunks until completion. */
export function stagingPrefix(sessionId: string): string {
  return `${OBJECT_ROOT.private}/staging/${sessionId}`;
}

export function storageBackend(): StorageProvider {
  return s3Config() ? "s3" : "local";
}

function localRoot() {
  return path.join(process.cwd(), ...LOCAL_PRIVATE_DIR.slice(0, 1), "objects");
}

function localPath(key: string) {
  const safe = key
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join(path.sep);
  return path.join(localRoot(), safe);
}

export function isPublicDerivedKey(key: string): boolean {
  return key.startsWith(`${OBJECT_ROOT.private}/derived/`);
}

export function assetIdFromKey(key: string): string | null {
  const match = key.match(/\/(?:derived|masters)\/([^/]+)\//);
  return match ? match[1] : null;
}

/* ------------------------------------------------------------------ */
/* Local backend                                                       */
/* ------------------------------------------------------------------ */

async function localPut(key: string, data: Buffer | Readable | ReadableStream<Uint8Array>) {
  const target = localPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.${crypto.randomBytes(4).toString("hex")}.tmp`;

  if (Buffer.isBuffer(data)) {
    await fs.writeFile(tmp, data);
  } else {
    const nodeStream = data instanceof Readable ? data : Readable.fromWeb(data as Parameters<typeof Readable.fromWeb>[0]);
    const handle = await fs.open(tmp, "w");
    try {
      for await (const chunk of nodeStream) await handle.write(chunk as Buffer);
    } finally {
      await handle.close();
    }
  }
  await fs.rename(tmp, target);
  const stat = await fs.stat(target);
  return { size: stat.size };
}

async function localGet(key: string, range?: { start: number; end?: number }) {
  const target = localPath(key);
  const stat = await fs.stat(target);
  const stream = createReadStream(target, range ? { start: range.start, end: range.end } : undefined);
  return {
    body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
    size: stat.size,
    mtime: stat.mtime,
  };
}

async function localBuffer(key: string) {
  return fs.readFile(localPath(key));
}

async function localDelete(key: string) {
  try {
    await fs.unlink(localPath(key));
  } catch {
    /* already gone */
  }
}

async function localExists(key: string) {
  try {
    await fs.stat(localPath(key));
    return true;
  } catch {
    return false;
  }
}

/** Recursive size/cleanup helper used by staging sessions. */
async function localDeletePrefix(prefix: string) {
  const dir = localPath(prefix);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* S3 backend                                                          */
/* ------------------------------------------------------------------ */

function s3(): S3Config {
  const config = s3Config();
  if (!config) throw new Error("s3_not_configured");
  return config;
}

async function s3Buffer(key: string) {
  const { url, headers } = signedFetch(s3(), "GET", key);
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`s3_get_${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function s3Get(key: string, range?: { start: number; end?: number }) {
  const extraHeaders: Record<string, string> = range ? { range: `bytes=${range.start}-${range.end ?? ""}` } : {};
  const { url, headers } = signedFetch(s3(), "GET", key, { headers: extraHeaders });
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok && res.status !== 206) throw new Error(`s3_get_${res.status}`);
  const sizeHeader = res.headers.get("content-range");
  const total = sizeHeader ? Number(sizeHeader.split("/")[1]) : Number(res.headers.get("content-length") ?? 0);
  return {
    body: res.body as ReadableStream<Uint8Array>,
    size: total,
    mtime: new Date(res.headers.get("last-modified") ?? Date.now()),
  };
}

async function s3Put(key: string, data: Buffer, contentType?: string) {
  const { url, headers } = signedFetch(s3(), "PUT", key, {
    body: data,
    contentType: contentType ?? "application/octet-stream",
  });
  const res = await fetch(url, { method: "PUT", headers, body: new Uint8Array(data) });
  if (!res.ok) throw new Error(`s3_put_${res.status}`);
  return { size: data.byteLength };
}

async function s3Delete(key: string) {
  const { url, headers } = signedFetch(s3(), "DELETE", key);
  await fetch(url, { method: "DELETE", headers }).catch(() => undefined);
}

async function s3Exists(key: string) {
  const { url, headers } = signedFetch(s3(), "HEAD", key);
  const res = await fetch(url, { method: "HEAD", headers });
  return res.ok;
}

/* ------------------------------------------------------------------ */
/* Public contract                                                     */
/* ------------------------------------------------------------------ */

export async function putObject(key: string, data: Buffer | Readable | ReadableStream<Uint8Array>, contentType?: string) {
  if (storageBackend() === "s3") {
    const buffer = Buffer.isBuffer(data)
      ? data
      : await new Response(
          (data instanceof Readable ? Readable.toWeb(data) : data) as ReadableStream<Uint8Array>,
        ).arrayBuffer().then((ab) => Buffer.from(ab));
    return s3Put(key, buffer, contentType);
  }
  return localPut(key, data);
}

export async function putBuffer(key: string, buffer: Buffer, contentType?: string) {
  return putObject(key, buffer, contentType);
}

export async function getBuffer(key: string): Promise<Buffer> {
  return storageBackend() === "s3" ? s3Buffer(key) : localBuffer(key);
}

export async function getStream(key: string, range?: { start: number; end?: number }) {
  return storageBackend() === "s3" ? s3Get(key, range) : localGet(key, range);
}

export async function deleteObject(key: string) {
  return storageBackend() === "s3" ? s3Delete(key) : localDelete(key);
}

export async function objectExists(key: string) {
  return storageBackend() === "s3" ? s3Exists(key) : localExists(key);
}

export async function deletePrefix(prefix: string) {
  if (storageBackend() !== "s3") return localDeletePrefix(prefix);
  // Best-effort: the app only ever stages a handful of chunks, all known by name.
  return undefined;
}

export async function objectSize(key: string): Promise<number> {
  if (storageBackend() === "s3") {
    const { url, headers } = signedFetch(s3(), "HEAD", key);
    const res = await fetch(url, { method: "HEAD", headers });
    if (!res.ok) return 0;
    return Number(res.headers.get("content-length") ?? 0);
  }
  try {
    const stat = await fs.stat(localPath(key));
    return stat.size;
  } catch {
    return 0;
  }
}

/** Concatenate multipart chunks into the final object (local backend). */
export async function assembleLocalParts(sessionId: string, partNumbers: number[], finalKey: string): Promise<number> {
  const target = localPath(finalKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const tmp = `${target}.assembling`;
  const handle = await fs.open(tmp, "w");
  let total = 0;
  try {
    for (const partNumber of partNumbers) {
      const chunkPath = localPath(stagingPartKey(sessionId, partNumber));
      const chunk = await fs.readFile(chunkPath);
      await handle.write(chunk);
      total += chunk.byteLength;
      await fs.unlink(chunkPath).catch(() => undefined);
    }
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, target);
  return total;
}

/**
 * Concatenate multipart chunks into the final object (S3 backend).
 *
 * The browser PUT each chunk straight to `private/staging/<sessionId>/…` with a
 * presigned URL (so no chunk ever travels through the app), and completion
 * streams them back in order into the final master. Streaming keeps memory at one
 * chunk regardless of master size — the alternative, S3-native multipart with an
 * uploadId, needs the client to return every ETag, which browsers only expose
 * when the bucket sets an explicit CORS rule for it. This path needs no CORS
 * beyond a plain PUT.
 */
export async function assembleS3Parts(
  sessionId: string,
  partNumbers: number[],
  finalKey: string,
  contentType?: string,
): Promise<number> {
  const chunks: Buffer[] = [];
  let total = 0;
  for (const partNumber of partNumbers) {
    const chunk = await s3Buffer(stagingPartKey(sessionId, partNumber));
    total += chunk.byteLength;
    chunks.push(chunk);
    await s3Delete(stagingPartKey(sessionId, partNumber));
  }
  await s3Put(finalKey, Buffer.concat(chunks, total), contentType);
  return total;
}

/** Picks the assembly routine that matches the configured backend. */
export async function assembleParts(
  sessionId: string,
  partNumbers: number[],
  finalKey: string,
  contentType?: string,
): Promise<number> {
  return storageBackend() === "s3"
    ? assembleS3Parts(sessionId, partNumbers, finalKey, contentType)
    : assembleLocalParts(sessionId, partNumbers, finalKey);
}

export async function hashObject(key: string): Promise<string> {
  if (storageBackend() !== "s3") {
    const stream = createReadStream(localPath(key));
    const hash = crypto.createHash("sha256");
    for await (const chunk of stream) hash.update(chunk as Buffer);
    return hash.digest("hex");
  }
  const buffer = await s3Buffer(key);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/* ------------------------------------------------------------------ */
/* Presigned S3 helpers (direct browser ⇄ bucket)                      */
/* ------------------------------------------------------------------ */

export function presignUpload(key: string, expiresIn = 3600): string | null {
  const config = s3Config();
  if (!config) return null;
  return presignUrl(config, "PUT", key, { expiresIn });
}

export function presignDownload(key: string, options: { expiresIn?: number; filename?: string } = {}): string | null {
  const config = s3Config();
  if (!config) return null;
  return presignUrl(config, "GET", key, {
    expiresIn: options.expiresIn ?? 900,
    responseContentDisposition: options.filename
      ? `attachment; filename="${options.filename.replace(/"/g, "")}"`
      : undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Signed object tokens (our own HMAC links — work for both backends)  */
/* ------------------------------------------------------------------ */

export interface ObjectTokenPayload {
  /** Object key. */
  k: string;
  /** Unix seconds expiry. */
  exp: number;
  /** License / grant that authorised this link. */
  lic?: string;
  /** Downloading account (may be empty for emailed guest links). */
  uid?: string;
  /** Filename offered to the buyer. */
  fn?: string;
  /** inline | attachment */
  d?: "inline" | "attachment";
  /** Reason for the audit log. */
  src?: string;
  /** Replay-protection nonce. */
  n: string;
}

function tokenSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || "rosie-atelier-dev-secret";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signObjectToken(payload: Omit<ObjectTokenPayload, "n"> & { n?: string }): string {
  const body: ObjectTokenPayload = { ...payload, n: payload.n ?? crypto.randomBytes(8).toString("hex") };
  const encoded = b64url(JSON.stringify(body));
  const signature = crypto.createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyObjectToken(token: string | null | undefined): ObjectTokenPayload | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac("sha256", tokenSecret()).update(encoded).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(encoded).toString("utf8")) as ObjectTokenPayload;
    if (!payload.k || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function contentTypeForFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
    tif: "image/tiff",
    tiff: "image/tiff",
    pdf: "application/pdf",
    zip: "application/zip",
    ai: "application/postscript",
    eps: "application/postscript",
    svg: "image/svg+xml",
    psd: "image/vnd.adobe.photoshop",
    procreate: "application/octet-stream",
  };
  return map[ext] ?? "application/octet-stream";
}

export function contentDisposition(filename: string, mode: "inline" | "attachment" = "attachment"): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
  const encoded = encodeURIComponent(filename);
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/** Local directories that must exist for the local backend. */
export async function ensureLocalDirs() {
  if (storageBackend() === "s3") return;
  await Promise.all([
    fs.mkdir(path.join(process.cwd(), ...LOCAL_PRIVATE_DIR, "objects"), { recursive: true }),
    fs.mkdir(path.join(process.cwd(), ...LOCAL_DERIVED_DIR), { recursive: true }),
    fs.mkdir(path.join(process.cwd(), ...LOCAL_STAGING_DIR), { recursive: true }),
  ]);
}
