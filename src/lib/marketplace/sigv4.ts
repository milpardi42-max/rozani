import "server-only";
import crypto from "crypto";

/**
 * Minimal AWS Signature Version 4 signer — no SDK dependency.
 *
 * Used by the private S3-compatible object store for:
 *   • presigned GET  (buyer downloads straight from the bucket)
 *   • presigned PUT  (browser uploads one multipart chunk)
 *   • signed API calls (CreateMultipartUpload / CompleteMultipartUpload / HEAD / DELETE)
 *
 * Only the pieces S3 needs are implemented, and the algorithm follows the
 * published test vectors (see `scripts/verify-sigv4.mjs`).
 */

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  /** Custom endpoint (R2, MinIO, Wasabi…). Defaults to AWS S3. */
  endpoint?: string;
  forcePathStyle?: boolean;
}

export function s3Config(): S3Config | null {
  const bucket = process.env.MARKETPLACE_S3_BUCKET?.trim();
  const accessKeyId = process.env.MARKETPLACE_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.MARKETPLACE_S3_SECRET_ACCESS_KEY?.trim();
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    bucket,
    region: process.env.MARKETPLACE_S3_REGION?.trim() || "us-east-1",
    accessKeyId,
    secretAccessKey,
    sessionToken: process.env.MARKETPLACE_S3_SESSION_TOKEN?.trim() || undefined,
    endpoint: process.env.MARKETPLACE_S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.MARKETPLACE_S3_FORCE_PATH_STYLE === "1" || Boolean(process.env.MARKETPLACE_S3_ENDPOINT),
  };
}

const UNRESERVED = /[^A-Za-z0-9\-._~]/g;

/** RFC-3986 encoding as required by SigV4 (stricter than encodeURIComponent). */
function uriEncode(value: string, encodeSlash = true): string {
  const encoded = value.replace(UNRESERVED, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
  return encodeSlash ? encoded : encoded.replace(/%2F/g, "/");
}

function hex(buffer: Buffer | string): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function amzDates(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function hostAndPath(config: S3Config, key: string) {
  const endpoint = config.endpoint?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (config.forcePathStyle) {
    const host = endpoint ?? "s3.amazonaws.com";
    const basePath = endpoint ? "" : `/${config.bucket}`;
    return { host, canonicalPath: `${basePath}/${key}`.replace(/\/{2,}/g, "/"), scheme: "https" };
  }
  const host = endpoint ? `${config.bucket}.${endpoint}` : `${config.bucket}.s3.${config.region}.amazonaws.com`;
  return { host, canonicalPath: `/${key}`.replace(/\/{2,}/g, "/"), scheme: "https" };
}

interface CanonicalInput {
  method: string;
  canonicalPath: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  signedHeaders: string[];
  payloadHash: string;
}

function canonicalRequest(input: CanonicalInput): string {
  const sortedQuery = Object.keys(input.query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(input.query[k] ?? "")}`)
    .join("&");
  const canonicalHeaders = input.signedHeaders
    .map((h) => `${h}:${(input.headers[h] ?? "").trim().replace(/\s+/g, " ")}\n`)
    .join("");
  return [
    input.method,
    input.canonicalPath
      .split("/")
      .map((segment) => uriEncode(segment))
      .join("/"),
    sortedQuery,
    canonicalHeaders,
    input.signedHeaders.join(";"),
    input.payloadHash,
  ].join("\n");
}

function signingKey(config: S3Config, dateStamp: string) {
  return hmac(hmac(hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region), "s3"), "aws4_request");
}

const EMPTY_SHA256 = hex("");

/** Presign a URL the browser can hit directly (GET download / PUT chunk). */
export function presignUrl(
  config: S3Config,
  method: "GET" | "PUT" | "HEAD" | "DELETE",
  key: string,
  options: {
    expiresIn?: number;
    responseContentDisposition?: string;
    responseContentType?: string;
    extraQuery?: Record<string, string>;
  } = {},
): string {
  const { amzDate, dateStamp } = amzDates();
  const expiresIn = Math.min(Math.max(options.expiresIn ?? 900, 1), 7 * 24 * 3600);
  const { host, canonicalPath } = hostAndPath(config, key);

  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${dateStamp}/${config.region}/s3/aws4_request`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    ...(options.extraQuery ?? {}),
  };
  if (config.sessionToken) query["X-Amz-Security-Token"] = config.sessionToken;
  if (options.responseContentDisposition) query["response-content-disposition"] = options.responseContentDisposition;
  if (options.responseContentType) query["response-content-type"] = options.responseContentType;

  const signedHeaders = ["host"];
  const headers: Record<string, string> = { host };
  if (config.sessionToken) {
    query["X-Amz-Security-Token"] = config.sessionToken;
  }

  const request = canonicalRequest({
    method,
    canonicalPath,
    query,
    headers,
    signedHeaders,
    payloadHash: "UNSIGNED-PAYLOAD",
  });
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(request)].join("\n");
  const signature = crypto.createHmac("sha256", signingKey(config, dateStamp)).update(stringToSign, "utf8").digest("hex");

  query["X-Amz-Signature"] = signature;
  const qs = Object.keys(query)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(query[k] ?? "")}`)
    .join("&");
  return `https://${host}${canonicalPath.split("/").map((s) => uriEncode(s)).join("/")}?${qs}`;
}

/** Sign a live API request (server → S3). */
export function signedFetch(
  config: S3Config,
  method: string,
  key: string,
  options: { body?: Buffer | string; query?: Record<string, string>; contentType?: string; headers?: Record<string, string> } = {},
): { url: string; headers: Record<string, string> } {
  const { amzDate, dateStamp } = amzDates();
  const { host, canonicalPath } = hostAndPath(config, key);
  const body = options.body;
  const payloadHash = body === undefined || body === "" ? EMPTY_SHA256 : hex(body);

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(options.contentType ? { "content-type": options.contentType } : {}),
    ...(options.headers ?? {}),
  };
  if (config.sessionToken) headers["x-amz-security-token"] = config.sessionToken;

  const signedHeaders = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();

  const request = canonicalRequest({
    method,
    canonicalPath,
    query: options.query ?? {},
    headers,
    signedHeaders,
    payloadHash,
  });
  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, hex(request)].join("\n");
  const signature = crypto
    .createHmac("sha256", signingKey(config, dateStamp))
    .update(stringToSign, "utf8")
    .digest("hex");

  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`;

  const qs = Object.entries(options.query ?? {})
    .map(([k, v]) => `${uriEncode(k)}=${uriEncode(v)}`)
    .join("&");
  const url = `https://${host}${canonicalPath.split("/").map((s) => uriEncode(s)).join("/")}${qs ? `?${qs}` : ""}`;
  return { url, headers };
}

/** Exposed for the self-check script. */
export const __internals = { uriEncode, canonicalRequest, EMPTY_SHA256 };
