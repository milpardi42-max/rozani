/**
 * Browser side of the upload pipeline — the transport the uploader relies on.
 *
 * • every response is parsed defensively: a proxy's HTML error page (413, 502…)
 *   becomes a typed error instead of a JSON `SyntaxError`;
 * • transient failures (network drop, 408/429/5xx, a chunk that arrived damaged)
 *   are retried with backoff — permanent ones (wrong format, too large…) are not;
 * • files and chunks are hashed with SHA-256 so the server can prove it stored
 *   exactly the bytes the artist picked;
 * • form uploads go through XHR to report real byte progress.
 *
 * No server imports here: this module ships to the browser.
 */

import type { Locale } from "@/lib/i18n/types";

export class UploadError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    public readonly detail: Record<string, unknown> = {},
  ) {
    super(code);
    this.name = "UploadError";
  }
}

export type ApiBody = Record<string, unknown> & { ok?: boolean; error?: string };

/** Transient: worth another attempt. */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
/** A chunk that arrived cut short or altered — re-sending it usually fixes it. */
const RETRYABLE_CODES = new Set(["network", "timeout", "part_size_mismatch", "part_corrupted", "storage_error", "server_error", "bad_response"]);

export function isRetryable(error: unknown): boolean {
  if (!(error instanceof UploadError)) return true; // unknown = most likely the network
  return RETRYABLE_CODES.has(error.code) || RETRYABLE_STATUS.has(error.status);
}

/** Turns a raw response into data or a typed error. */
function interpret(status: number, text: string): ApiBody {
  let data: ApiBody | null = null;
  try {
    data = text ? (JSON.parse(text) as ApiBody) : null;
  } catch {
    data = null;
  }
  if (status >= 200 && status < 300 && data && data.ok !== false) return data;
  if (data?.error) throw new UploadError(String(data.error), status, data);
  /* Not our JSON: a proxy or the platform answered (HTML error page, empty body…). */
  if (status === 413) throw new UploadError("payload_too_large", status);
  if (status === 401) throw new UploadError("unauthorized", status);
  if (status >= 500 || status === 0) throw new UploadError("server_error", status);
  throw new UploadError(status >= 200 && status < 300 ? "bad_response" : `http_${status}`, status);
}

const JSON_HEADERS = { "content-type": "application/json" };
const CREDENTIALS: Pick<RequestInit, "cache" | "credentials"> = { cache: "no-store", credentials: "same-origin" };

export async function getJson(url: string): Promise<ApiBody> {
  let response: Response;
  try {
    response = await fetch(url, { ...CREDENTIALS, method: "GET" });
  } catch {
    throw new UploadError("network", 0);
  }
  return interpret(response.status, await response.text().catch(() => ""));
}

export async function postJson(url: string, body: unknown): Promise<ApiBody> {
  let response: Response;
  try {
    response = await fetch(url, { ...CREDENTIALS, method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
  } catch {
    throw new UploadError("network", 0);
  }
  return interpret(response.status, await response.text().catch(() => ""));
}

/**
 * POSTs a multipart form with byte-level progress (fetch cannot report upload
 * progress). `onProgress` receives the fraction of the request body sent.
 */
export function postForm(url: string, form: FormData, onProgress?: (fraction: number) => void): Promise<ApiBody> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.withCredentials = true;
    xhr.responseType = "text";
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total);
      };
    }
    xhr.onerror = () => reject(new UploadError("network", 0));
    xhr.ontimeout = () => reject(new UploadError("timeout", 0));
    xhr.onabort = () => reject(new UploadError("aborted", 0));
    xhr.onload = () => {
      try {
        resolve(interpret(xhr.status, typeof xhr.responseText === "string" ? xhr.responseText : ""));
      } catch (error) {
        reject(error);
      }
    };
    xhr.send(form);
  });
}

/** PUT a chunk to a presigned S3 URL; resolves with the ETag. */
export async function putChunk(url: string, chunk: Blob): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { method: "PUT", body: chunk });
  } catch {
    throw new UploadError("network", 0);
  }
  if (!response.ok) throw new UploadError(RETRYABLE_STATUS.has(response.status) ? "server_error" : `s3_${response.status}`, response.status);
  return response.headers.get("etag") ?? "";
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `task` up to `attempts` times, backing off 1s, 2s, 4s… (or the server's
 * `retryAfterMs`) between transient failures. Permanent errors surface at once.
 */
export async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  options: { attempts?: number; onRetry?: (attempt: number, error: unknown) => void } = {},
): Promise<T> {
  const attempts = options.attempts ?? 4;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) throw error;
      options.onRetry?.(attempt, error);
      const hinted = error instanceof UploadError ? Number(error.detail.retryAfterMs ?? 0) : 0;
      await sleep(hinted > 0 ? hinted : Math.min(8000, 1000 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

/** Whole files up to this size are hashed before sending (chunks are always hashed). */
export const WHOLE_FILE_HASH_LIMIT = 64 * 1024 * 1024;

/** Hex SHA-256 of a blob, or `null` where WebCrypto is unavailable (non-secure context). */
export async function sha256Hex(blob: Blob): Promise<string | null> {
  const subtle = typeof crypto !== "undefined" ? crypto.subtle : undefined;
  if (!subtle) return null;
  try {
    const digest = await subtle.digest("SHA-256", await blob.arrayBuffer());
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/**
 * The artist-facing sentence for an error code. `format` names the slot the file
 * was meant for; `maxBytes` comes from the server when it refused a size.
 */
export function describeUploadError(error: unknown, locale: Locale, context: { format?: string } = {}): string {
  const fa = locale === "fa";
  const code = error instanceof UploadError ? error.code : "network";
  const detail = error instanceof UploadError ? error.detail : {};
  const mb = (bytes: unknown) => Math.round(Number(bytes ?? 0) / 1024 / 1024);
  const format = context.format ?? "";
  switch (code) {
    case "network":
    case "timeout":
      return fa
        ? "اتصال اینترنت قطع شد و چند تلاش دوباره هم موفق نبود. اتصال را بررسی کنید و «ادامه‌ی آپلود» را بزنید؛ فایل‌هایی که کامل رسیده‌اند دوباره فرستاده نمی‌شوند."
        : "The connection dropped and several retries failed. Check your connection and press “Resume upload” — files that already arrived are not sent again.";
    case "payload_too_large":
      return fa
        ? "سرور این حجم را در یک درخواست نمی‌پذیرد (محدودیت سرور یا پروکسی). لطفاً به مدیر سایت اطلاع دهید."
        : "The server refused a request this large (server or proxy limit). Please tell the site admin.";
    case "server_error":
    case "storage_error":
    case "bad_response":
      return fa
        ? "سرور هنگام ذخیره یا پردازش فایل خطا داد. چند لحظه بعد «ادامه‌ی آپلود» را بزنید."
        : "The server failed while storing or processing the file. Press “Resume upload” in a moment.";
    case "too_many_attempts":
      return fa ? "درخواست‌ها بیش از حد مجاز شد؛ چند دقیقه صبر کنید و دوباره تلاش کنید." : "Too many requests — wait a few minutes and try again.";
    case "unauthorized":
      return fa ? "نشست شما منقضی شده است؛ دوباره وارد شوید و آپلود را ادامه دهید." : "Your session expired — sign in again and resume.";
    case "forbidden":
      return fa ? "اجازه‌ی آپلود ندارید (فقط هنرمندان و مدیر)." : "You are not allowed to upload (artists and admins only).";
    case "size_mismatch":
    case "part_size_mismatch":
    case "missing_parts":
      return fa
        ? "فایل ناقص به سرور رسید (حجم دریافتی با حجم واقعی فایل یکی نبود) و ذخیره نشد. «ادامه‌ی آپلود» را بزنید تا دوباره فرستاده شود."
        : "The file arrived incomplete (the received size did not match) and was not kept. Press “Resume upload” to send it again.";
    case "checksum_mismatch":
    case "part_corrupted":
      return fa
        ? "فایل در مسیر خراب شد (چک‌سام با فایل شما نمی‌خواند) و ذخیره نشد. «ادامه‌ی آپلود» را بزنید تا دوباره فرستاده شود."
        : "The file was damaged in transit (checksum mismatch) and was not kept. Press “Resume upload” to send it again.";
    case "unsupported_type":
    case "invalid_format":
      return fa ? `فایل انتخاب‌شده با فرمت ${format} نمی‌خواند.` : `The file does not match the ${format} slot.`;
    case "raster_required":
      return fa ? "اولین فایل هر اثر باید PNG یا JPG باشد." : "The first file of a work must be PNG or JPG.";
    case "file_too_large":
      return fa ? `حجم فایل بیش از حد مجاز است (حداکثر ${mb(detail.maxBytes)} مگابایت).` : `File is too large (max ${mb(detail.maxBytes)} MB).`;
    case "file_too_small":
      return fa ? "این فایل خالی یا ناقص است." : "This file looks empty or truncated.";
    case "invalid_signature":
      return fa ? "محتوای فایل با فرمت انتخابی نمی‌خواند (فایل واقعی آن فرمت نیست)." : "The file's contents are not really in this format.";
    case "infected":
      return fa ? "اسکنر امنیتی در این فایل بدافزار پیدا کرد؛ فایل حذف شد." : "The security scanner found malware in this file; it was deleted.";
    case "invalid_family":
      return fa ? "دسته‌بندی انتخاب‌شده معتبر نیست." : "The chosen category is not valid.";
    case "asset_locked":
      return fa ? "این اثر انحصاری فروخته یا از فروش خارج شده و قابل تغییر نیست." : "This work was sold exclusively or delisted and can no longer change.";
    case "asset_not_found":
    case "session_not_found":
      return fa ? "جلسه‌ی آپلود منقضی شد؛ «ادامه‌ی آپلود» را بزنید تا از نو شروع شود." : "The upload session expired — press “Resume upload” to start it again.";
    default:
      return fa ? `آپلود کامل نشد (${code}).` : `The upload did not complete (${code}).`;
  }
}
