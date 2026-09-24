import { evalCouponPublic } from "@/lib/marketplace/coupon-api";
import { trackReferralClick } from "@/lib/marketplace/analytics";
import { json, readJson, session } from "@/lib/marketplace/guard";
import { clientIp, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/coupons — public coupon check for the cart drawer.
 *
 * Returns the computed discount for the *current* cart, so the UI never has to
 * trust a client-side percentage. Also records referral clicks when a code is
 * flagged as an affiliate code.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limitKey = `marketplace-coupon:${ip}`;
  if (tooManyAttempts(limitKey)) return json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  recordAttempt(limitKey);

  const body = await readJson<{
    code?: string;
    items?: { assetId?: string; tierId?: string }[];
    planId?: string | null;
    provider?: "zarinpal" | "stripe" | "wallet";
    trackClick?: boolean;
  }>(request);

  const code = (body?.code ?? "").trim().toUpperCase();
  if (!code) return json({ ok: false, error: "missing_code" }, { status: 400 });

  const user = await session();
  const items = (body?.items ?? []).filter(
    (item): item is { assetId: string; tierId: string } => Boolean(item?.assetId && item?.tierId),
  );

  if (body?.trackClick) await trackReferralClick(code);

  const result = await evalCouponPublic({
    code,
    items,
    planId: body?.planId ?? null,
    provider: body?.provider ?? "zarinpal",
    userId: user?.id ?? null,
  });

  return json(result);
}
