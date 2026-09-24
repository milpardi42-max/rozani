import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale, Localized } from "./i18n/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function t(l: Localized | undefined, locale: Locale): string {
  if (!l) return "";
  return l[locale] ?? l.en ?? l.fa ?? "";
}

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
export function faNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => faDigits[Number(d)]);
}

/**
 * Paid-only price label — `null` means free.
 * Lives here (not in a `"use client"` module) so server components can call it too.
 */
export function priceLabel(price: { fa: number; en: number } | undefined, locale: Locale): string | null {
  if (!price || (price.fa <= 0 && price.en <= 0)) return null;
  return locale === "fa" ? `${faNum(price.fa.toLocaleString("en-US"))} تومان` : `$${price.en}`;
}

export function formatPrice(price: { fa: number; en: number }, locale: Locale): string {
  if (locale === "fa") {
    return `${faNum(price.fa.toLocaleString("en-US"))} تومان`;
  }
  return `$${price.en.toLocaleString("en-US")}`;
}

export function formatNumber(n: number, locale: Locale): string {
  const s = n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);
  return locale === "fa" ? faNum(s) : s;
}

export function formatDuration(min: number, locale: Locale, dict: { minutes: string; hours: string }): string {
  if (min < 60) return `${locale === "fa" ? faNum(min) : min} ${dict.minutes}`;
  const h = Math.round((min / 60) * 10) / 10;
  return `${locale === "fa" ? faNum(h) : h} ${dict.hours}`;
}

export function href(locale: Locale, path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${basePath}/${locale}${clean === "/" ? "" : clean}`;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}
