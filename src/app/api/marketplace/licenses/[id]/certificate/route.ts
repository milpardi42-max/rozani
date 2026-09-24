import { NextResponse } from "next/server";
import { getLicense, getOrder } from "@/lib/marketplace/orders";
import { getAsset } from "@/lib/marketplace/assets";
import { getSettings } from "@/lib/marketplace/assets";
import { generateLicenseCertificate } from "@/lib/marketplace/pdf/certificate";
import { defaultTiers, siteUrl } from "@/lib/marketplace/config";
import { getSession } from "@/lib/auth";
import { verifyObjectToken } from "@/lib/marketplace/storage";
import { assetFormatIds } from "@/lib/marketplace/colourways";
import { formatListLabel } from "@/lib/marketplace/formats";
import type { CertificateInput } from "@/lib/marketplace/pdf/certificate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/marketplace/licenses/:id/certificate?locale=fa&download=1
 *
 * Streams the license certificate PDF. Persian certificates are rendered with
 * shaped font outlines (`pdf/textpath.ts`) because an embedded Iranian WOFF2
 * cannot be shaped by pdf-lib — see the notes in `pdf/certificate.ts`.
 *
 * Access: the buyer, the artist who sold it, an admin — or a valid `?token=`
 * (the signed delivery link we e-mail), so a guest who followed the e-mail can
 * still fetch their certificate without signing in. Everyone else gets 404, so
 * guessing a URL can never confirm that a serial exists.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fa";
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

  const license = await getLicense(id);
  if (!license) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const session = await getSession();
  const emailToken = verifyObjectToken(url.searchParams.get("token") ?? "");
  const fromEmailLink = Boolean(emailToken && emailToken.lic === license.id);
  const allowed =
    fromEmailLink ||
    session?.role === "admin" ||
    (session && license.buyerUserId && session.id === license.buyerUserId) ||
    (session?.artistId && session.artistId === license.artistId);
  if (!allowed) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const [asset, order, settings] = await Promise.all([getAsset(license.assetId), getOrder(license.orderId), getSettings()]);

  const tier =
    asset?.tiers.find((item) => item.id === license.tierId) ??
    defaultTiers().find((item) => item.kind === license.licenseKind);

  const input: CertificateInput = {
    locale,
    brand: { fa: "رزی آتلیه", en: "Rosie Atelier" },
    siteUrl: siteUrl(),
    accent: "#b5713a",
    verificationUrl: `${siteUrl()}/${locale}/verify?serial=${license.serial}`,
    license: {
      serial: license.serial,
      id: license.id,
      licenseKind: license.licenseKind,
      licenseKindLabel: tier?.title ?? { fa: license.licenseKind, en: license.licenseKind },
      exclusivity: license.exclusive
        ? {
            fa: "این لایسنس انحصاری است؛ تمام حقوق استفاده تجاری اثر به خریدار منتقل شده و اثر از فروشگاه حذف شده است.",
            en: "This is an exclusive license: full commercial usage rights have been transferred and the work has been delisted.",
          }
        : undefined,
      issuedAt: license.issuedAt,
      maxDownloads: license.maxDownloads,
      maxUnits: tier?.maxUnits ?? 0,
      terms: tier?.terms ?? {
        fa: "استفاده از اثر طبق مفاد این گواهی و قوانین فروشگاه رزی آتلیه مجاز است.",
        en: "Use of the work is permitted under the terms of this certificate and the Rosie Atelier marketplace policy.",
      },
      pricePaid: license.pricePaid,
      royalty: license.royalty
        ? { pct: license.royalty.pct, amount: license.royalty.amount }
        : undefined,
    },
    asset: {
      title: license.title,
      sku: asset?.slug ? asset.slug.toUpperCase() : undefined,
      kind: asset?.kind,
      formats: asset
        ? (() => {
            const ids = assetFormatIds(asset);
            if (!ids.length) return null;
            return { fa: formatListLabel(ids, "fa"), en: formatListLabel(ids, "en") };
          })()
        : null,
    },
    artist: { name: license.artistName },
    buyer: {
      name: license.buyerName,
      email: license.buyerEmail,
      company: order?.buyer.company,
      country: order?.buyer.country,
    },
    order: {
      id: license.orderId,
      date: order?.createdAt ?? license.issuedAt,
      provider: order?.charge.currency === "USD" ? "Stripe" : "Zarinpal",
      reference: order?.paidAt ? license.orderId.slice(-6) : undefined,
      couponCode: order?.couponCode,
    },
  };

  try {
    const bytes = await generateLicenseCertificate(input);
    const filename = `${license.serial}${locale === "fa" ? "-fa" : ""}.pdf`;
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-length": String(bytes.byteLength),
        "content-disposition": `${disposition}; filename="${filename}"`,
        "cache-control": "private, no-store",
        "x-certificate-serial": license.serial,
      },
    });
  } catch (error) {
    console.error("[marketplace/certificate]", error);
    void settings;
    return NextResponse.json({ ok: false, error: "certificate_failed" }, { status: 500 });
  }
}
