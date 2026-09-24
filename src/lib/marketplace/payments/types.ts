import "server-only";
import type { Localized } from "@/lib/i18n/types";
import type { ChargeAmount, MarketplaceOrder, PaymentProviderId, PaymentStatus } from "../types";

/**
 * Payment provider contract.
 *
 * Every provider implements the same three-step flow the Iranian gateways
 * popularised and Stripe mirrors with PaymentIntents:
 *
 *   init()    → create a transaction, get a reference + redirect URL
 *   verify()  → confirm the reference really was paid for the expected amount
 *   (the caller then fulfils the order exactly once)
 *
 * The built-in **test gateway** implements the same contract with its own
 * confirm page, which is what makes “realistic but fake” test purchases work
 * end to end: the code path, the reference format, the verify call and the
 * fulfilment logic are identical — only the remote endpoint is ours.
 */

export interface PaymentInitInput {
  order: MarketplaceOrder;
  charge: ChargeAmount;
  description: string;
  /** Absolute URL the user returns to after paying. */
  callbackUrl: string;
  email?: string;
  mobile?: string;
  /** Zarinpal metadata / Stripe receipt email. */
  locale: "fa" | "en";
}

export interface PaymentInitResult {
  ok: boolean;
  reference: string;
  redirectUrl?: string;
  sandbox: boolean;
  /** Raw gateway payload (kept for the admin panel). */
  raw?: Record<string, unknown>;
  error?: string;
}

export interface PaymentVerifyInput {
  reference: string;
  charge: ChargeAmount;
}

export interface PaymentVerifyResult {
  ok: boolean;
  status: PaymentStatus;
  reference: string;
  refId?: string;
  cardMask?: string;
  amount?: ChargeAmount;
  sandbox: boolean;
  raw?: Record<string, unknown>;
  error?: string;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  label: Localized;
  /** Currencies this provider can charge in. */
  currencies: ChargeAmount["currency"][];
  /** True when live credentials are present. */
  configured(): boolean;
  /** Human-readable reason shown in the UI (e.g. "sandbox gateway"). */
  mode(): "live" | "sandbox";
  init(input: PaymentInitInput): Promise<PaymentInitResult>;
  verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult>;
}

/** Shared helper: turn the amount into the currency string the UI shows. */
export function describeCharge(charge: ChargeAmount, locale: "fa" | "en"): string {
  if (charge.currency === "USD") {
    return `$${(charge.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }
  const value = charge.amount.toLocaleString("en-US");
  return locale === "fa" ? `${value} تومان` : `${value} IRT`;
}

export function shortReference(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  return `${prefix}-${stamp}${random}`;
}
