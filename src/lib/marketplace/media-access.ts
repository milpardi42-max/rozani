import "server-only";
import { siteUrl } from "./config";

/**
 * Public helpers for media access. The route handler imports these so the
 * key-validation rules live next to the storage contract instead of being
 * duplicated (and drifting) inside the endpoint.
 */
export { assetIdFromKey, getStream, isPublicDerivedKey } from "./storage";

/** Absolute URL of a media object — used by the storefront <Image> sources. */
export function mediaUrl(key: string | undefined | null): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}/api/marketplace/media?key=${encodeURIComponent(key)}`;
}

/** Signed URL variant (kept for parity with the S3 presign path). */
export function signedMediaUrl(key: string, ttlSeconds = 3600): string {
  void ttlSeconds;
  return `${siteUrl()}/api/marketplace/media?key=${encodeURIComponent(key)}`;
}
