import { NextResponse } from "next/server";
import { getAsset, getAssets } from "@/lib/marketplace/assets";
import { assetIdFromKey, getStream, isPublicDerivedKey, signedMediaUrl } from "@/lib/marketplace/media-access";
import { assetDerivedKeys } from "@/lib/marketplace/colourways";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/media?key=private/derived/<assetId>/<file>
 *
 * Serves *derived* objects (watermarked previews, thumbnails, mockups, tile
 * previews). The clean master can never be reached through this route —
 * `isPublicDerivedKey()` rejects anything outside `private/derived/`.
 *
 * Visibility rules:
 *   • published asset            → public, long-lived cache
 *   • unpublished asset          → owner + admins only, `no-store`
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key) return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
  if (!isPublicDerivedKey(key)) {
    return NextResponse.json({ ok: false, error: "forbidden_key" }, { status: 403 });
  }

  const assetId = assetIdFromKey(key);
  if (!assetId) return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 400 });

  const asset = await getAsset(assetId);
  if (!asset) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  /* Watermarked derivatives only: master previews, thumbnails, mockups, tiles and
     one preview per colourway. Clean masters are never reachable here. */
  const known = assetDerivedKeys(asset).has(key);
  if (!known) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const published = asset.status === "approved" || asset.status === "sold_exclusive";
  if (!published) {
    const session = await getSession();
    const isOwner = session?.id === asset.ownerUserId;
    const isAdmin = session?.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }
  }

  const range = request.headers.get("range");
  const parsedRange = range?.match(/bytes=(\d+)-(\d*)/);
  const rangeSpec = parsedRange
    ? { start: Number(parsedRange[1]), end: parsedRange[2] ? Number(parsedRange[2]) : undefined }
    : undefined;

  try {
    const stream = await getStream(key, rangeSpec);
    const filename = key.split("/").pop() ?? "preview.jpg";
    const headers = new Headers({
      "content-type": key.endsWith(".png") ? "image/png" : "image/jpeg",
      "content-length": String(stream.size),
      "cache-control": published ? "public, max-age=86400, stale-while-revalidate=604800" : "private, no-store",
      "content-disposition": `inline; filename="${filename}"`,
      "x-content-type-options": "nosniff",
    });
    void signedMediaUrl;
    return new NextResponse(stream.body, { status: rangeSpec ? 206 : 200, headers });
  } catch {
    return NextResponse.json({ ok: false, error: "storage_error" }, { status: 502 });
  }
}

/** GET /api/marketplace/media?asset=<id>&pick=preview|thumb|tile|mockup|n — convenience. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { assetIds?: string[] } | null;
  if (!body?.assetIds?.length) return NextResponse.json({ ok: true, media: {} });
  const assets = await getAssets();
  const media = Object.fromEntries(
    assets
      .filter((asset) => body.assetIds!.includes(asset.id))
      .map((asset) => [
        asset.id,
        {
          preview: asset.previewKey ?? null,
          thumb: asset.derivatives.find((file) => file.kind === "thumb")?.key ?? null,
          tile: asset.tileKey ?? null,
          mockups: asset.mockups.map((file) => file.key),
        },
      ]),
  );
  return NextResponse.json({ ok: true, media });
}
