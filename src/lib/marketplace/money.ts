/**
 * Marketplace money helpers.
 *
 * The catalogue carries prices as a bilingual pair `{ fa: toman, en: usd }`.
 * That is convenient for display but ambiguous at charge time, so every order
 * pins one `ChargeAmount` (IRT toman for Zarinpal, USD cents for Stripe).
 *
 * This module is dependency-free and safe to import from client components.
 */

import type { ChargeAmount, PaymentProviderId, PricePair } from "./types";

export const ZERO_PRICE: PricePair = { fa: 0, en: 0 };

const roundCents = (value: number) => Math.round(value * 100) / 100;

export function addPrice(...prices: PricePair[]): PricePair {
  return prices.reduce<PricePair>(
    // Cents are rounded on every accumulation so ledgers never carry float dust.
    (acc, p) => ({ fa: Math.round(acc.fa + (p?.fa ?? 0)), en: roundCents(acc.en + (p?.en ?? 0)) }),
    { fa: 0, en: 0 },
  );
}

export function subPrice(a: PricePair, b: PricePair): PricePair {
  return { fa: Math.round(a.fa - b.fa), en: roundCents(a.en - b.en) };
}

export function scalePrice(p: PricePair, factor: number): PricePair {
  return { fa: Math.round(p.fa * factor), en: Math.round(p.en * factor * 100) / 100 };
}

export function clampPrice(p: PricePair): PricePair {
  return { fa: Math.max(0, Math.round(p.fa)), en: Math.max(0, Math.round(p.en * 100) / 100) };
}

export function isZeroPrice(p: PricePair): boolean {
  return (!p || (p.fa === 0 && p.en === 0));
}

export function currencyOf(provider: PaymentProviderId): ChargeAmount["currency"] {
  return provider === "stripe" ? "USD" : "IRT";
}

/** Pick the charge amount that matches the provider's currency. */
export function chargeFor(provider: PaymentProviderId, total: PricePair): ChargeAmount {
  if (provider === "stripe") {
    // Stripe expects the smallest currency unit (cents).
    return { currency: "USD", amount: Math.round(total.en * 100) };
  }
  return { currency: "IRT", amount: Math.max(0, Math.round(total.fa)) };
}

/** Convert a charge back into the display pair (base currency of the charge). */
export function priceOfCharge(charge: ChargeAmount): PricePair {
  if (charge.currency === "USD") return { fa: 0, en: charge.amount / 100 };
  return { fa: charge.amount, en: 0 };
}

export function formatCharge(charge: ChargeAmount, locale: "fa" | "en"): string {
  if (charge.currency === "USD") {
    const value = charge.amount / 100;
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  const value = charge.amount.toLocaleString("en-US");
  return locale === "fa" ? `${value} تومان` : `${value} IRT`;
}

/** Zarinpal v4 accepts the amount in *Rial* (IRT × 10) unless the merchant is on the Toman API. */
export function tomanToRial(toman: number): number {
  return Math.round(toman * 10);
}

/** ۹٪ مالیات بر ارزش افزوده — only applied to domestic charges. */
export function taxFor(provider: PaymentProviderId, subtotal: PricePair, vatPct: number): PricePair {
  if (vatPct <= 0) return ZERO_PRICE;
  if (provider === "stripe") {
    // International sales are handled by Stripe Tax when configured; keep 0 here.
    return ZERO_PRICE;
  }
  return {
    fa: Math.round((subtotal.fa * vatPct) / 100),
    en: 0,
  };
}

export function sumPriceList(values: PricePair[]): PricePair {
  return values.reduce<PricePair>((acc, price) => addPrice(acc, price), ZERO_PRICE);
}
