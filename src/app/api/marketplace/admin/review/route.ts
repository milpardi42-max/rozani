import { getReviewQueue, approveAsset, rejectAsset, delistAsset, relistAsset, regenerateDerivatives, rescanAsset, purgeAsset } from "@/lib/marketplace/admin";
import { sendReviewNotice } from "@/lib/marketplace/email";
import { fail, json, readJson, requireAdmin } from "@/lib/marketplace/guard";
import { assetColourways, assetFormatIds, deliveryBytes } from "@/lib/marketplace/colourways";
import { isDeliverableFormatId } from "@/lib/marketplace/formats";
import type { LicenseTier } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** GET /api/marketplace/admin/review — the moderation queue with warnings. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const queue = await getReviewQueue();
  const limit = Number(url.searchParams.get("limit") ?? 50);

  return json({
    ok: true,
    total: queue.length,
    items: queue.slice(0, limit).map((item) => ({
      asset: {
        id: item.asset.id,
        slug: item.asset.slug,
        title: item.asset.title,
        description: item.asset.description,
        kind: item.asset.kind,
        tags: item.asset.tags,
        status: item.asset.status,
        visibility: item.asset.visibility,
        createdAt: item.asset.createdAt,
        updatedAt: item.asset.updatedAt,
        master: item.asset.master,
        scan: item.asset.scan,
        seamless: item.asset.seamless,
        tiers: item.asset.tiers,
        revenueSharePct: item.asset.revenueSharePct,
        /* What the buyer will receive — colourways, each with its formats. */
        formats: assetFormatIds(item.asset),
        deliveryBytes: deliveryBytes(item.asset),
        colourways: assetColourways(item.asset).map((colourway) => ({
          id: colourway.id,
          name: colourway.name,
          hex: colourway.hex,
          preview: colourway.previewKey ?? null,
          formats: colourway.files
            .filter((file) => isDeliverableFormatId(file.formatId))
            .map((file) => ({ formatId: file.formatId, filename: file.filename, sizeBytes: file.sizeBytes })),
        })),
        media: {
          preview: item.asset.previewKey,
          tile: item.asset.tileKey,
          thumbs: item.asset.derivatives.filter((file) => file.kind === "thumb").map((file) => file.key),
          mockups: item.asset.mockups.map((file) => ({ key: file.key, kind: file.kind })),
        },
        rejectionNote: item.asset.rejectionNote,
        review: item.asset.review,
      },
      artistName: item.artistName,
      ownerEmail: item.ownerEmail,
      warnings: item.warnings,
    })),
  });
}

/**
 * POST /api/marketplace/admin/review
 *
 * actions: approve | reject | delist | relist | rescan | regenerate | purge
 * Approving can also publish immediately and rewrite the price list, which is
 * how the studio corrects an artist's pricing before the work goes live.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJson<{
    action?: "approve" | "reject" | "delist" | "relist" | "rescan" | "regenerate" | "purge";
    assetId?: string;
    note?: string;
    publish?: boolean;
    tiers?: { id?: string; priceFa?: number; priceEn?: number; enabled?: boolean }[];
  }>(request);

  if (!body?.assetId || !body.action) return fail("invalid_payload");

  const tiers: LicenseTier[] | undefined = body.tiers?.length
    ? (body.tiers as unknown as LicenseTier[])
    : undefined;

  switch (body.action) {
    case "approve": {
      const asset = await approveAsset(body.assetId, {
        adminEmail: auth.user.email,
        publish: body.publish,
        tiers,
        note: body.note,
      });
      if (!asset) return fail("not_found", 404);
      const owner = await ownerEmail(asset.ownerUserId);
      if (owner) {
        await sendReviewNotice({ to: owner, assetTitle: asset.title, status: "approved", locale: "fa" }).catch(() => undefined);
      }
      return json({ ok: true, asset: { id: asset.id, status: asset.status, visibility: asset.visibility } });
    }
    case "reject": {
      const asset = await rejectAsset(body.assetId, auth.user.email, body.note ?? "rejected");
      if (!asset) return fail("not_found", 404);
      const owner = await ownerEmail(asset.ownerUserId);
      if (owner) await sendReviewNotice({ to: owner, assetTitle: asset.title, status: "rejected", note: body.note, locale: "fa" }).catch(() => undefined);
      return json({ ok: true, asset: { id: asset.id, status: asset.status, rejectionNote: asset.rejectionNote } });
    }
    case "delist": {
      const asset = await delistAsset(body.assetId);
      if (!asset) return fail("not_found", 404);
      return json({ ok: true, asset: { id: asset.id, visibility: asset.visibility } });
    }
    case "relist": {
      const asset = await relistAsset(body.assetId);
      if (!asset) return fail("not_found", 404);
      return json({ ok: true, asset: { id: asset.id, visibility: asset.visibility } });
    }
    case "rescan": {
      const asset = await rescanAsset(body.assetId);
      if (!asset) return fail("not_found", 404);
      return json({ ok: true, scan: asset.scan });
    }
    case "regenerate": {
      const asset = await regenerateDerivatives(body.assetId);
      if (!asset) return fail("failed", 502);
      return json({ ok: true, media: { preview: asset.previewKey, mockups: asset.mockups.length, seamless: asset.seamless } });
    }
    case "purge": {
      const removed = await purgeAsset(body.assetId);
      return json({ ok: removed });
    }
    default:
      return fail("unknown_action");
  }
}

async function ownerEmail(ownerUserId: string | null | undefined): Promise<string | null> {
  if (!ownerUserId) return null;
  const { findUserById } = await import("@/lib/data/users");
  const user = await findUserById(ownerUserId).catch(() => null);
  return user?.email ?? null;
}
