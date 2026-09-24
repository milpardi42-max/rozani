import "server-only";
import { DEFAULT_AFFILIATE_PCT, DEFAULT_ARTIST_SHARE_PCT } from "./config";
import { addPrice, clampPrice, scalePrice, subPrice, ZERO_PRICE } from "./money";
import type { LedgerEntry, PricePair } from "./types";

/**
 * Revenue split — the single place that decides who gets what.
 *
 *                 ┌─────────────── gross (what the buyer paid) ───────────────┐
 *   ── coupon ──▶ net  ── affiliate (from the platform fee) ──▶ platform
 *                        └── artist share ──▶ artist
 *
 * The artist share is a percentage of the **net** (after discount, before VAT),
 * which is the number the artist sees in their dashboard; the platform fee is
 * whatever is left after the artist share and any referral commission.
 */

export interface SplitInput {
  /** Line total after order-level discounts. */
  net: PricePair;
  /** Artist revenue share (0–100). */
  artistPct: number;
  /** Affiliate commission (0–100) — taken out of the platform fee. */
  affiliatePct?: number;
  /** Site-owned work (no artist) → everything stays with the platform. */
  siteOwned?: boolean;
}

export interface Split {
  gross: PricePair;
  artistPct: number;
  artist: PricePair;
  affiliatePct: number;
  affiliate: PricePair;
  platform: PricePair;
}

export function splitRevenue(input: SplitInput): Split {
  const gross = clampPrice(input.net);
  const artistPct = input.siteOwned ? 0 : Math.max(0, Math.min(100, input.artistPct));
  const affiliatePct = Math.max(0, Math.min(100, input.affiliatePct ?? 0));

  const artist = scalePrice(gross, artistPct / 100);
  const beforeAffiliate = subPrice(gross, artist);
  const affiliate = scalePrice(beforeAffiliate, affiliatePct / 100);
  const platform = subPrice(beforeAffiliate, affiliate);

  return { gross, artistPct, artist, affiliatePct, affiliate, platform };
}

/** Platform policy used when the artist record does not override the share. */
export function defaultArtistPct(artistOverride?: number): number {
  return typeof artistOverride === "number" ? artistOverride : DEFAULT_ARTIST_SHARE_PCT;
}

export function defaultAffiliatePct(override?: number): number {
  return typeof override === "number" ? override : DEFAULT_AFFILIATE_PCT;
}

/* ------------------------------------------------------------------ */
/* Ledger building                                                     */
/* ------------------------------------------------------------------ */

export interface BuildLedgerInput {
  orderId: string;
  licenseId: string;
  artistId: string | null;
  net: PricePair;
  artistPct: number;
  affiliateUserId?: string | null;
  affiliatePct?: number;
  note?: LedgerEntry["note"];
}

/**
 * Produces the balanced ledger entries for one sold license.
 *
 * A **reversal** is produced by `reversalEntries()` so refunds never mutate the
 * original rows — the ledger stays append-only and auditable.
 */
export function saleEntries(input: BuildLedgerInput): Omit<LedgerEntry, "id" | "createdAt">[] {
  const split = splitRevenue({
    net: input.net,
    artistPct: input.artistPct,
    affiliatePct: input.affiliatePct ?? 0,
    siteOwned: !input.artistId,
  });

  const entries: Omit<LedgerEntry, "id" | "createdAt">[] = [
    {
      artistId: input.artistId,
      kind: "sale",
      amount: input.net,
      orderId: input.orderId,
      licenseId: input.licenseId,
      note: { fa: "فروش لایسنس", en: "License sale" },
    },
  ];

  if (input.artistId && (split.artist.fa !== 0 || split.artist.en !== 0)) {
    entries.push({
      artistId: input.artistId,
      kind: "platform_fee",
      amount: scalePrice(split.platform, -1),
      orderId: input.orderId,
      licenseId: input.licenseId,
      note: { fa: "سهم پلتفرم", en: "Platform fee" },
    });
  }

  if (input.affiliateUserId && (split.affiliate.fa !== 0 || split.affiliate.en !== 0)) {
    entries.push({
      artistId: null,
      userId: input.affiliateUserId,
      kind: "referral",
      amount: split.affiliate,
      orderId: input.orderId,
      licenseId: input.licenseId,
      note: { fa: "پورسانت معرفی", en: "Referral commission" },
    });
  }

  return entries;
}

/** Mirrors `saleEntries()` with negated amounts (refund / revocation). */
export function reversalEntries(entries: LedgerEntry[], orderId: string, note?: LedgerEntry["note"]): Omit<LedgerEntry, "id" | "createdAt">[] {
  return entries
    .filter((entry) => entry.orderId === orderId && entry.kind !== "payout" && entry.kind !== "reversal")
    .map((entry) => ({
      artistId: entry.artistId,
      userId: entry.userId ?? null,
      kind: "reversal" as const,
      amount: scalePrice(entry.amount, -1),
      orderId,
      licenseId: entry.licenseId,
      note: note ?? { fa: "برگشت/ابطال", en: "Reversal" },
    }));
}

/* ------------------------------------------------------------------ */
/* Balance helpers                                                     */
/* ------------------------------------------------------------------ */

export interface ArtistBalance {
  total: PricePair;
  paidOut: PricePair;
  pending: PricePair;
  available: PricePair;
  salesCount: number;
}

export function artistBalance(input: {
  ledger: LedgerEntry[];
  payouts: { status: string; amount: PricePair }[];
}): ArtistBalance {
  const credited = input.ledger.reduce<PricePair>(
    (acc, entry) =>
      entry.kind === "sale" || entry.kind === "referral" || entry.kind === "adjustment"
        ? addPrice(acc, entry.amount)
        : acc,
    ZERO_PRICE,
  );
  const debited = input.ledger.reduce<PricePair>(
    (acc, entry) =>
      entry.kind === "platform_fee" || entry.kind === "reversal" ? addPrice(acc, entry.amount) : acc,
    ZERO_PRICE,
  );
  const total = addPrice(credited, debited);

  const paidOut = input.payouts
    .filter((payout) => payout.status === "paid")
    .reduce((acc, payout) => addPrice(acc, payout.amount), ZERO_PRICE);
  const pending = input.payouts
    .filter((payout) => payout.status === "requested" || payout.status === "approved")
    .reduce((acc, payout) => addPrice(acc, payout.amount), ZERO_PRICE);

  return {
    total,
    paidOut,
    pending,
    available: clampPrice(subPrice(subPrice(total, paidOut), pending)),
    salesCount: input.ledger.filter((entry) => entry.kind === "sale").length,
  };
}

/** Convenience re-export so callers do not need the money module for refunds. */
export function refundPrice(price: PricePair): PricePair {
  return scalePrice(price, -1);
}
