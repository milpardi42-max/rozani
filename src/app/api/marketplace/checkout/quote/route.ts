import { quote } from "@/lib/marketplace/orders";
import { json, readJson, session } from "@/lib/marketplace/guard";
import type { PaymentProviderId } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/checkout/quote
 *
 * Prices a cart without creating an order — the UI calls this on every change
 * so the buyer always sees the same numbers the server will charge, including
 * VAT, coupons, subscription redemptions and the gateway currency.
 */
export async function POST(request: Request) {
  const user = await session();
  const body = await readJson<{
    items?: { assetId?: string; tierId?: string; viaSubscriptionId?: string }[];
    planId?: string | null;
    couponCode?: string | null;
    affiliateCode?: string | null;
    provider?: PaymentProviderId;
  }>(request);

  const items = (body?.items ?? []).filter(
    (item): item is { assetId: string; tierId: string; viaSubscriptionId?: string } => Boolean(item?.assetId && item?.tierId),
  );
  if (!items.length && !body?.planId) return json({ ok: false, error: "empty_cart" }, { status: 400 });

  const result = await quote({
    lines: items,
    planId: body?.planId ?? null,
    couponCode: body?.couponCode ?? null,
    affiliateCode: body?.affiliateCode ?? null,
    provider: body?.provider ?? "zarinpal",
    userId: user?.id ?? null,
    buyerEmail: user?.email,
  });

  return json({ ok: true, quote: result });
}
