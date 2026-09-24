"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { AlertTriangle, BadgeCheck, Loader2, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Localized } from "@/lib/i18n/types";

/**
 * Public certificate verification.
 *
 * Anyone holding a certificate (or scanning its QR code) can confirm that a
 * licence is genuine. Only the minimum is exposed: masked holder name, the work,
 * the artist, the licence kind and whether it is still active — never the
 * buyer's e-mail or the file itself.
 */
interface VerifyResult {
  valid: boolean;
  serial: string;
  status: string;
  licenseKind: string;
  exclusive: boolean;
  title: Localized;
  artistName: Localized;
  issuedAt: string;
  buyer: string;
  orderId: string;
  maxDownloads: number;
  downloadCount: number;
  revokedReason?: string | null;
}

export function VerifyView({ initialSerial }: { initialSerial?: string }) {
  const { locale } = useLocale();
  const fa = locale === "fa";

  const [serial, setSerial] = useState(initialSerial ?? "");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "notfound" | "done">("idle");

  const check = useCallback(async (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setState("loading");
    try {
      const response = await fetch(`/api/marketplace/verify/${encodeURIComponent(clean)}`);
      if (response.status === 404) {
        setResult(null);
        setState("notfound");
        return;
      }
      const data = (await response.json()) as VerifyResult & { ok?: boolean };
      setResult(data);
      setState("done");
    } catch {
      setState("notfound");
    }
  }, []);

  useEffect(() => {
    if (initialSerial) void check(initialSerial);
  }, [initialSerial, check]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-border p-6">
        <label className="block text-sm font-medium" htmlFor="serial">
          <ShieldCheck className="me-2 inline h-4 w-4 text-accent" />
          {fa ? "شماره گواهی را وارد کنید" : "Enter the certificate number"}
        </label>
        <p className="mt-1 text-caption text-foreground-secondary">
          {fa
            ? "نمونه: RA-LIC-2026-000001 — روی گواهی PDF و زیر کد QR نوشته شده است."
            : "Example: RA-LIC-2026-000001 — printed on the PDF certificate under the QR code."}
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void check(serial);
          }}
        >
          <input
            id="serial"
            value={serial}
            onChange={(event) => setSerial(event.target.value.toUpperCase())}
            placeholder="RA-LIC-…"
            dir="ltr"
            className="flex-1 rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
          <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm text-background">
            {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {fa ? "بررسی" : "Verify"}
          </button>
        </form>
      </div>

      {state === "notfound" && (
        <p className="mt-6 flex items-center gap-2 rounded-xl bg-error/10 p-4 text-sm text-error">
          <AlertTriangle className="h-4 w-4" />
          {fa
            ? "گواهی با این شماره پیدا نشد. شماره را دقیقاً همان‌طور که روی گواهی است وارد کنید."
            : "No certificate with that number. Enter it exactly as printed."}
        </p>
      )}

      {state === "done" && result && (
        <div className={`mt-6 rounded-2xl border p-6 ${result.valid ? "border-success/40 bg-success/5" : "border-error/40 bg-error/5"}`}>
          <p className="flex items-center gap-2 font-display text-h3">
            {result.valid ? <BadgeCheck className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-error" />}
            {result.valid
              ? fa
                ? "این گواهی معتبر است"
                : "This certificate is valid"
              : fa
                ? "این گواهی باطل شده است"
                : "This certificate has been revoked"}
          </p>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Field label={fa ? "شماره گواهی" : "Certificate"} value={result.serial} ltr />
            <Field label={fa ? "نوع لایسنس" : "License type"} value={result.licenseKind} />
            <Field label={fa ? "اثر" : "Work"} value={fa ? result.title.fa : result.title.en} />
            <Field label={fa ? "هنرمند" : "Artist"} value={fa ? result.artistName.fa : result.artistName.en} />
            <Field label={fa ? "دارنده (مخفف)" : "Holder (masked)"} value={result.buyer} />
            <Field label={fa ? "تاریخ صدور" : "Issued"} value={new Date(result.issuedAt).toLocaleDateString(fa ? "fa-IR" : "en-GB")} />
            <Field
              label={fa ? "دانلود انجام‌شده" : "Downloads"}
              value={`${result.downloadCount} / ${result.maxDownloads > 0 ? result.maxDownloads : "∞"}`}
              ltr
            />
            <Field label={fa ? "وضعیت" : "Status"} value={result.status} />
          </dl>

          {result.exclusive && (
            <Badge tone="accent" className="mt-4">
              {fa ? "لایسنس انحصاری" : "Exclusive license"}
            </Badge>
          )}
          {result.revokedReason && <p className="mt-3 text-caption text-error">{result.revokedReason}</p>}

          <p className="mt-4 text-caption text-foreground-secondary">
            {fa
              ? "این صفحه فقط اطلاعات لازم برای احراز اصالت را نشان می‌دهد؛ ایمیل خریدار و فایل اثر محرمانه باقی می‌ماند."
              : "Only the information needed to confirm authenticity is shown; the buyer's e-mail and the file itself stay private."}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div>
      <dt className="text-caption text-foreground-secondary">{label}</dt>
      <dd className="font-medium" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}
