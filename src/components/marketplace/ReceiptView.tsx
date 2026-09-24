"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, BadgeCheck, Check, Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { SESSION_FETCH } from "@/lib/http";
import { formatPrice, href } from "@/lib/utils";

/**
 * Post-payment receipt.
 *
 * The server resolves the order (and re-runs fulfilment if the gateway callback
 * never reached us), so this component only renders state and offers the two
 * things a buyer actually wants next: the download and the certificate.
 */

interface ReceiptLicense {
  id: string;
  serial: string;
  assetId: string;
  title: { fa: string; en: string } | string;
  licenseKind: string;
  exclusive: boolean;
  downloadUrl: string | null;
  quota: { used: number; limit: number; unlimited: boolean; remaining: number | null };
}

interface ReceiptData {
  order: {
    id: string;
    status: string;
    subtotal?: { fa: number; en: number };
  discount?: { fa: number; en: number };
  tax?: { fa: number; en: number };
  couponCode?: string | null;
  total: { fa: number; en: number };
    charge: { currency: "IRT" | "USD"; amount: number };
    paidAt?: string;
    provider?: string;
    sandbox?: boolean;
  };
  licenses: ReceiptLicense[];
  pending?: boolean;
  message?: string;
}

export function ReceiptView({ initial }: { initial: ReceiptData }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [data, setData] = useState<ReceiptData>(initial);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const response = await fetch(`/api/marketplace/orders/${initial.order.id}`, SESSION_FETCH);
      const next = (await response.json()) as ReceiptData & { ok?: boolean };
      if (next.ok !== false && next.order) setData(next);
    } finally {
      setBusy(false);
    }
  }

  const paid = data.order.status === "paid";

  return (
    <div className="mx-auto max-w-3xl">
      <div className={`rounded-2xl border p-6 ${paid ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"}`}>
        <p className="flex items-center gap-2 font-display text-h3">
          {paid ? <BadgeCheck className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
          {paid
            ? fa
              ? "پرداخت با موفقیت انجام شد"
              : "Payment completed"
            : fa
              ? "پرداخت هنوز تأیید نشده است"
              : "Payment not confirmed yet"}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-caption text-foreground-secondary">{fa ? "شماره سفارش" : "Order"}</dt>
            <dd className="font-medium" dir="ltr">
              {data.order.id}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-secondary">{fa ? "مبلغ کل" : "Total"}</dt>
            <dd className="font-medium">{formatPrice(data.order.total, locale)}</dd>
          </div>
          {data.order.subtotal && (
            <div className="sm:col-span-2">
              <dt className="text-caption text-foreground-secondary">{fa ? "ریز صورتحساب" : "Invoice breakdown"}</dt>
              <dd className="mt-1 space-y-1 rounded-xl border border-border bg-background-secondary/40 p-3 text-caption">
                {data.order.subtotal && (
                  <span className="flex justify-between">
                    <span>{fa ? "جمع اقلام" : "Items"}</span>
                    <span>{formatPrice(data.order.subtotal, locale)}</span>
                  </span>
                )}
                {data.order.discount && data.order.discount.fa + data.order.discount.en > 0 && (
                  <span className="flex justify-between text-success">
                    <span>
                      {fa ? "تخفیف" : "Discount"}
                      {data.order.couponCode ? ` (${data.order.couponCode})` : ""}
                    </span>
                    <span>−{formatPrice(data.order.discount, locale)}</span>
                  </span>
                )}
                {data.order.tax && data.order.tax.fa + data.order.tax.en > 0 && (
                  <span className="flex justify-between">
                    <span>{fa ? "مالیات بر ارزش افزوده" : "VAT"}</span>
                    <span>{formatPrice(data.order.tax, locale)}</span>
                  </span>
                )}
                <span className="flex justify-between border-t border-border pt-1 font-medium">
                  <span>{fa ? "قابل پرداخت" : "Amount due"}</span>
                  <span>{formatPrice(data.order.total, locale)}</span>
                </span>
              </dd>
            </div>
          )}
          <div>
            <dt className="text-caption text-foreground-secondary">{fa ? "وضعیت" : "Status"}</dt>
            <dd className="font-medium">
              {data.order.status === "paid"
                ? fa
                  ? "پرداخت‌شده"
                  : "paid"
                : data.order.status === "pending_payment"
                  ? fa
                    ? "در انتظار پرداخت"
                    : "awaiting payment"
                  : data.order.status}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-foreground-secondary">{fa ? "درگاه" : "Gateway"}</dt>
            <dd className="font-medium">
              {data.order.provider ?? (data.order.charge.currency === "USD" ? "Stripe" : "Zarinpal")}
              {data.order.sandbox ? (fa ? " (آزمایشی)" : " (sandbox)") : ""}
            </dd>
          </div>
        </dl>

        {!paid && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={refresh}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {fa ? "بررسی مجدد وضعیت" : "Check status again"}
            </Button>
            <Button href={href(locale, "/marketplace")} variant="ghost">
              {fa ? "بازگشت به فروشگاه" : "Back to the shop"}
            </Button>
          </div>
        )}
      </div>

      {data.licenses.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-h3">{fa ? "لایسنس‌ها و فایل‌ها" : "Licenses & files"}</h2>
          <ul className="mt-4 space-y-3">
            {data.licenses.map((license) => (
              <li key={license.id} className="rounded-xl border border-border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {typeof license.title === "string" ? license.title : fa ? license.title.fa : license.title.en}
                    </p>
                    <p className="mt-1 text-caption text-foreground-secondary" dir="ltr">
                      {license.serial} · {license.licenseKind}
                      {license.exclusive ? (fa ? " · انحصاری" : " · exclusive") : ""}
                    </p>
                    <p className="mt-1 text-caption text-foreground-secondary">
                      {fa
                        ? `دانلود: ${license.quota.used} از ${license.quota.unlimited ? "نامحدود" : license.quota.limit}`
                        : `Downloads: ${license.quota.used} of ${license.quota.unlimited ? "unlimited" : license.quota.limit}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {license.downloadUrl ? (
                      <a
                        href={license.downloadUrl}
                        className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background"
                      >
                        <Download className="h-4 w-4" />
                        {fa ? "دانلود فایل" : "Download"}
                      </a>
                    ) : (
                      <span className="rounded-full border border-border px-4 py-2 text-sm text-foreground-secondary">
                        {fa ? "سهمیه دانلود تکمیل شد" : "Download quota reached"}
                      </span>
                    )}
                    <a
                      href={`/api/marketplace/licenses/${license.id}/certificate?locale=${locale}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm"
                    >
                      <FileText className="h-4 w-4" />
                      {fa ? "گواهی PDF" : "PDF certificate"}
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-caption text-foreground-secondary">
            <Check className="h-3.5 w-3.5 text-success" />
            {fa
              ? "نسخه‌ای از همین لینک‌ها به ایمیل شما ارسال شد. همه دانلودها در پنل کاربری قابل پیگیری است."
              : "The same links were e-mailed to you. Every download is tracked in your account."}
          </p>
        </section>
      )}

      {data.licenses.length === 0 && paid && (
        <p className="mt-6 rounded-xl border border-border p-5 text-sm text-foreground-secondary">
          {fa
            ? "پرداخت تأیید شد. اگر ایمیلی دریافت نکردید، چند لحظه بعد صفحه را بازخوانی کنید یا با پشتیبانی تماس بگیرید."
            : "Payment confirmed. If you have not received the e-mail yet, reload in a moment or contact support."}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {initial.order.id && (
          <Button href={href(locale, "/account")} variant="outline">
            {fa ? "پنل کاربری و گواهی‌ها" : "My account & certificates"}
          </Button>
        )}
        <Link href={href(locale, "/marketplace")} className="self-center text-caption text-accent underline">
          {fa ? "خرید آثار دیگر" : "Browse more works"}
        </Link>
      </div>
    </div>
  );
}
