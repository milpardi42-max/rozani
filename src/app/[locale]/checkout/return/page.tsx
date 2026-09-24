import type { Metadata } from "next";
import { ReceiptView } from "@/components/marketplace/ReceiptView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { defaultTiers } from "@/lib/marketplace/config";
import { createDownloadToken, licenseQuota } from "@/lib/marketplace/downloads";
import { getAsset } from "@/lib/marketplace/assets";
import { getLicenses, getOrder } from "@/lib/marketplace/orders";
import { getAttemptsByOrder } from "@/lib/marketplace/payments";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Gateway return page. Most callbacks already fulfilled the order in
 * `/api/marketplace/payments/callback`; this page is the safety net:
 *
 *   • if the order is paid but not fulfilled (callback lost), it fulfils now;
 *   • if the buyer landed here without a status (bookmark, sandbox cancel), it
 *     shows the real current state instead of guessing.
 */
export default async function CheckoutReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ order?: string; status?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const fa = locale === "fa";
  const orderId = query.order ?? "";

  const order = orderId ? await getOrder(orderId) : null;

  if (!order) {
    return (
      <div className="container-x pt-[calc(var(--header-h)+3rem)] pb-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-h3">{fa ? "سفارش پیدا نشد" : "Order not found"}</p>
          <p className="mt-2 text-caption text-foreground-secondary">
            {fa
              ? "اگر مبلغی از حساب شما کسر شده است، با شماره سفارش با پشتیبانی تماس بگیرید."
              : "If you were charged, contact support with your order number."}
          </p>
        </div>
      </div>
    );
  }

  /* Safety net: paid but not fulfilled (lost callback / manual approval). */
  if (order.status === "paid" && !order.fulfillment.completedAt) {
    const { fulfillOrder } = await import("@/lib/marketplace/orders");
    await fulfillOrder(order.id, { reference: "return_page" }).catch(() => undefined);
  }

  const [fresh, licenses, attempts] = await Promise.all([getOrder(order.id), getLicenses(), getAttemptsByOrder(order.id)]);
  const resolved = fresh ?? order;
  const mine = licenses.filter((license) => license.orderId === order.id);
  const attempt = attempts.find((item) => item.status === "paid") ?? attempts[attempts.length - 1];

  const rows = await Promise.all(
    mine.map(async (license) => {
      const asset = await getAsset(license.assetId);
      const quota = licenseQuota(license);
      const tier =
        asset?.tiers.find((item) => item.id === license.tierId) ?? defaultTiers().find((item) => item.kind === license.licenseKind);
      return {
        id: license.id,
        serial: license.serial,
        assetId: license.assetId,
        title: license.title,
        licenseKind: tier?.title[locale] ?? license.licenseKind,
        exclusive: license.exclusive,
        downloadUrl:
          asset && license.status === "active" && quota.canDownload
            ? `/api/marketplace/download?token=${encodeURIComponent(createDownloadToken(license, asset, { source: "account" }))}`
            : null,
        quota: {
          used: quota.used,
          limit: quota.limit,
          unlimited: quota.unlimited,
          remaining: quota.remaining === Number.POSITIVE_INFINITY ? null : quota.remaining,
        },
      };
    }),
  );

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "فایل دیجیتال" : "Digital files", href: href(locale, "/marketplace") },
          { label: fa ? "نتیجه پرداخت" : "Payment result" },
        ]}
        locale={locale}
        className="mb-6"
      />

      {query.status === "failed" && (
        <p className="mx-auto mb-6 max-w-3xl rounded-xl bg-error/10 p-4 text-sm text-error">
          {fa ? "پرداخت ناموفق بود." : "The payment failed."} {query.error ? <span dir="ltr">({query.error})</span> : null}
        </p>
      )}
      {query.status === "canceled" && (
        <p className="mx-auto mb-6 max-w-3xl rounded-xl bg-warning/10 p-4 text-sm text-warning">
          {fa ? "پرداخت لغو شد؛ سفارش شما ثبت شده و می‌توانید دوباره تلاش کنید." : "Payment cancelled — your order is saved, you can retry."}
        </p>
      )}

      <ReceiptView
        initial={{
          order: {
            id: resolved.id,
            status: resolved.status,
            subtotal: resolved.subtotal,
            discount: resolved.discount,
            tax: resolved.tax,
            couponCode: resolved.couponCode ?? null,
            total: resolved.total,
            charge: resolved.charge,
            paidAt: resolved.paidAt,
            provider: attempt?.provider === "stripe" ? "Stripe" : attempt?.provider === "zarinpal" ? "Zarinpal" : attempt?.provider,
            sandbox: attempt?.sandbox,
          },
          licenses: rows,
        }}
      />
    </div>
  );
}
