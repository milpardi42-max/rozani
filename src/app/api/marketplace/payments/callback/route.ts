import { NextResponse } from "next/server";
import { absoluteUrl, SUBSCRIPTION_PLANS } from "@/lib/marketplace/config";
import { cancelPayment, completePayment } from "@/lib/marketplace/payments";
import { getOrder, setOrderStatus, getSubscriptionForUser } from "@/lib/marketplace/orders";
import { sendSubscriptionReceipt } from "@/lib/marketplace/email";
import type { PaymentProviderId } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

/**
 * Gateway return URL — where money becomes a license.
 *
 * Handles both conventions:
 *   • Zarinpal  → `?Authority=…&Status=OK|NOK` (the sandbox uses `authority`)
 *   • Stripe    → `?session_id=…` (Checkout redirect) or `?authority=…` (sandbox)
 *
 * Work is delegated to `completePayment()`, the same function the sandbox page
 * calls, so a test purchase and a live purchase produce identical records.
 * Fulfilment is idempotent, so a duplicated callback is harmless.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const providerParam = (url.searchParams.get("provider") ?? "zarinpal") as PaymentProviderId;
  const reference =
    url.searchParams.get("authority") ??
    url.searchParams.get("Authority") ??
    url.searchParams.get("session_id") ??
    url.searchParams.get("ref") ??
    "";
  const status = (url.searchParams.get("Status") ?? url.searchParams.get("status") ?? "").toUpperCase();

  /* Order lookup: prefer ?order=, fall back to matching the attempt reference. */
  const orderId = url.searchParams.get("order");
  let order = orderId ? await getOrder(orderId) : null;

  if (!order && reference) {
    const { getAttempts } = await import("@/lib/marketplace/payments");
    const attempt = (await getAttempts()).find((item) => item.reference === reference);
    order = attempt ? await getOrder(attempt.orderId) : null;
  }

  const locale = (url.searchParams.get("locale") ?? (order?.charge.currency === "USD" ? "en" : "fa")) as "fa" | "en";
  const redirect = (query: Record<string, string>) =>
    NextResponse.redirect(absoluteUrl(`/${locale}/checkout/return?${new URLSearchParams(query).toString()}`), 303);

  if (!order) return redirect({ status: "unknown_order", reference: reference.slice(0, 40) });

  /* The buyer cancelled or the PSP declined before verification. */
  if (status === "NOK" || status === "CANCELED" || status === "CANCELLED" || status === "FAILED") {
    await cancelPayment(order.id, reference);
    await setOrderStatus(order.id, status === "NOK" ? "canceled" : "failed", `gateway_${status}`);
    return redirect({ order: order.id, status: status === "NOK" ? "canceled" : "failed" });
  }

  const completed = await completePayment(order.id, reference, providerParam);

  if (!completed.ok) {
    return redirect({ order: order.id, status: "failed", error: completed.error ?? "verify_failed" });
  }

  /* Subscription purchases also get a dedicated receipt. */
  if (order.subscription && order.userId) {
    const pass = await getSubscriptionForUser(order.userId);
    const plan = SUBSCRIPTION_PLANS.find((item) => item.id === order.subscription!.planId);
    if (pass && plan) {
      await sendSubscriptionReceipt({ order, planTitle: plan.title, periodEnd: pass.currentPeriodEnd, locale }).catch(() => undefined);
    }
  }

  return redirect({ order: order.id, status: "paid", licenses: String(completed.licenses.length) });
}
