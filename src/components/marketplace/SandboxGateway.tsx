"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import type { Localized } from "@/lib/i18n/types";
import type { ChargeAmount } from "@/lib/marketplace/types";

/**
 * Sandbox payment card — our stand-in for the PSP's own page.
 *
 * Shows merchant, amount, order reference and a test card, then either settles
 * the payment (handing the buyer to the real receipt page) or reports failure.
 * Settling runs the production pipeline: verification → licence → certificate →
 * royalty ledger → delivery e-mail.
 */

interface Props {
  locale: "fa" | "en";
  authority: string;
}

interface Info {
  orderId: string;
  amount: ChargeAmount;
  provider: string;
  providerLabel: Localized;
  status: string;
}

export function SandboxGateway({ locale, authority }: Props) {
  const fa = locale === "fa";
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authority) {
      setError(fa ? "شناسه تراکنش نامعتبر است." : "Invalid transaction reference.");
      return;
    }
    void (async () => {
      const response = await fetch(`/api/marketplace/payments/sandbox?authority=${encodeURIComponent(authority)}`);
      const data = (await response.json()) as Info & { ok?: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "not_found");
        return;
      }
      setInfo(data);
    })();
  }, [authority, fa]);

  async function decide(outcome: "paid" | "failed" | "canceled") {
    setBusy(outcome);
    setError(null);
    try {
      const response = await fetch("/api/marketplace/payments/sandbox", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ authority, outcome, locale }),
      });
      const data = (await response.json()) as { ok?: boolean; redirectUrl?: string; error?: string };
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      setError(data.error ?? "failed");
    } finally {
      setBusy(null);
    }
  }

  const amountLabel =
    info?.amount.currency === "USD"
      ? `$${(info.amount.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : `${(info?.amount.amount ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} ${fa ? "تومان" : "IRT"}`;

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-7 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{info ? (fa ? info.providerLabel.fa : info.providerLabel.en) : fa ? "درگاه آزمایشی" : "Sandbox gateway"}</p>
            <p className="mt-1 text-caption text-foreground-secondary">
              {fa ? "درگاه پرداخت آزمایشی رزی آتلیه" : "Rosie Atelier test gateway"}
            </p>
          </div>
          <div className="text-end">
            <p className="text-caption text-foreground-secondary">{fa ? "مبلغ قابل پرداخت" : "Amount due"}</p>
            <p className="font-display text-2xl">{amountLabel}</p>
          </div>
        </div>

        <dl className="mt-6 space-y-2 border-t border-border pt-4 text-caption">
          <div className="flex justify-between gap-3">
            <dt className="text-foreground-secondary">{fa ? "شماره سفارش" : "Order"}</dt>
            <dd dir="ltr">{info?.orderId || "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-foreground-secondary">{fa ? "پذیرنده" : "Merchant"}</dt>
            <dd>{fa ? "رزی آتلیه" : "Rosie Atelier"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-foreground-secondary">{fa ? "کارت آزمایشی" : "Test card"}</dt>
            <dd dir="ltr">{info?.amount.currency === "USD" ? "4242 4242 4242 4242" : "6104-****-****-3312"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-foreground-secondary">{fa ? "شناسه تراکنش" : "Authority"}</dt>
            <dd className="truncate" dir="ltr">
              {authority.slice(0, 26)}…
            </dd>
          </div>
        </dl>

        {error && (
          <p className="mt-5 flex items-center gap-2 rounded-xl bg-error/10 p-3 text-caption text-error">
            <AlertTriangle className="h-4 w-4" />
            {error === "amount_mismatch" ? (fa ? "مبلغ تراکنش با سفارش نمی‌خواند." : "Amount mismatch.") : error}
          </p>
        )}

        {!error && (
          <div className="mt-6 space-y-2">
            {/* Progressive enhancement: with JavaScript disabled the button falls
                back to a plain form POST that ends in a 303 redirect. */}
            <form method="post" action="/api/marketplace/payments/sandbox" onSubmit={(event) => { event.preventDefault(); void decide("paid"); }}>
              <input type="hidden" name="authority" value={authority} />
              <input type="hidden" name="outcome" value="paid" />
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                disabled={busy !== null || !info}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-60"
              >
                {busy === "paid" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {fa ? "پرداخت (آزمایشی)" : "Pay (test)"}
              </button>
            </form>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => decide("failed")}
                disabled={busy !== null || !info}
                className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm"
              >
                {fa ? "شبیه‌سازی پرداخت ناموفق" : "Simulate failure"}
              </button>
              <button
                type="button"
                onClick={() => decide("canceled")}
                disabled={busy !== null || !info}
                className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm"
              >
                {fa ? "بازگشت بدون پرداخت" : "Cancel"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 flex items-start gap-2 rounded-xl bg-accent/5 p-3 text-caption leading-relaxed text-accent">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {fa
            ? "این صفحه یک درگاه آزمایشی است: پول واقعی جابه‌جا نمی‌شود، اما همین حالا مسیر واقعی (ثبت سفارش ← تأیید پرداخت ← صدور گواهی لایسنس ← تحویل فایل و ایمیل) اجرا می‌شود."
            : "This is a test gateway: no real money moves, but the real pipeline (order → payment verification → license certificate → delivery and e-mail) runs right now."}
        </p>

        <p className="mt-4 text-center text-caption">
          <Link href={`/${locale}/marketplace`} className="text-foreground-secondary underline">
            {fa ? "بازگشت به فروشگاه" : "Back to the shop"}
          </Link>
        </p>
      </div>
    </div>
  );
}
