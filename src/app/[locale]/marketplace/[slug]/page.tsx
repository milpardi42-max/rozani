import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetDetail, type AssetDetailData } from "@/components/marketplace/AssetDetail";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getAssets, getAssetBySlug } from "@/lib/marketplace/assets";
import { assetColourways, assetDeliverables } from "@/lib/marketplace/colourways";
import { DELIVERABLE_FORMATS, isDeliverableFormatId } from "@/lib/marketplace/formats";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const asset = await getAssetBySlug(slug);
  if (!asset) return { title: locale === "fa" ? "اثر یافت نشد" : "Work not found" };
  return {
    title: t(asset.title, locale),
    description: t(asset.description, locale)?.slice(0, 180),
    openGraph: asset.previewKey ? { images: [{ url: `/api/marketplace/media?key=${encodeURIComponent(asset.previewKey)}` }] } : undefined,
  };
}

export default async function MarketplaceAssetPage({ params }: { params: Promise<{ locale: Locale; slug: string }> }) {
  const { locale, slug } = await params;
  const fa = locale === "fa";

  const asset = await getAssetBySlug(slug);
  if (!asset || (asset.status !== "approved" && asset.status !== "sold_exclusive")) notFound();

  const { getContent } = await import("@/lib/data/store");
  const content = await getContent().catch(() => null);
  const artist = asset.artistId ? content?.artists.find((item) => item.id === asset.artistId) ?? null : null;

  const data: AssetDetailData = {
    id: asset.id,
    slug: asset.slug,
    title: asset.title,
    description: asset.description,
    kind: asset.kind,
    tags: asset.tags,
    familyId: asset.familyId ?? null,
    colourways: assetColourways(asset).map((colourway) => ({
      id: colourway.id,
      name: colourway.name,
      hex: colourway.hex,
      preview: colourway.previewKey ?? null,
      files: colourway.files
        .filter((file) => isDeliverableFormatId(file.formatId))
        .map((file) => ({
          formatId: file.formatId,
          sizeBytes: file.sizeBytes,
          width: file.width,
          height: file.height,
        })),
    })),
    /* One row per format the artist actually delivered, with its total size. */
    formats: assetDeliverables(asset).length
      ? DELIVERABLE_FORMATS.flatMap((format) => {
          const files = assetDeliverables(asset).filter((item) => item.formatId === format.id);
          return files.length
            ? [
                {
                  id: format.id,
                  label: format.label,
                  bytes: files.reduce((total, item) => total + item.file.sizeBytes, 0),
                  colourways: new Set(files.map((item) => item.colourwayId)).size,
                },
              ]
            : [];
        })
      : [],
    status: asset.status,
    soldExclusive: asset.status === "sold_exclusive",
    purchasable: asset.status === "approved" && asset.visibility === "public",
    artistId: asset.artistId,
    createdAt: asset.createdAt,
    stats: { views: asset.stats.views, sales: asset.stats.sales },
    tiers: asset.tiers,
    media: {
      preview: asset.previewKey ?? null,
      tile: asset.tileKey ?? null,
      thumbs: asset.derivatives.filter((file) => file.kind === "thumb").map((file) => file.key),
      mockups: asset.mockups.map((file) => ({ key: file.key, kind: file.kind, variant: file.variant })),
    },
    seamless: { verdict: asset.seamless.verdict, score: asset.seamless.score, tileable: asset.seamless.tileable },
    file: {
      mime: asset.master.mime,
      sizeBytes: asset.master.sizeBytes,
      width: asset.master.width,
      height: asset.master.height,
      sha256: asset.master.sha256,
    },
  };

  const { defaultAffiliatePct } = await import("@/lib/marketplace/royalty");
  const siblingCount = (await getAssets()).filter((item) => item.artistId === asset.artistId && item.id !== asset.id).length;

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "فایل دیجیتال" : "Digital files", href: href(locale, "/marketplace") },
          { label: t(asset.title, locale) },
        ]}
        locale={locale}
        className="mb-6"
      />

      <AssetDetail
        locale={locale}
        asset={data}
        artistName={artist?.name ?? null}
        couponHint={
          siblingCount > 0
            ? fa
              ? `با کد معرف دوستانتان ${defaultAffiliatePct()}٪ کمیسیون بگیرید.`
              : `Earn ${defaultAffiliatePct()}% commission by sharing your referral code.`
            : null
        }
      />
    </div>
  );
}
