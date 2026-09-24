import { deleteCoupon, getCoupons, saveCoupon } from "@/lib/marketplace/orders";
import { getReferralStats } from "@/lib/marketplace/analytics";
import { getSettings } from "@/lib/marketplace/assets";
import { fail, json, readJson, requireArtistOrAdmin } from "@/lib/marketplace/guard";
import type { Coupon } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

/**
 * Artist/affiliate promo codes.
 *
 * A coupon with `affiliateUserId` doubles as a referral link
 * (`/{locale}/marketplace?ref=CODE`): the buyer gets the discount, the referrer
 * earns `affiliatePct` of the platform fee — both recorded on the order and
 * paid through the ordinary ledger. Landing pages count the click, the cart
 * remembers the code and checkout applies it.
 */

function normaliseCode(raw: string) {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 20);
}

export async function GET(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "fa";

  const [coupons, settings] = await Promise.all([getCoupons(), getSettings()]);
  const mine = auth.user.role === "admin"
    ? coupons
    : coupons.filter((coupon) => coupon.artistId === auth.user.artistId || coupon.affiliateUserId === auth.user.id);

  const stats = await getReferralStats();
  const statsByCode = new Map(stats.map((row) => [row.code.toUpperCase(), row]));

  return json({
    ok: true,
    affiliatePct: settings.affiliatePct,
    discounts: settings.affiliateDiscountPct,
    coupons: mine.map((coupon) => ({
      ...coupon,
      stats: statsByCode.get(coupon.code.toUpperCase()) ?? { clicks: 0, conversions: coupon.redemptions, commission: { fa: 0, en: 0 }, revenue: { fa: 0, en: 0 } },
      shareUrl: `/${locale}/marketplace?ref=${coupon.code}`,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJson<{
    action?: "create" | "update" | "delete";
    code?: string;
    kind?: Coupon["kind"];
    percent?: number;
    fixedFa?: number;
    fixedEn?: number;
    maxRedemptions?: number;
    expiresAt?: string;
    asAffiliate?: boolean;
    minSubtotalFa?: number;
    assetIds?: string[];
    active?: boolean;
  }>(request);

  const code = normaliseCode(body?.code ?? "");
  if (!code) return fail("invalid_code");

  if (body?.action === "delete") {
    const coupons = await getCoupons();
    const existing = coupons.find((item) => item.code.toUpperCase() === code);
    if (!existing) return fail("not_found", 404);
    if (auth.user.role !== "admin" && existing.artistId !== auth.user.artistId && existing.affiliateUserId !== auth.user.id) {
      return fail("forbidden", 403);
    }
    await deleteCoupon(code);
    return json({ ok: true, deleted: code });
  }

  const settings = await getSettings();
  const isAdmin = auth.user.role === "admin";
  const asAffiliate = Boolean(body?.asAffiliate) || !isAdmin;

  const percent = Math.min(Math.max(body?.percent ?? settings.affiliateDiscountPct, 0), 90);

  const coupon: Coupon = {
    code,
    kind: body?.kind ?? "percent",
    percent: body?.kind === "fixed" ? undefined : percent,
    fixed: body?.kind === "fixed" ? { fa: Math.max(0, Math.round(body.fixedFa ?? 0)), en: Math.max(0, body.fixedEn ?? 0) } : undefined,
    active: body?.active ?? true,
    maxRedemptions: body?.maxRedemptions,
    redemptions: 0,
    expiresAt: body?.expiresAt,
    minSubtotal: body?.minSubtotalFa ? { fa: body.minSubtotalFa, en: 0 } : undefined,
    assetIds: body?.assetIds?.length ? body.assetIds : undefined,
    artistId: isAdmin ? undefined : auth.user.artistId ?? undefined,
    affiliateUserId: asAffiliate ? auth.user.id : undefined,
    affiliatePct: asAffiliate ? Math.min(settings.affiliatePct, 50) : undefined,
    internationalOnly: false,
    createdAt: new Date().toISOString(),
  };

  /* artists can only discount their own catalogue */
  if (!isAdmin && !coupon.assetIds?.length) {
    const { getAssets } = await import("@/lib/marketplace/assets");
    const assets = await getAssets();
    const owned = assets
      .filter((asset) => asset.artistId === auth.user.artistId || asset.ownerUserId === auth.user.id)
      .map((asset) => asset.id);
    if (!owned.length) return fail("no_assets", 409);
    coupon.assetIds = owned;
  }

  const saved = await saveCoupon(coupon);
  return json({ ok: true, coupon: saved });
}
