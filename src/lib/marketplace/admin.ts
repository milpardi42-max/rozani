import "server-only";
import { capabilities, storageProvider, zarinpalMerchantId, stripeSecret, mailProvider, clamavHost } from "./config";
import { filterAssets, getAssets, saveAsset, setAssetStatus, setAssetVisibility, updateAssetTiers, getSettings, saveSettings } from "./assets";
import { deleteObject } from "./storage";
import { getOrders, getLicenses, setOrderStatus, refundOrder, fulfillOrder } from "./orders";
import { listPayouts } from "./payouts";
import { getOutbox } from "./email";
import { getPlatformAnalytics } from "./analytics";
import { marketplaceBackendName } from "./store";
import type { Asset, AssetStatus, LicenseTier, MarketplaceOrder, OutboxMessage } from "./types";
import type { MarketplaceCapabilities } from "./types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Admin surface for the marketplace: the review queue, moderation decisions,
 * order operations and the capability report that tells the operator exactly
 * which integrations are live in this deployment.
 */

/* ------------------------------------------------------------------ */
/* Review queue                                                        */
/* ------------------------------------------------------------------ */

export interface ReviewQueueItem {
  asset: Asset;
  artistName: Localized;
  ownerEmail: string | null;
  warnings: Localized[];
}

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const [assets, users] = await Promise.all([
    getAssets(),
    import("@/lib/data/users").then((module) => module.getAllUsers()),
  ]);
  const { getContent } = await import("@/lib/data/store");
  const content = await getContent().catch(() => null);

  const pending = filterAssets(assets, { status: "pending_review" });
  const rejected = filterAssets(assets, { status: "rejected" });
  const queue = [...pending, ...rejected.slice(0, 20)];

  return queue.map((asset) => {
    const artist = content?.artists.find((item) => item.id === asset.artistId);
    const owner = users.find((user) => user.id === asset.ownerUserId);
    const warnings: Localized[] = [];

    if (asset.scan.status === "suspicious") {
      warnings.push({ fa: "اسکنر ویروس موارد مشکوک پیدا کرد", en: "Virus scanner flagged suspicious content" });
    }
    if (asset.scan.status === "infected") {
      warnings.push({ fa: "فایل آلوده شناسایی شد", en: "File identified as infected" });
    }
    if (asset.seamless.verdict === "not-seamless") {
      warnings.push({ fa: "الگو بی‌درز نیست", en: "Pattern is not seamless" });
    }
    if (asset.seamless.verdict === "near-seamless") {
      warnings.push({ fa: "درزبندی تقریبی — بازبینی چشمی لازم است", en: "Near-seamless — visual check recommended" });
    }
    if (!asset.derivatives.length) {
      warnings.push({ fa: "پیش‌نمایش تصویری ساخته نشد", en: "No image preview could be generated" });
    }
    if (!asset.master.sha256) {
      warnings.push({ fa: "چک‌سام فایل ثبت نشده", en: "File checksum missing" });
    }

    return {
      asset,
      artistName: artist?.name ?? { fa: "بدون هنرمند", en: "Unattributed" },
      ownerEmail: owner?.email ?? null,
      warnings,
    };
  });
}

export interface ApproveOptions {
  adminEmail: string;
  /** Publish immediately (default true) or keep it as a private draft. */
  publish?: boolean;
  tiers?: LicenseTier[];
  note?: string;
}

export async function approveAsset(assetId: string, options: ApproveOptions): Promise<Asset | null> {
  if (options.tiers) await updateAssetTiers(assetId, options.tiers);
  const asset = await setAssetStatus(assetId, "approved", { reviewedBy: options.adminEmail, note: options.note });
  if (!asset) return null;
  const published = await setAssetVisibility(assetId, options.publish === false ? "private" : "public");
  return published ?? asset;
}

export async function rejectAsset(assetId: string, adminEmail: string, note: string): Promise<Asset | null> {
  const asset = await setAssetStatus(assetId, "rejected", { reviewedBy: adminEmail, note });
  if (asset) await setAssetVisibility(assetId, "private");
  return asset;
}

export async function delistAsset(assetId: string): Promise<Asset | null> {
  const asset = await setAssetVisibility(assetId, "private");
  return asset;
}

export async function relistAsset(assetId: string): Promise<Asset | null> {
  const asset = await setAssetVisibility(assetId, "public");
  return asset;
}

export async function editAssetBasics(
  assetId: string,
  patch: Partial<Pick<Asset, "title" | "description" | "tags" | "kind" | "revenueSharePct" | "status">>,
): Promise<Asset | null> {
  const assets = await getAssets();
  const asset = assets.find((item) => item.id === assetId);
  if (!asset) return null;
  return saveAsset({ ...asset, ...patch });
}

/** Permanently removes an asset plus its stored objects. */
export async function purgeAsset(assetId: string): Promise<boolean> {
  const assets = await getAssets();
  const asset = assets.find((item) => item.id === assetId);
  if (!asset) return false;
  const { deleteAsset } = await import("./assets");
  return deleteAsset(assetId);
}

/** Rebuilds previews/mockups for an asset using the current watermark settings. */
export async function regenerateDerivatives(assetId: string): Promise<Asset | null> {
  const assets = await getAssets();
  const asset = assets.find((item) => item.id === assetId);
  if (!asset) return null;
  try {
    const { getBuffer, deleteObject: remove } = await import("./storage");
    const { buildDerivatives } = await import("./media");
    const master = await getBuffer(asset.master.key);
    const derived = await buildDerivatives({
      assetId: asset.id,
      master,
      watermarkLines: ["Rosie Atelier", "PREVIEW", "رزی آتلیه"],
      cornerTag: asset.id.slice(0, 12).toUpperCase(),
    });
    for (const file of [...asset.derivatives, ...asset.mockups]) {
      await remove(file.key).catch(() => undefined);
    }
    return saveAsset({
      ...asset,
      derivatives: derived.derivatives,
      mockups: derived.mockups,
      previewKey: derived.previewKey,
      tileKey: derived.tileKey,
      seamless: derived.seamless,
    });
  } catch (error) {
    console.error("[marketplace] regenerateDerivatives failed:", error);
    return null;
  }
}

/** Re-runs the virus scan on the stored master. */
export async function rescanAsset(assetId: string): Promise<Asset | null> {
  const assets = await getAssets();
  const asset = assets.find((item) => item.id === assetId);
  if (!asset) return null;
  const { getBuffer } = await import("./storage");
  const { scanBuffer } = await import("./scanner");
  const buffer = await getBuffer(asset.master.key);
  const scan = await scanBuffer(buffer, asset.master.filename);
  return saveAsset({ ...asset, scan });
}

/* ------------------------------------------------------------------ */
/* Orders / licenses / payouts                                         */
/* ------------------------------------------------------------------ */

export interface AdminOrderFilter {
  status?: MarketplaceOrder["status"];
  search?: string;
  limit?: number;
}

export async function adminOrders(filter: AdminOrderFilter = {}): Promise<MarketplaceOrder[]> {
  const orders = await getOrders();
  const needle = filter.search?.trim().toLowerCase();
  const filtered = orders.filter((order) => {
    if (filter.status && order.status !== filter.status) return false;
    if (needle) {
      const haystack = `${order.id} ${order.buyer.name} ${order.buyer.email}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
  return filtered
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, filter.limit ?? 200);
}

export async function adminOrderDetail(orderId: string) {
  const orders = await getOrders();
  const order = orders.find((item) => item.id === orderId) ?? null;
  if (!order) return null;
  const licenses = (await getLicenses()).filter((license) => license.orderId === orderId);
  const { getAttemptsByOrder } = await import("./payments");
  const attempts = await getAttemptsByOrder(orderId);
  return { order, licenses, attempts };
}

export const adminOps = {
  fulfillOrder,
  setOrderStatus,
  refundOrder,
  listPayouts,
  getOutbox,
};

/* ------------------------------------------------------------------ */
/* Capabilities & stats                                               */
/* ------------------------------------------------------------------ */

export interface AdminStatus {
  capabilities: MarketplaceCapabilities;
  backend: "redis" | "file";
  counts: {
    assets: number;
    pending: number;
    approved: number;
    rejected: number;
    soldExclusive: number;
    orders: number;
    licenses: number;
    downloads: number;
  };
  integrations: { id: string; label: Localized; configured: boolean; mode: string; note: string }[];
  settings: Awaited<ReturnType<typeof getSettings>>;
}

export async function adminStatus(): Promise<AdminStatus> {
  const [caps, assets, orders, licenses, settings] = await Promise.all([
    capabilities(),
    getAssets(),
    getOrders(),
    getLicenses(),
    getSettings(),
  ]);

  const counts = {
    assets: assets.length,
    pending: assets.filter((asset) => asset.status === "pending_review").length,
    approved: assets.filter((asset) => asset.status === "approved").length,
    rejected: assets.filter((asset) => asset.status === "rejected").length,
    soldExclusive: assets.filter((asset) => asset.status === "sold_exclusive").length,
    orders: orders.length,
    licenses: licenses.length,
    downloads: licenses.reduce((sum, license) => sum + license.downloads.length, 0),
  };

  return {
    capabilities: caps,
    backend: marketplaceBackendName(),
    counts,
    integrations: [
      {
        id: "storage",
        label: { fa: "فضای ذخیره‌سازی خصوصی", en: "Private object storage" },
        configured: true,
        mode: storageProvider(),
        note: caps.privateStorage.note,
      },
      {
        id: "multipart",
        label: { fa: "آپلود چندبخشی", en: "Multipart upload" },
        configured: true,
        mode: `${Math.round(caps.multipart.partSize / 1024 / 1024)} MB parts · ≥${Math.round(caps.multipart.thresholdBytes / 1024 / 1024)} MB`,
        note: caps.multipart.note,
      },
      {
        id: "clamav",
        label: { fa: "اسکن ویروس", en: "Virus scanning" },
        configured: Boolean(clamavHost()),
        mode: caps.virusScan.engine,
        note: caps.virusScan.note,
      },
      {
        id: "watermark",
        label: { fa: "واترمارک", en: "Watermarking" },
        configured: true,
        mode: caps.watermark.engine,
        note: caps.watermark.note,
      },
      {
        id: "certificate",
        label: { fa: "گواهی PDF", en: "PDF certificate" },
        configured: true,
        mode: "pdf-lib + Iranian font outlines",
        note: caps.certificates.note,
      },
      {
        id: "zarinpal",
        label: { fa: "زرین‌پال", en: "Zarinpal" },
        configured: Boolean(zarinpalMerchantId()),
        mode: caps.zarinpal.mode,
        note: caps.zarinpal.note,
      },
      {
        id: "stripe",
        label: { fa: "Stripe", en: "Stripe" },
        configured: Boolean(stripeSecret()),
        mode: caps.stripe.mode,
        note: caps.stripe.note,
      },
      {
        id: "email",
        label: { fa: "ایمیل تراکنشی", en: "Transactional e-mail" },
        configured: mailProvider() !== "outbox",
        mode: mailProvider(),
        note: caps.email.note,
      },
    ],
    settings,
  };
}

export async function adminDashboard(days = 30) {
  const [analytics, status] = await Promise.all([getPlatformAnalytics(days), adminStatus()]);
  return { analytics, status };
}

export async function updateSettings(patch: Parameters<typeof saveSettings>[0]) {
  return saveSettings(patch);
}

/** Frees storage of a rejected asset without deleting the record. */
export async function purgeAssetObjects(asset: Asset): Promise<void> {
  await deleteObject(asset.master.key).catch(() => undefined);
  for (const file of [...asset.derivatives, ...asset.mockups]) {
    await deleteObject(file.key).catch(() => undefined);
  }
}

export type { AssetStatus, OutboxMessage };
