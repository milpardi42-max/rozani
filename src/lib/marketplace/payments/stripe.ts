import "server-only";
import { stripeSecret } from "../config";
import {
  createSandboxTransaction,
  getSandboxTransaction,
  isSandboxAuthority,
  mintAuthority,
  parseSandboxAuthority,
  sandboxStatusToPaymentStatus,
} from "./sandbox";
import type {
  PaymentInitInput,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from "./types";

/**
 * Stripe — international card payments.
 *
 *   LIVE    `STRIPE_SECRET_KEY` set → Checkout Session in `payment` mode with
 *           the buyer's currency (USD), then `retrieve` on return to confirm
 *           `payment_status === "paid"`.
 *
 *   SANDBOX no key → same three-step contract on the sandbox gateway, which is
 *           what makes test purchases possible without live keys.
 */

const API = "https://api.stripe.com/v1";
/** Where the buyer is sent when no live Stripe key is configured. */
const sandboxPath = (locale: "fa" | "en") => `/${locale}/checkout/sandbox`;

interface StripeSession {
  id: string;
  url: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  payment_intent?: string;
  customer_details?: { email?: string | null; name?: string | null };
  status?: string;
}

async function stripeRequest<T>(path: string, body: Record<string, string>): Promise<T> {
  const secret = stripeSecret();
  if (!secret) throw new Error("stripe_not_configured");
  const response = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
      // Stripe requires a stable API version pin for deterministic payloads.
      "stripe-version": "2024-06-20",
    },
    body: new URLSearchParams(body).toString(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`stripe_${response.status}:${(await response.text()).slice(0, 200)}`);
  return (await response.json()) as T;
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",
  label: { fa: "Stripe (بین‌المللی)", en: "Stripe (international)" },
  currencies: ["USD"],

  configured: () => Boolean(stripeSecret()),
  mode: () => (stripeSecret() ? "live" : "sandbox"),

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const secret = stripeSecret();

    if (!secret) {
      const authority = mintAuthority("USD", input.order.id, input.charge);
      await createSandboxTransaction({ authority, provider: "stripe", orderId: input.order.id, amount: input.charge });
      return {
        ok: true,
        reference: authority,
        redirectUrl: `${sandboxPath(input.locale)}?authority=${encodeURIComponent(authority)}`,
        sandbox: true,
      };
    }

    try {
      const successUrl = `${input.callbackUrl}${input.callbackUrl.includes("?") ? "&" : "?"}status=success&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${input.callbackUrl}${input.callbackUrl.includes("?") ? "&" : "?"}status=canceled`;
      const lineItems: Record<string, string> = {
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(input.charge.amount),
        "line_items[0][price_data][product_data][name]": input.description.slice(0, 120),
        "line_items[0][price_data][product_data][description]": input.description.slice(0, 300),
      };

      const session = await stripeRequest<StripeSession>("/checkout/sessions", {
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        "payment_method_types[0]": "card",
        "metadata[order_id]": input.order.id,
        "payment_intent_data[metadata][order_id]": input.order.id,
        ...(input.email ? { customer_email: input.email } : {}),
        ...lineItems,
      });

      if (!session.url || !session.id) {
        return { ok: false, reference: "", sandbox: false, error: "stripe_no_session", raw: session as unknown as Record<string, unknown> };
      }
      return { ok: true, reference: session.id, redirectUrl: session.url, sandbox: false, raw: session as unknown as Record<string, unknown> };
    } catch (error) {
      return { ok: false, reference: "", sandbox: false, error: String(error) };
    }
  },

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    if (isSandboxAuthority(input.reference)) {
      const info = parseSandboxAuthority(input.reference);
      const transaction = await getSandboxTransaction(input.reference);
      if (!transaction) {
        return { ok: false, status: "failed", reference: input.reference, sandbox: true, error: "sandbox_not_found" };
      }
      if (info && info.amount !== input.charge.amount) {
        return { ok: false, status: "failed", reference: input.reference, sandbox: true, error: "amount_mismatch" };
      }
      const status = sandboxStatusToPaymentStatus(transaction.status);
      return {
        ok: status === "paid",
        status,
        reference: input.reference,
        refId: transaction.refId,
        cardMask: transaction.cardMask,
        amount: transaction.amount,
        sandbox: true,
        raw: { simulatedBank: transaction.simulatedBank },
      };
    }

    if (!stripeSecret()) {
      return { ok: false, status: "failed", reference: input.reference, sandbox: true, error: "stripe_not_configured" };
    }

    try {
      const session = await stripeRequest<StripeSession>(`/checkout/sessions/${encodeURIComponent(input.reference)}`, {});
      const paid = session.payment_status === "paid";
      const amountMatches = !session.amount_total || session.amount_total === input.charge.amount;
      if (paid && amountMatches) {
        return {
          ok: true,
          status: "paid",
          reference: input.reference,
          refId: session.payment_intent ?? session.id,
          amount: { currency: "USD", amount: session.amount_total ?? input.charge.amount },
          sandbox: false,
          raw: session as unknown as Record<string, unknown>,
        };
      }
      return {
        ok: false,
        status: paid ? "failed" : "canceled",
        reference: input.reference,
        sandbox: false,
        error: paid ? "amount_mismatch" : `stripe_status:${session.payment_status ?? session.status ?? "unknown"}`,
        raw: session as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return { ok: false, status: "failed", reference: input.reference, sandbox: false, error: String(error) };
    }
  },
};
