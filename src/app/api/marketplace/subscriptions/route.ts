import { SUBSCRIPTION_PLANS } from "@/lib/marketplace/config";
import { cancelSubscription, getSubscriptionForUser, quote, refreshSubscriptionPeriod, subscriptionQuota } from "@/lib/marketplace/orders";
import { json, readJson, session, fail } from "@/lib/marketplace/guard";
import { redeemWithSubscription } from "@/lib/marketplace/downloads";
import { getAssets } from "@/lib/marketplace/assets";

export const dynamic = "force-dynamic";

/**
 * GET  /api/marketplace/subscriptions — plans + the caller's pass and quota.
 * POST /api/marketplace/subscriptions — redeem a file with the pass, or cancel.
 */
export async function GET() {
  const user = await session();
  const pass = user ? await getSubscriptionForUser(user.id) : null;
  const refreshed = pass ? await refreshSubscriptionPeriod(pass) : null;
  const plan = refreshed ? SUBSCRIPTION_PLANS.find((item) => item.id === refreshed.planId) ?? null : null;

  return json({
    ok: true,
    plans: SUBSCRIPTION_PLANS.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      downloadsPerMonth: item.downloadsPerMonth,
      covers: item.covers,
      excludesExclusive: item.excludesExclusive,
      features: item.features,
      featured: item.featured ?? false,
      order: item.order,
    })),
    subscription: refreshed && plan
      ? {
          id: refreshed.id,
          planId: refreshed.planId,
          planTitle: plan.title,
          status: refreshed.status,
          startedAt: refreshed.startedAt,
          currentPeriodStart: refreshed.currentPeriodStart,
          currentPeriodEnd: refreshed.currentPeriodEnd,
          downloadsUsed: refreshed.downloadsUsed,
          quota: subscriptionQuota(refreshed, plan),
          autoRenew: refreshed.autoRenew,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const user = await session();
  if (!user) return fail("unauthorized", 401);

  const body = await readJson<{
    action?: "redeem" | "cancel" | "quote";
    assetId?: string;
    tierId?: string;
  }>(request);

  if (body?.action === "cancel") {
    const canceled = await cancelSubscription(user.id);
    return json({ ok: Boolean(canceled), subscription: canceled });
  }

  const pass = await getSubscriptionForUser(user.id);
  if (!pass) return fail("no_subscription", 409);

  if (body?.action === "quote") {
    if (!body.assetId || !body.tierId) return fail("invalid_payload");
    const priced = await quote({
      lines: [{ assetId: body.assetId, tierId: body.tierId, viaSubscriptionId: pass.id }],
      provider: "zarinpal",
      userId: user.id,
    });
    return json({ ok: true, covered: priced.total.fa === 0 && priced.total.en === 0, quote: priced });
  }

  if (body?.action === "redeem") {
    if (!body.assetId || !body.tierId) return fail("invalid_payload");
    const grant = await redeemWithSubscription({ userId: user.id, assetId: body.assetId, tierId: body.tierId });
    if (!grant.ok) return fail(grant.reason ?? "not_allowed", 409, { reason: grant.reason });

    const asset = (await getAssets()).find((item) => item.id === body.assetId);
    return json({
      ok: true,
      remaining: grant.remaining === Number.POSITIVE_INFINITY ? null : grant.remaining,
      asset: asset ? { id: asset.id, title: asset.title, slug: asset.slug } : null,
      message: { fa: "این فایل با اشتراک شما پوشش داده شد.", en: "This file is covered by your pass." },
    });
  }

  return fail("invalid_action");
}
