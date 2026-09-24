import "server-only";

import { getContent } from "@/lib/data/store";
import { assetsByArtist, artistSharePct } from "@/lib/marketplace/assets";
import { getArtistAnalytics } from "@/lib/marketplace/analytics";
import { artistWalletDetails, type ArtistWallet } from "@/lib/marketplace/payouts";
import { assetColourways, assetDeliverables, assetFormatIds, deliveryBytes } from "@/lib/marketplace/colourways";
import { DELIVERABLE_FORMATS, type DeliverableFormatId } from "@/lib/marketplace/formats";
import type { ArtistAnalytics } from "@/lib/marketplace/types";
import type { Artist } from "@/lib/types";
import type { Asset } from "@/lib/marketplace/types";

/**
 * Artist dashboard data.
 *
 * Everything the /artist dashboard renders is assembled here, server-side, in
 * one place: the artist record, their works with the *delivery* detail
 * (colourways, formats, bytes), the sales analytics with a previous-period
 * comparison, and the wallet. The page itself stays a pure view.
 */

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface DashboardWork {
  id: string;
  slug: string;
  title: { fa: string; en: string };
  familyId: string | null;
  status: Asset["status"];
  visibility: Asset["visibility"];
  /** `uploading` = the upload batch never completed (some files may be missing; stays private). */
  uploadState: "uploading" | "complete";
  /** Watermarked preview for the work's first colourway, when one exists. */
  preview: string | null;
  colourways: { id: string; name: { fa: string; en: string }; hex: string; preview: string | null; files: number; bytes: number }[];
  formats: DeliverableFormatId[];
  files: number;
  bytes: number;
  /** Recommended delivery formats this work does not ship yet. */
  missingFormats: DeliverableFormatId[];
  priceFrom: { fa: number; en: number } | null;
  views: number;
  sales: number;
  revenue: { fa: number; en: number };
  reviewNote?: string;
  filesUpdatedAt?: string;
  createdLabel: string;
}

export interface DeliveryGaps {
  /** Works with only one colourway — the cheapest way to make more sales. */
  singleColour: number;
  /** Works that do not ship every recommended format yet. */
  missingFormats: { label: { fa: string; en: string }; works: number }[];
  /** Works without a preview image (buyers buy with their eyes). */
  withoutPreview: number;
  /** Works whose delivery is under 1 MB in total — usually too thin to sell. */
  thinDelivery: number;
}

export interface ArtistDashboardData {
  artist: Artist | null;
  artistName: { fa: string; en: string };
  sharePct: number;
  works: DashboardWork[];
  totals: {
    works: number;
    live: number;
    inReview: number;
    /** Works whose upload never completed — private until the artist sends the rest. */
    incomplete: number;
    rejected: number;
    colourways: number;
    files: number;
    bytes: number;
    formats: { id: DeliverableFormatId; works: number }[];
  };
  gaps: DeliveryGaps;
  /** Current 30-day totals, previous 30 days for the deltas, and the daily series. */
  analytics: {
    range: { from: string; to: string; days: number };
    revenue: { fa: number; en: number };
    royalties: { fa: number; en: number };
    sales: number;
    downloads: number;
    views: number;
    conversionPct: number;
    averageOrder: { fa: number; en: number };
    previous: { revenue: { fa: number; en: number }; sales: number; downloads: number; views: number };
    series: { date: string; revenueFa: number; revenueEn: number; orders: number; downloads: number }[];
    topAssets: ArtistAnalytics["topAssets"];
    byLicense: ArtistAnalytics["byLicense"];
    topCountries: ArtistAnalytics["byCountry"];
    referral: ArtistAnalytics["referral"];
  };
  wallet: ArtistWallet;
  activity: { id: string; kind: string; amount: { fa: number; en: number }; note: string; at: string }[];
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

function zero() {
  return { fa: 0, en: 0 };
}

function sub(a: { fa: number; en: number }, b: { fa: number; en: number }) {
  return { fa: Math.max(0, a.fa - b.fa), en: Math.max(0, a.en - b.en) };
}

function priceFrom(asset: Asset): { fa: number; en: number } | null {
  const prices = asset.tiers.filter((tier) => tier.enabled).map((tier) => tier.price);
  if (prices.length === 0) return null;
  return {
    fa: Math.min(...prices.map((price) => price.fa)),
    en: Math.min(...prices.map((price) => price.en)),
  };
}

/** Turns one asset into the row the dashboard shows. */
export function toDashboardWork(asset: Asset): DashboardWork {
  const colourways = assetColourways(asset);
  const files = assetDeliverables(asset);
  const formats = assetFormatIds(asset);
  const recommended = DELIVERABLE_FORMATS.filter((format) => format.recommended).map((format) => format.id);

  return {
    id: asset.id,
    slug: asset.slug,
    title: asset.title,
    familyId: asset.familyId ?? null,
    status: asset.status,
    visibility: asset.visibility,
    uploadState: asset.uploadState ?? "complete",
    preview: asset.previewKey ?? colourways.find((colourway) => colourway.previewKey)?.previewKey ?? null,
    colourways: colourways.map((colourway) => {
      const own = files.filter((file) => file.colourwayId === colourway.id);
      return {
        id: colourway.id,
        name: colourway.name,
        hex: colourway.hex,
        preview: colourway.previewKey ?? null,
        files: own.length,
        bytes: own.reduce((sum, file) => sum + file.file.sizeBytes, 0),
      };
    }),
    formats,
    files: files.length,
    bytes: deliveryBytes(asset),
    missingFormats: recommended.filter((id) => !formats.includes(id)),
    priceFrom: priceFrom(asset),
    views: asset.stats.views,
    sales: asset.stats.sales,
    revenue: asset.stats.revenue ?? zero(),
    reviewNote: asset.rejectionNote,
    filesUpdatedAt: asset.review?.filesUpdatedAt,
    createdLabel: asset.createdAt,
  };
}

export async function getArtistDashboard(input: {
  artistId: string | null;
  userId: string;
}): Promise<ArtistDashboardData> {
  const content = await getContent();
  const artist =
    content.artists.find((entry) => entry.id === input.artistId) ??
    content.artists.find((entry) => entry.userId === input.userId) ??
    null;
  const artistId = artist?.id ?? input.artistId ?? "";

  const [assets, current, wider, wallet] = await Promise.all([
    artistId ? assetsByArtist(artistId) : Promise.resolve([] as Asset[]),
    artistId ? getArtistAnalytics({ artistId, days: 30 }) : null,
    /* 60 days gives us the previous 30 for the trend arrows without a second scan */
    artistId ? getArtistAnalytics({ artistId, days: 60 }) : null,
    artistId
      ? artistWalletDetails(artistId)
      : Promise.resolve(null),
  ]);

  const sharePct = await artistSharePct(artistId || null);

  const works = assets
    .map(toDashboardWork)
    .sort((a, b) => new Date(b.createdLabel).getTime() - new Date(a.createdLabel).getTime());

  /* Delivery coverage across every work — the "make it sell better" panel. */
  const formatCounts = new Map<DeliverableFormatId, number>();
  for (const work of works) {
    for (const id of work.formats) formatCounts.set(id, (formatCounts.get(id) ?? 0) + 1);
  }
  const gaps: DeliveryGaps = {
    singleColour: works.filter((work) => work.colourways.length < 2).length,
    missingFormats: DELIVERABLE_FORMATS.filter((format) => format.recommended)
      .map((format) => ({
        label: format.label,
        works: works.filter((work) => !work.formats.includes(format.id)).length,
      }))
      .filter((row) => row.works > 0),
    withoutPreview: works.filter((work) => !work.preview).length,
    thinDelivery: works.filter((work) => work.bytes > 0 && work.bytes < 1024 * 1024).length,
  };

  const series = current?.series ?? [];
  const previous = wider
    ? sub(
        {
          fa: wider.totals.revenue.fa - (current?.totals.revenue.fa ?? 0),
          en: wider.totals.revenue.en - (current?.totals.revenue.en ?? 0),
        },
        { fa: 0, en: 0 },
      )
    : zero();

  return {
    artist,
    artistName: artist?.name ?? { fa: "", en: "" },
    sharePct,
    works,
    totals: {
      works: works.length,
      live: works.filter((work) => work.status === "approved" && work.visibility === "public").length,
      inReview: works.filter(
        (work) =>
          work.uploadState !== "uploading" &&
          (work.status === "pending_review" || work.status === "uploading" || work.status === "scanning"),
      ).length,
      incomplete: works.filter((work) => work.uploadState === "uploading").length,
      rejected: works.filter((work) => work.status === "rejected").length,
      colourways: works.reduce((sum, work) => sum + work.colourways.length, 0),
      files: works.reduce((sum, work) => sum + work.files, 0),
      bytes: works.reduce((sum, work) => sum + work.bytes, 0),
      formats: [...formatCounts.entries()]
        .map(([id, count]) => ({ id, works: count }))
        .sort((a, b) => b.works - a.works),
    },
    gaps,
    analytics: {
      range: current?.range ?? { from: "", to: "", days: 30 },
      revenue: current?.totals.revenue ?? zero(),
      royalties: current?.totals.royalties ?? zero(),
      sales: current?.totals.sales ?? 0,
      downloads: current?.totals.downloads ?? 0,
      views: current?.totals.views ?? 0,
      conversionPct: current?.totals.conversionPct ?? 0,
      averageOrder: current?.totals.averageOrder ?? zero(),
      previous: {
        revenue: previous,
        sales: Math.max(0, (wider?.totals.sales ?? 0) - (current?.totals.sales ?? 0)),
        downloads: Math.max(0, (wider?.totals.downloads ?? 0) - (current?.totals.downloads ?? 0)),
        views: Math.max(0, (wider?.totals.views ?? 0) - (current?.totals.views ?? 0)),
      },
      series,
      topAssets: current?.topAssets ?? [],
      byLicense: current?.byLicense ?? [],
      topCountries: current?.byCountry ?? [],
      referral: current?.referral ?? { clicks: 0, conversions: 0, commission: zero() },
    },
    wallet:
      wallet ??
      ({
        artistId,
        balance: {
          total: zero(),
          paidOut: zero(),
          pending: zero(),
          available: zero(),
          salesCount: 0,
        },
        profile: null,
        payouts: [],
        ledger: [],
        minimum: { fa: 0, en: 0 },
        licenses: 0,
        monthly: [],
      } as ArtistWallet),
    activity: (wallet?.ledger ?? []).slice(0, 8).map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      amount: entry.amount,
      note: entry.note?.fa ?? entry.note?.en ?? "",
      at: entry.createdAt,
    })),
  };
}
