import { NextResponse } from "next/server";
import { redeemDownloadToken } from "@/lib/marketplace/downloads";
import { contentDisposition } from "@/lib/marketplace/storage";
import { recordEvent } from "@/lib/marketplace/analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/marketplace/download?token=…
 *
 * Streams a licensed master file. The token is HMAC-signed and short-lived; the
 * license's download quota is charged *before* the bytes start flowing, and every
 * redemption is appended to the license for the audit trail.
 *
 *   • S3 backend    → 302 to a freshly presigned bucket URL
 *   • local backend → the file is streamed from `data/objects/…`
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });

  const result = await redeemDownloadToken(token, {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
    userAgent: request.headers.get("user-agent") ?? "unknown",
  });

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      invalid_token: 403,
      expired: 410,
      license_missing: 404,
      license_revoked: 410,
      quota_exceeded: 429,
      asset_missing: 404,
      object_missing: 404,
      storage_error: 502,
    };
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        ...(result.license
          ? {
              license: {
                serial: result.license.serial,
                downloads: result.license.downloads.length,
                maxDownloads: result.license.maxDownloads,
                status: result.license.status,
              },
            }
          : {}),
      },
      { status: statusMap[result.error] ?? 400, headers: { "cache-control": "private, no-store" } },
    );
  }

  void recordEvent({
    kind: "download",
    assetId: result.asset.id,
    artistId: result.asset.artistId,
    userId: result.license.buyerUserId,
    meta: { licenseId: result.license.id },
  });

  const headers = new Headers({
    "content-type": result.asset.master.mime || "application/octet-stream",
    "content-disposition": contentDisposition(result.filename, result.disposition),
    "cache-control": "private, no-store",
    "x-license-serial": result.license.serial,
    "x-content-type-options": "nosniff",
  });

  if (result.redirectUrl) {
    headers.set("location", result.redirectUrl);
    return new NextResponse(null, { status: 302, headers });
  }

  headers.set("content-length", String(result.stream.size));
  return new NextResponse(result.stream.body, { status: 200, headers });
}

/** HEAD so a client can check quota/validity without starting a download. */
export async function HEAD() {
  return new NextResponse(null, { status: 405 });
}
