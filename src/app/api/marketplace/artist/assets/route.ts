import { getAssets, getUploadSessions, saveAsset, updateAssetTiers } from "@/lib/marketplace/assets";
import { assetColourways, assetFormatIds, deliveryBytes } from "@/lib/marketplace/colourways";
import { getLicensesForArtist } from "@/lib/marketplace/orders";
import { fail, json, readJson, requireArtistOrAdmin } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/artist/assets
 *
 * Everything the artist dashboard needs in one round trip: their works, the
 * upload sessions still in flight, per-asset sales counters and the revenue they
 * generated.
 */
export async function GET() {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const artistId = auth.user.artistId;
  const [assets, sessions, licenses] = await Promise.all([getAssets(), getUploadSessions(), getLicensesForArtist(artistId ?? "").catch(() => [])]);

  const mine = assets.filter((asset) => asset.ownerUserId === auth.user.id || (artistId && asset.artistId === artistId));
  const revenueByAsset = new Map<string, { fa: number; en: number; sales: number }>();
  for (const license of licenses) {
    const current = revenueByAsset.get(license.assetId) ?? { fa: 0, en: 0, sales: 0 };
    revenueByAsset.set(license.assetId, {
      fa: current.fa + license.pricePaid.fa,
      en: current.en + license.pricePaid.en,
      sales: current.sales + 1,
    });
  }

  return json({
    ok: true,
    role: auth.user.role,
    artistId: artistId ?? null,
    assets: mine.map((asset) => ({
      id: asset.id,
      slug: asset.slug,
      title: asset.title,
      description: asset.description,
      kind: asset.kind,
      tags: asset.tags,
      familyId: asset.familyId ?? null,
      status: asset.status,
      visibility: asset.visibility,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      review: asset.review,
      rejectionNote: asset.rejectionNote,
      revenueSharePct: asset.revenueSharePct,
      tiers: asset.tiers,
      master: {
        filename: asset.master.filename,
        sizeBytes: asset.master.sizeBytes,
        mime: asset.master.mime,
        sha256: asset.master.sha256,
        width: asset.master.width,
        height: asset.master.height,
      },
      scan: asset.scan,
      seamless: asset.seamless,
      /* What the work actually delivers: colour versions and their formats. */
      formats: assetFormatIds(asset),
      colourways: assetColourways(asset).map((colourway) => ({
        id: colourway.id,
        name: colourway.name,
        hex: colourway.hex,
        preview: colourway.previewKey ?? null,
        formats: colourway.files.map((file) => file.formatId),
        bytes: colourway.files.reduce((total, file) => total + file.sizeBytes, 0),
      })),
      deliveryBytes: deliveryBytes(asset),
      filesUpdatedAt: asset.review?.filesUpdatedAt ?? null,
      media: {
        preview: asset.previewKey,
        tile: asset.tileKey,
        thumbs: asset.derivatives.filter((file) => file.kind === "thumb").map((file) => file.key),
        mockups: asset.mockups.map((file) => ({ key: file.key, kind: file.kind })),
      },
      stats: asset.stats,
      sales: revenueByAsset.get(asset.id) ?? { fa: 0, en: 0, sales: 0 },
    })),
    uploads: sessions
      .filter((session) => session.userId === auth.user.id && session.status !== "completed")
      .map((session) => ({
        id: session.id,
        status: session.status,
        filename: session.filename,
        sizeBytes: session.sizeBytes,
        mode: session.mode,
        parts: session.parts.length,
        createdAt: session.createdAt,
      })),
    licenses: licenses.length,
  });
}

/**
 * PATCH /api/marketplace/artist/assets
 *
 * Lets an artist reorganise their submission while it is still in review:
 * title/description/tags/kind and the price list. Approved works can only be
 * re-illustrated (prices), never re-published without another review.
 */
export async function PATCH(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJson<{
    id?: string;
    title?: { fa?: string; en?: string };
    description?: { fa?: string; en?: string };
    tags?: string[];
    kind?: string;
    tiers?: { id?: string; priceFa?: number; priceEn?: number; enabled?: boolean }[];
  }>(request);

  if (!body?.id) return fail("missing_id");

  const assets = await getAssets();
  const asset = assets.find((item) => item.id === body.id);
  if (!asset) return fail("not_found", 404);
  if (asset.ownerUserId !== auth.user.id && auth.user.role !== "admin" && asset.artistId !== auth.user.artistId) {
    return fail("forbidden", 403);
  }

  let updated = asset;
  if (body.tiers?.length) {
    const tiers = asset.tiers.map((tier) => {
      const patch = body.tiers!.find((item) => item.id === tier.id);
      if (!patch) return tier;
      return {
        ...tier,
        price: {
          fa: Number.isFinite(patch.priceFa) ? Math.max(0, Math.round(patch.priceFa!)) : tier.price.fa,
          en: Number.isFinite(patch.priceEn) ? Math.max(0, Math.round(patch.priceEn! * 100) / 100) : tier.price.en,
        },
        enabled: patch.enabled ?? tier.enabled,
      };
    });
    updated = (await updateAssetTiers(asset.id, tiers)) ?? updated;
  }

  updated = await saveAsset({
    ...updated,
    title: {
      fa: body.title?.fa?.trim() || updated.title.fa,
      en: body.title?.en?.trim() || updated.title.en,
    },
    description: {
      fa: body.description?.fa ?? updated.description.fa,
      en: body.description?.en ?? updated.description.en,
    },
    tags: body.tags ?? updated.tags,
    kind: (body.kind as typeof updated.kind) ?? updated.kind,
  });

  return json({ ok: true, asset: { id: updated.id, title: updated.title, status: updated.status, tiers: updated.tiers } });
}
