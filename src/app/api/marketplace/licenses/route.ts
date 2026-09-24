import { getLicensesForArtist, getLicensesForUser, getLicenses as all } from "@/lib/marketplace/orders";
import { createDownloadToken, deliverableFilename, licenseQuota } from "@/lib/marketplace/downloads";
import { assetColourways, assetDeliverables, deliveryBytes } from "@/lib/marketplace/colourways";
import { formatLabel } from "@/lib/marketplace/formats";
import { getAssets } from "@/lib/marketplace/assets";
import { json, session } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/licenses
 *
 * Returns the caller's licenses with their quota, a fresh signed download URL
 * and the certificate links. Admins can request `?scope=all`; artists get the
 * licenses of their own works with `?scope=artist`.
 */
export async function GET(request: Request) {
  const user = await session();
  if (!user) return json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "me";

  const licenses =
    user.role === "admin" && scope === "all"
      ? await all()
      : user.role === "artist" && scope === "artist" && user.artistId
        ? await getLicensesForArtist(user.artistId)
        : await getLicensesForUser(user.id);

  const assets = await getAssets();
  const assetIndex = new Map(assets.map((asset) => [asset.id, asset]));

  return json({
    ok: true,
    licenses: licenses.map((license) => {
      const asset = assetIndex.get(license.assetId);
      const quota = licenseQuota(license);
      const deliverable = asset && license.status === "active" && quota.canDownload
        ? assetDeliverables(asset).map((item) => ({
            id: item.file.id,
            formatId: item.formatId,
            formatLabel: { fa: formatLabel(item.formatId, "fa"), en: formatLabel(item.formatId, "en") },
            colourwayId: item.colourwayId,
            colourwayName: item.colourwayName,
            hex: item.hex,
            filename: deliverableFilename(asset, item),
            sizeBytes: item.file.sizeBytes,
            mime: item.file.mime,
            width: item.file.width ?? null,
            height: item.file.height ?? null,
            /** Signed per file — one download of one format burns one credit. */
            url: `/api/marketplace/download?token=${encodeURIComponent(
              createDownloadToken(license, asset, { source: "account", file: item.file, colourwayName: item.colourwayName }),
            )}`,
          }))
        : [];
      return {
        id: license.id,
        serial: license.serial,
        assetId: license.assetId,
        title: license.title,
        slug: asset?.slug ?? null,
        licenseKind: license.licenseKind,
        exclusive: license.exclusive,
        status: license.status,
        issuedAt: license.issuedAt,
        orderId: license.orderId,
        artistId: license.artistId,
        artistName: license.artistName,
        pricePaid: license.pricePaid,
        royalty: license.royalty,
        quota: { used: quota.used, limit: quota.limit, unlimited: quota.unlimited, remaining: quota.remaining === Number.POSITIVE_INFINITY ? null : quota.remaining },
        downloads: license.downloads.slice(-10).reverse(),
        /** Ready-to-use link; expires with DOWNLOAD_TOKEN_TTL_S. */
        downloadUrl:
          asset && license.status === "active" && quota.canDownload
            ? `/api/marketplace/download?token=${encodeURIComponent(createDownloadToken(license, asset, { source: "account" }))}`
            : null,
        /** Everything this license delivers, colourway by colourway. */
        files: deliverable,
        image: asset?.previewKey ?? null,
        deliveryBytes: asset ? deliveryBytes(asset) : 0,
        colourways:
          asset && license.status === "active"
            ? assetColourways(asset).map((colourway) => ({
                id: colourway.id,
                name: colourway.name,
                hex: colourway.hex,
                preview: colourway.previewKey ?? null,
                formats: colourway.files
                  .filter((file) => assetDeliverables(asset).some((item) => item.file.id === file.id))
                  .map((file) => file.formatId),
              }))
            : [],
        certificateUrl: `/api/marketplace/licenses/${license.id}/certificate`,
        verifyUrl: `/api/marketplace/verify/${license.serial}`,
      };
    }),
  });
}
