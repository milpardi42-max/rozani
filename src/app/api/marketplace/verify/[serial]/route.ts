import { NextResponse } from "next/server";
import { findLicenseBySerial } from "@/lib/marketplace/orders";
import { getAsset } from "@/lib/marketplace/assets";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/verify/<serial>
 *
 * Public certificate verification (the QR code on the PDF points here). Exposes
 * only what is needed to confirm authenticity — never the buyer's address or the
 * file itself.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ serial: string }> }) {
  const { serial } = await params;
  const license = await findLicenseBySerial(serial);

  if (!license) {
    return NextResponse.json(
      { ok: false, valid: false, error: "unknown_serial", serial },
      withNoStore({ status: 404 }),
    );
  }

  const asset = await getAsset(license.assetId);

  return NextResponse.json(
    {
      ok: true,
      valid: license.status === "active",
      serial: license.serial,
      status: license.status,
      licenseKind: license.licenseKind,
      exclusive: license.exclusive,
      title: license.title,
      artistName: license.artistName,
      issuedAt: license.issuedAt,
      buyer: maskName(license.buyerName),
      orderId: license.orderId,
      asset: asset ? { slug: asset.slug, kind: asset.kind } : null,
      revokedReason: license.revokedReason ?? null,
      maxDownloads: license.maxDownloads,
      downloadCount: license.downloads.length,
    },
    withNoStore({ status: 200 }),
  );
}

/** «سارا محمدی» → «س. م.» / "Sara Mohammadi" → "S. M." */
function maskName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0]}.`)
    .join(" ");
}
