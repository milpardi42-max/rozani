import "server-only";
import { KEYS, mutateCollection, readCollection } from "../store";
import { newId } from "../assets";
import { chargeFor } from "../money";
import { absoluteUrl, siteUrl } from "../config";
import { stripeProvider } from "./stripe";
import { zarinpalProvider } from "./zarinpal";
import { isSandboxAuthority } from "./sandbox";
import type { PaymentInitResult, PaymentProvider, PaymentVerifyResult } from "./types";
import type { ChargeAmount, MarketplaceOrder, PaymentAttempt, PaymentProviderId } from "../types";

/**
 * Payment orchestration.
 *
 * Holds the provider registry, the `PaymentAttempt` audit log and the two
 * operations the checkout code cares about:
 *
 *   startPayment(order, provider)   → attempt record + redirect URL
 *   settlePayment(order, reference) → verify with the gateway, flip the attempt
 *
 * Both live and sandbox gateways flow through here, so a test purchase produces
 * exactly the same records as a real one.
 */

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  zarinpal: zarinpalProvider,
  stripe: stripeProvider,
  /** Wallet payments are internal — handled by the caller, never redirected. */
  wallet: {
    id: "wallet",
    label: { fa: "کیف پول رزی", en: "Rosie wallet" },
    currencies: ["IRT", "USD"],
    configured: () => true,
    mode: () => "live",
    init: async () => ({ ok: false, reference: "", sandbox: false, error: "wallet_requires_balance" }),
    verify: async () => ({ ok: false, status: "failed", reference: "", sandbox: false, error: "wallet_requires_balance" }),
  },
};

export function getProvider(id: PaymentProviderId): PaymentProvider {
  return PROVIDERS[id] ?? PROVIDERS.zarinpal;
}

export function listProviders(): PaymentProvider[] {
  return [PROVIDERS.zarinpal, PROVIDERS.stripe];
}

export function providerAvailability() {
  return listProviders().map((provider) => ({
    id: provider.id,
    label: provider.label,
    currencies: provider.currencies,
    configured: provider.configured(),
    mode: provider.mode(),
  }));
}

/* ------------------------------------------------------------------ */
/* Attempt log                                                         */
/* ------------------------------------------------------------------ */

export async function getAttempts(): Promise<PaymentAttempt[]> {
  return readCollection<PaymentAttempt>(KEYS.payments);
}

export async function getAttemptsByOrder(orderId: string): Promise<PaymentAttempt[]> {
  const attempts = await getAttempts();
  return attempts.filter((attempt) => attempt.orderId === orderId);
}

export async function getAttempt(id: string): Promise<PaymentAttempt | null> {
  const attempts = await getAttempts();
  return attempts.find((attempt) => attempt.id === id) ?? null;
}

export function findAttemptByReference(attempts: PaymentAttempt[], reference: string): PaymentAttempt | null {
  return attempts.find((attempt) => attempt.reference === reference) ?? null;
}

export async function upsertAttempt(attempt: PaymentAttempt): Promise<PaymentAttempt> {
  return mutateCollection<PaymentAttempt, PaymentAttempt>(KEYS.payments, (items) => {
    const index = items.findIndex((item) => item.id === attempt.id);
    const merged: PaymentAttempt = { ...attempt, updatedAt: new Date().toISOString() };
    if (index === -1) return { next: [...items, merged], result: merged };
    const copy = items.slice();
    copy[index] = { ...copy[index], ...merged };
    return { next: copy, result: copy[index] };
  });
}

/* ------------------------------------------------------------------ */
/* Start                                                               */
/* ------------------------------------------------------------------ */

export interface StartPaymentOptions {
  /** Locale used for the sandbox page and the gateway description. */
  locale: "fa" | "en";
  /** Absolute URL the gateway sends the buyer back to. */
  callbackUrl?: string;
  description?: string;
}

export interface StartedPayment extends PaymentInitResult {
  attempt: PaymentAttempt;
  charge: ChargeAmount;
}

export async function startPayment(
  order: MarketplaceOrder,
  providerId: PaymentProviderId,
  options: StartPaymentOptions,
): Promise<StartedPayment> {
  const provider = getProvider(providerId);
  const charge = chargeFor(providerId, order.total);

  const callbackUrl =
    options.callbackUrl ??
    absoluteUrl(`/${options.locale}/checkout/return?order=${order.id}&provider=${providerId}`);

  const attemptId = newId("pay");
  const description =
    options.description ??
    `${provider.label.en} · ${order.lines.length} item(s) · order ${order.id}`;

  const result = await provider.init({
    order,
    charge,
    description,
    callbackUrl,
    email: order.buyer.email,
    mobile: order.buyer.phone,
    locale: options.locale,
  });

  const attempt: PaymentAttempt = {
    id: attemptId,
    orderId: order.id,
    provider: providerId,
    reference: result.reference,
    amount: charge,
    status: result.ok ? "redirected" : "failed",
    sandbox: result.sandbox,
    failureReason: result.ok ? undefined : result.error,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    raw: result.raw,
  };

  await upsertAttempt(attempt);
  return { ...result, attempt, charge };
}

/* ------------------------------------------------------------------ */
/* Settle                                                              */
/* ------------------------------------------------------------------ */

export interface SettleResult {
  ok: boolean;
  attempt: PaymentAttempt | null;
  verification: PaymentVerifyResult;
}

/**
 * Verifies a gateway reference and records the outcome.
 *
 * Idempotent by design: a repeated callback finds the attempt already `paid` and
 * returns success without talking to the gateway again (Zarinpal would otherwise
 * answer `101`/`already verified` and Stripe would re-confirm a finished session).
 */
export async function settlePayment(
  order: MarketplaceOrder,
  reference: string,
  providerId: PaymentProviderId,
): Promise<SettleResult> {
  const attempts = await getAttemptsByOrder(order.id);
  const attempt = findAttemptByReference(attempts, reference) ?? null;

  if (attempt?.status === "paid") {
    return {
      ok: true,
      attempt,
      verification: {
        ok: true,
        status: "paid",
        reference,
        refId: attempt.refId,
        cardMask: attempt.cardMask,
        amount: attempt.amount,
        sandbox: attempt.sandbox,
      },
    };
  }

  const provider = getProvider(providerId);
  const charge = attempt?.amount ?? chargeFor(providerId, order.total);
  const verification = await provider.verify({ reference, charge });

  const next: PaymentAttempt = {
    id: attempt?.id ?? newId("pay"),
    orderId: order.id,
    provider: providerId,
    reference,
    amount: charge,
    status: verification.status,
    sandbox: verification.sandbox,
    cardMask: verification.cardMask,
    refId: verification.refId,
    failureReason: verification.ok ? undefined : verification.error,
    createdAt: attempt?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    raw: verification.raw,
  };

  const saved = await upsertAttempt(next);
  return { ok: verification.ok, attempt: saved, verification };
}

/** Marks an attempt canceled (buyer pressed «بازگشت» without paying). */
export async function cancelPayment(orderId: string, reference?: string): Promise<void> {
  await mutateCollection<PaymentAttempt, void>(KEYS.payments, (items) => ({
    next: items.map((item) =>
      item.orderId === orderId && (!reference || item.reference === reference) && item.status !== "paid"
        ? { ...item, status: "canceled" as const, updatedAt: new Date().toISOString() }
        : item,
    ),
    result: undefined,
  }));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function checkoutUrl(locale: "fa" | "en", path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}#${locale}`;
}

export { isSandboxAuthority };
export type { PaymentInitResult, PaymentVerifyResult };

/* ------------------------------------------------------------------ */
/* One place that turns a settled payment into a delivered order       */
/* ------------------------------------------------------------------ */

export interface CompletedPayment {
  ok: boolean;
  orderId: string;
  licenses: { id: string; serial: string }[];
  error?: string;
  status: string;
}

/**
 * Settles a gateway reference and fulfils the order.
 *
 * Used by the gateway callback and by the sandbox confirmation page so both
 * paths produce byte-identical results. Idempotent: settling twice returns the
 * same licences and no duplicate e-mail.
 */
export async function completePayment(
  orderId: string,
  reference: string,
  providerId: PaymentProviderId,
): Promise<CompletedPayment> {
  const { fulfillOrder, getOrder, setOrderStatus } = await import("../orders");
  const { recordEvent } = await import("../analytics");

  const order = await getOrder(orderId);
  if (!order) return { ok: false, orderId, licenses: [], status: "order_missing", error: "order_missing" };

  const settled = await settlePayment(order, reference, providerId);
  if (!settled.ok) {
    await setOrderStatus(order.id, "failed", settled.verification.error);
    return {
      ok: false,
      orderId: order.id,
      licenses: [],
      status: "failed",
      error: settled.verification.error ?? "verify_failed",
    };
  }

  await setOrderStatus(order.id, "paid");
  const fulfillment = await fulfillOrder(order.id, { provider: providerId, reference });

  void recordEvent({
    kind: "purchase",
    userId: order.userId,
    value: order.total,
    meta: { orderId: order.id, provider: providerId, reference, sandbox: settled.verification.sandbox ? "1" : "0" },
  });

  return {
    ok: true,
    orderId: order.id,
    status: "paid",
    licenses: fulfillment.licenses.map((license) => ({ id: license.id, serial: license.serial })),
  };
}
