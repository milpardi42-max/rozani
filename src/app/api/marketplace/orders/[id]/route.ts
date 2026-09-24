import { getSession } from "@/lib/auth";
import { getAsset } from "@/lib/marketplace/assets";
import { createDownloadToken, deliverableFilename, licenseQuota } from "@/lib/marketplace/downloads";
import { assetColourways, assetDeliverables, deliveryBytes } from "@/lib/marketplace/colourways";
import { formatLabel } from "@/lib/marketplace/formats";
import { defaultTiers } from "@/lib/marketplace/config";
import { getLicenses, getOrder } from "@/lib/marketplace/orders";
import { getAttemptsByOrder } from "@/lib/marketplace/payments";
import { fail, json } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/orders/:id
 *
 * Receipt data for the buyer. Guests (no account) may fetch an order only when
 * they know its unguessable id — which they do, because the gateway sent them
 * back with it. Account holders must match; admins always pass.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return fail("not_found", 404);

  const session = await getSession();
  const isOwner = session && order.userId && session.id === order.userId;
  const isAdmin = session?.role === "admin";
  const isGuestLink = !order.userId;

  if (!isAdmin && !isOwner && !isGuestLink && !session) return fail("unauthorized", 401);
  if (!isAdmin && !isOwner && session?.id !== order.userId && order.userId) return fail("forbidden", 403);

  /* Lazy fulfilment: covers a lost callback without a manual admin step. */
  if (order.status === "paid" && !order.fulfillment.completedAt) {
    const { fulfillOrder } = await import("@/lib/marketplace/orders");
    await fulfillOrder(order.id, { reference: "receipt_api" }).catch(() => undefined);
  }

  const licenses = (await getLicenses()).filter((license) => license.orderId === id);
  const attempts = await getAttemptsByOrder(id);
  const attempt = attempts.find((item) => item.status === "paid") ?? attempts[attempts.length - 1];

  const rows = await Promise.all(
    licenses.map(async (license) => {
      const asset = await getAsset(license.assetId);
      const quota = licenseQuota(license);
      const tier = asset?.tiers.find((item) => item.id === license.tierId) ?? defaultTiers().find((item) => item.kind === license.licenseKind);
      return {
        id: license.id,
        serial: license.serial,
        assetId: license.assetId,
        title: license.title,
        licenseKind: tier?.title.fa ?? license.licenseKind,
        exclusive: license.exclusive,
        downloadUrl:
          asset && license.status === "active" && quota.canDownload
            ? `/api/marketplace/download?token=${encodeURIComponent(createDownloadToken(license, asset, { source: "account" }))}`
            : null,
        /* Guest-friendly: the receipt shows every format/colour of the purchase. */
        files:
          asset && license.status === "active" && quota.canDownload
            ? assetDeliverables(asset).map((item) => ({
                id: item.file.id,
                formatId: item.formatId,
                formatLabel: { fa: formatLabel(item.formatId, "fa"), en: formatLabel(item.formatId, "en") },
                colourwayId: item.colourwayId,
                colourwayName: item.colourwayName,
                hex: item.hex,
                filename: deliverableFilename(asset, item),
                sizeBytes: item.file.sizeBytes,
                url: `/api/marketplace/download?token=${encodeURIComponent(
                  createDownloadToken(license, asset, { source: "account", file: item.file, colourwayName: item.colourwayName }),
                )}`,
              }))
            : [],
        deliveryBytes: asset ? deliveryBytes(asset) : 0,
        colourways: asset
          ? assetColourways(asset)
              .filter((colourway) => colourway.files.length)
              .map((colourway) => ({ id: colourway.id, name: colourway.name, hex: colourway.hex, formats: colourway.files.map((file) => file.formatId) }))
          : [],
        quota: {
          used: quota.used,
          limit: quota.limit,
          unlimited: quota.unlimited,
          remaining: quota.remaining === Number.POSITIVE_INFINITY ? null : quota.remaining,
        },
      };
    }),
  );

  return json({
    ok: true,
    order: {
      id: order.id,
      status: order.status,
      /* Itemised so the receipt can show an honest invoice (VAT is 9 % in Iran). */
      subtotal: order.subtotal,
      discount: order.discount,
      tax: order.tax,
      total: order.total,
      couponCode: order.couponCode ?? null,
      charge: order.charge,
      paidAt: order.paidAt,
      provider: attempt?.provider,
      sandbox: attempt?.sandbox,
      createdAt: order.createdAt,
      lines: order.lines.map((line) => ({ assetId: line.assetId, title: line.title, price: line.price })),
    },
    licenses: rows,
    emails: order.fulfillment.emails.length,
  });
}
