import { quote, createOrder, fulfillOrder, setOrderStatus, getSubscriptionForUser } from "@/lib/marketplace/orders";
import { startPayment, getProvider } from "@/lib/marketplace/payments";
import { clientIp, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";
import { fail, json, readJson, session } from "@/lib/marketplace/guard";
import { recordEvent } from "@/lib/marketplace/analytics";
import { sendSubscriptionReceipt } from "@/lib/marketplace/email";
import { SUBSCRIPTION_PLANS } from "@/lib/marketplace/config";
import type { OrderLine, PaymentProviderId } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/checkout
 *
 * Creates the order from a server-side quote and opens the payment session.
 *
 * Two outcomes are possible:
 *
 *   • **payable** — an order is created with `pending_payment` and the response
 *     carries `redirectUrl` (Zarinpal StartPay, Stripe Checkout, or the built-in
 *     sandbox gateway when no live credentials exist).
 *   • **free** — the total is zero (100% coupon or a subscription redemption):
 *     the order is marked paid and fulfilled immediately, and the response
 *     carries the delivered licenses so the UI can offer the downloads.
 */
export async function POST(request: Request) {
  const user = await session();

  const ip = clientIp(request);
  const limitKey = `marketplace-checkout:${ip}`;
  if (tooManyAttempts(limitKey)) return fail("too_many_attempts", 429);
  recordAttempt(limitKey);

  const body = await readJson<{
    items?: { assetId?: string; tierId?: string; viaSubscriptionId?: string }[];
    planId?: string | null;
    couponCode?: string | null;
    affiliateCode?: string | null;
    provider?: PaymentProviderId;
    buyer?: { name?: string; email?: string; phone?: string; company?: string; country?: string; vatId?: string };
    locale?: "fa" | "en";
    /** Set when redeeming a subscription pass instead of paying. */
    useSubscription?: boolean;
  }>(request);

  const locale = body?.locale === "en" ? "en" : "fa";
  const providerId: PaymentProviderId = body?.provider ?? (locale === "en" ? "stripe" : "zarinpal");
  const items = (body?.items ?? []).filter(
    (item): item is { assetId: string; tierId: string; viaSubscriptionId?: string } => Boolean(item?.assetId && item?.tierId),
  );

  if (!items.length && !body?.planId) return fail("empty_cart");

  const buyer = {
    name: body?.buyer?.name?.trim() || user?.name || (locale === "fa" ? "خریدار مهمان" : "Guest buyer"),
    email: body?.buyer?.email?.trim() || user?.email || "",
    phone: body?.buyer?.phone?.trim(),
    company: body?.buyer?.company?.trim(),
    country: body?.buyer?.country?.trim(),
    vatId: body?.buyer?.vatId?.trim(),
  };
  if (!buyer.email || !buyer.email.includes("@")) return fail("invalid_email");

  /* ---------- subscription redemption: inject the pass id ---------- */
  let lines = items;
  if (body?.useSubscription && user) {
    const pass = await getSubscriptionForUser(user.id);
    if (!pass) return fail("no_subscription", 409);
    lines = items.map((item) => ({ ...item, viaSubscriptionId: pass.id }));
  }

  const priced = await quote({
    lines,
    planId: body?.planId ?? null,
    couponCode: body?.couponCode ?? null,
    affiliateCode: body?.affiliateCode ?? null,
    provider: providerId,
    userId: user?.id ?? null,
    buyerEmail: buyer.email,
  });

  if (priced.errors.length && !priced.lines.length && !priced.subscription) {
    return fail("unavailable", 409, { errors: priced.errors });
  }
  if (!priced.lines.length && !priced.subscription) return fail("empty_cart");

  const orderLines: OrderLine[] = priced.lines.map((line) => ({
    assetId: line.assetId,
    tierId: line.tierId,
    title: line.title.en || line.title.fa,
    kind: line.kind,
    licenseKind: line.licenseKind,
    price: line.price,
    discount: line.discount,
    ...(line.coveredByPass ? { coveredByPass: true, viaSubscriptionId: line.viaSubscriptionId } : {}),
  }));

  const order = await createOrder({
    userId: user?.id ?? null,
    buyer,
    lines: orderLines,
    subscription: priced.subscription ? { planId: priced.subscription.plan.id, price: priced.subscription.price } : undefined,
    subtotal: priced.subtotal,
    discount: priced.discount,
    tax: priced.tax,
    total: priced.total,
    charge: priced.charge,
    couponCode: priced.coupon?.code,
    coupon: priced.coupon,
  });

  void recordEvent({
    kind: "checkout_start",
    userId: user?.id ?? null,
    value: priced.total,
    meta: { orderId: order.id, provider: providerId },
  });

  /* ---------- free order: fulfil right away ---------- */
  if (!priced.payable) {
    await setOrderStatus(order.id, "paid");
    const fulfillment = await fulfillOrder(order.id, { provider: "wallet" });

    if (order.subscription && user) {
      const pass = await getSubscriptionForUser(user.id);
      const plan = SUBSCRIPTION_PLANS.find((item) => item.id === order.subscription!.planId);
      if (pass && plan) {
        await sendSubscriptionReceipt({
          order,
          planTitle: plan.title,
          periodEnd: pass.currentPeriodEnd,
          locale,
        });
      }
    }

    return json({
      ok: true,
      mode: "free",
      order: { id: order.id, total: order.total, status: "paid" },
      licenses: fulfillment.licenses.map((license) => ({
        id: license.id,
        serial: license.serial,
        title: license.title,
        assetId: license.assetId,
        maxDownloads: license.maxDownloads,
      })),
    });
  }

  /* ---------- paid order: open the gateway ---------- */
  const started = await startPayment(order, providerId, {
    locale,
    description:
      locale === "fa"
        ? `خرید ${orderLines.length} فایل دیجیتال از رزی آتلیه`
        : `${orderLines.length} digital file(s) from Rosie Atelier`,
  });

  if (!started.ok || !started.redirectUrl) {
    await setOrderStatus(order.id, "failed", started.error);
    return fail("gateway_error", 502, { error: started.error, orderId: order.id });
  }

  const provider = getProvider(providerId);
  return json({
    ok: true,
    mode: "payment",
    order: {
      id: order.id,
      total: order.total,
      charge: started.charge,
      status: "pending_payment",
    },
    payment: {
      provider: providerId,
      providerLabel: provider.label,
      sandbox: started.sandbox,
      reference: started.reference,
      redirectUrl: started.redirectUrl,
      mode: provider.mode(),
    },
    /* A mistyped coupon must never silently drop the discount. */
    couponError: priced.couponError ?? null,
  });
}
