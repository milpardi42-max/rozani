import { getOrder } from "@/lib/marketplace/orders";
import { completePayment, getProvider } from "@/lib/marketplace/payments";
import { decideSandboxTransaction, getSandboxTransaction, isSandboxAuthority, parseSandboxAuthority } from "@/lib/marketplace/payments/sandbox";
import { NextResponse } from "next/server";
import { fail, json, readJson } from "@/lib/marketplace/guard";
import { siteUrl } from "@/lib/marketplace/config";

export const dynamic = "force-dynamic";

/**
 * The sandbox "bank" behind `/{locale}/checkout/sandbox`.
 *
 *   GET  → the details the confirm page renders (amount, merchant, reference).
 *   POST → the buyer's decision. On success the payment is settled through the
 *          *same* `completePayment()` used by the live callback, so a test
 *          purchase produces identical records: payment attempt, licence rows,
 *          royalty ledger entries, asset stats, e-mails and certificates.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get("authority") ?? "";
  if (!authority || !isSandboxAuthority(authority)) return fail("invalid_authority", 400);

  const info = parseSandboxAuthority(authority);
  const transaction = await getSandboxTransaction(authority);
  if (!info || !transaction) return fail("not_found", 404);

  const provider = getProvider(transaction.provider as "zarinpal" | "stripe");
  return json({
    ok: true,
    authority,
    orderId: transaction.orderId,
    amount: transaction.amount,
    status: transaction.status,
    provider: transaction.provider,
    providerLabel: provider.label,
    sandbox: true,
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  /*
   * Two call shapes:
   *   • JSON (the storefront's client component) → answers with `redirectUrl`.
   *   • a plain HTML form post → answers with a real 303, so the sandbox page
   *     still works with JavaScript disabled.
   */
  const formPost = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
  let raw: { authority?: string; outcome?: "paid" | "failed" | "canceled"; locale?: "fa" | "en" } | null = null;
  if (!formPost) {
    raw = await readJson<{ authority?: string; outcome?: "paid" | "failed" | "canceled"; locale?: "fa" | "en" }>(request);
  } else {
    const form = await request.formData().catch(() => null);
    raw = form
      ? {
          authority: String(form.get("authority") ?? ""),
          outcome: (String(form.get("outcome") ?? "paid") as "paid" | "failed" | "canceled"),
          locale: form.get("locale") === "en" ? "en" : "fa",
        }
      : null;
  }
  const body = raw;
  const authority = body?.authority ?? "";
  const outcome = body?.outcome ?? "paid";
  if (!authority || !isSandboxAuthority(authority)) return fail("invalid_authority", 400);

  const info = parseSandboxAuthority(authority);
  const transaction = await getSandboxTransaction(authority);
  if (!info || !transaction) return fail("not_found", 404);

  const order = await getOrder(transaction.orderId);
  if (!order) return fail("order_not_found", 404);

  const locale = body?.locale ?? (order.charge.currency === "USD" ? "en" : "fa");
  const providerId = transaction.provider as "zarinpal" | "stripe";

  /* Idempotent: pressing "pay" twice must not double-charge or double-issue. */
  const decided = await decideSandboxTransaction(authority, outcome, { locale });
  const returnUrl = `/${locale}/checkout/return?order=${order.id}&provider=${providerId}&authority=${encodeURIComponent(authority)}`;

  const done = (query: { ok: boolean; settled?: boolean; status?: string; licenses?: unknown; error?: string }) =>
    formPost
      ? NextResponse.redirect(`${siteUrl()}${returnUrl}&settled=${query.ok ? "1" : "0"}`, 303)
      : json({ ...query, redirectUrl: `${siteUrl()}${returnUrl}` });

  if (decided?.status !== "paid") {
    const { cancelPayment } = await import("@/lib/marketplace/payments");
    const { setOrderStatus } = await import("@/lib/marketplace/orders");
    if (decided?.status === "canceled") await cancelPayment(order.id, authority);
    if (decided?.status === "failed") await setOrderStatus(order.id, "failed", "sandbox_declined");
    return done({ ok: false, settled: false, status: decided?.status ?? "failed" });
  }

  const completed = await completePayment(order.id, authority, providerId);
  return done({
    ok: completed.ok,
    settled: completed.ok,
    status: completed.status,
    licenses: completed.licenses,
    error: completed.error,
  });
}
