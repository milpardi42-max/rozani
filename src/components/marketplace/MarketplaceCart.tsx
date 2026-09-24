"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Cart for *digital* works.
 *
 * Deliberately separate from the physical `CartProvider`: a digital line is an
 * `(asset, license tier)` pair with no quantity, and it survives the gateway
 * redirect (localStorage) so the receipt page can reconcile what was bought.
 * Nothing here talks to the existing cart, so physical checkout is untouched.
 */

export interface DigitalLine {
  assetId: string;
  tierId: string;
  slug: string;
  titleFa: string;
  titleEn: string;
  tierTitleFa: string;
  tierTitleEn: string;
  licenseKind: "personal" | "commercial" | "extended" | "exclusive";
  price: { fa: number; en: number };
  preview: string | null;
  artistFa: string;
  artistEn: string;
  addedAt: number;
}

interface MarketplaceCartCtx {
  lines: DigitalLine[];
  count: number;
  add: (line: Omit<DigitalLine, "addedAt">) => void;
  remove: (assetId: string, tierId: string) => void;
  clear: () => void;
  has: (assetId: string) => boolean;
  subtotal: { fa: number; en: number };
  /** Set while a checkout request is in flight, so both pages agree. */
  lastOrderId: string | null;
  setLastOrderId: (id: string | null) => void;
  /**
   * Affiliate code captured from `?ref=…` on any storefront page. Kept in
   * localStorage so the buyer is still credited after browsing several pages
   * before checking out.
   */
  referral: string | null;
  captureReferral: (code: string | null) => void;
}

const STORAGE_KEY = "ra-digital-cart";
const ORDER_KEY = "ra-digital-order";
const REFERRAL_KEY = "ra-digital-ref";

/** Referral codes are artist slugs/uppercase words — keep the shape tight. */
const REFERRAL_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

const MarketplaceCartContext = createContext<MarketplaceCartCtx | null>(null);

export function MarketplaceCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<DigitalLine[]>([]);
  const [lastOrderId, setLastOrderIdState] = useState<string | null>(null);
  const [referral, setReferral] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DigitalLine[];
        if (Array.isArray(parsed)) setLines(parsed.filter((line) => line?.assetId && line?.tierId));
      }
      setLastOrderIdState(localStorage.getItem(ORDER_KEY));
      const storedReferral = localStorage.getItem(REFERRAL_KEY);
      if (storedReferral && REFERRAL_PATTERN.test(storedReferral)) setReferral(storedReferral.toUpperCase());
    } catch {
      /* storage unavailable (private mode) — the cart simply stays in memory */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<DigitalLine, "addedAt">) => {
    setLines((current) => {
      const rest = current.filter((item) => !(item.assetId === line.assetId && item.tierId === line.tierId));
      return [...rest, { ...line, addedAt: Date.now() }];
    });
  }, []);

  const remove = useCallback((assetId: string, tierId: string) => {
    setLines((current) => current.filter((line) => !(line.assetId === assetId && line.tierId === tierId)));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const has = useCallback((assetId: string) => lines.some((line) => line.assetId === assetId), [lines]);

  const setLastOrderId = useCallback((id: string | null) => {
    setLastOrderIdState(id);
    try {
      if (id) localStorage.setItem(ORDER_KEY, id);
      else localStorage.removeItem(ORDER_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const captureReferral = useCallback((code: string | null) => {
    const clean = (code ?? "").trim().toUpperCase();
    if (!clean || !REFERRAL_PATTERN.test(clean)) return;
    setReferral(clean);
    try {
      localStorage.setItem(REFERRAL_KEY, clean);
    } catch {
      /* ignore */
    }
  }, []);

  const subtotal = useMemo(
    () => lines.reduce((acc, line) => ({ fa: acc.fa + line.price.fa, en: acc.en + line.price.en }), { fa: 0, en: 0 }),
    [lines],
  );

  const value = useMemo<MarketplaceCartCtx>(
    () => ({
      lines,
      count: lines.length,
      add,
      remove,
      clear,
      has,
      subtotal,
      lastOrderId,
      setLastOrderId,
      referral,
      captureReferral,
    }),
    [lines, add, remove, clear, has, subtotal, lastOrderId, setLastOrderId, referral, captureReferral],
  );

  return <MarketplaceCartContext.Provider value={value}>{children}</MarketplaceCartContext.Provider>;
}

export function useMarketplaceCart() {
  const ctx = useContext(MarketplaceCartContext);
  if (!ctx) throw new Error("useMarketplaceCart must be used inside MarketplaceCartProvider");
  return ctx;
}

/** Shared label/format helpers for the digital UI. */
export function localeText(locale: "fa" | "en", fa: string, en: string) {
  return locale === "fa" ? fa || en : en || fa;
}

export function languageOf(locale: string): "fa" | "en" {
  return locale === "en" ? "en" : "fa";
}
