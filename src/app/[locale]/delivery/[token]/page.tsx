import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Download, ShieldCheck } from "lucide-react";
import { createDownloadToken, licenseQuota } from "@/lib/marketplace/downloads";
import { assetDeliverables } from "@/lib/marketplace/colourways";
import { formatLabel } from "@/lib/marketplace/formats";
import { getAsset } from "@/lib/marketplace/assets";
import { getLicense } from "@/lib/marketplace/orders";
import { verifyObjectToken } from "@/lib/marketplace/storage";
import { GIFT_LINK_TTL_LABEL } from "@/lib/marketplace/config";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Delivery link from the e-mail.
 *
 * The e-mail carries a signed token (not a storage path). This page validates the
 * signature, checks the licence is still active and inside its quota, then hands
 * the buyer a *fresh* short-lived download link — so even if the e-mail sits in an
 * inbox for days, the download itself is always short-lived and audited.
 */
export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ locale: Locale; token: string }>;
}) {
  const { locale, token } = await params;
  const fa = locale === "fa";

  const payload = verifyObjectToken(decodeURIComponent(token));
  const license = payload?.lic ? await getLicense(payload.lic) : null;
  const asset = license ? await getAsset(license.assetId) : null;

  const invalid = !payload || !license || !asset || license.status !== "active";
  const quota = license ? licenseQuota(license) : null;
  const link = license && asset && quota?.canDownload ? `/api/marketplace/download?token=${encodeURIComponent(createDownloadToken(license, asset, { source: "email" }))}` : null;
  const title = asset ? (fa ? asset.title.fa : asset.title.en) : "";

  /* Emailed delivery: the whole set — every colourway, every format. */
  const files =
    license && asset && quota?.canDownload
      ? assetDeliverables(asset).map((item) => ({
          key: item.file.id,
          format: formatLabel(item.formatId, locale),
          colourway: item.colourwayName[locale] ?? item.colourwayName.fa,
          hex: item.hex,
          size: item.file.sizeBytes,
          url: `/api/marketplace/download?token=${encodeURIComponent(
            createDownloadToken(license, asset, { source: "email", file: item.file, colourwayName: item.colourwayName }),
          )}`,
        }))
      : [];

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-xl rounded-2xl border border-border p-8">
        {invalid ? (
          <>
            <p className="flex items-center gap-2 font-display text-h3 text-error">
              <AlertTriangle className="h-5 w-5" />
              {fa ? "لینک نامعتبر یا منقضی شده است" : "This link is invalid or expired"}
            </p>
            <p className="mt-3 text-sm text-foreground-secondary">
              {fa
                ? "برای دریافت لینک تازه، وارد حساب خود شوید و از بخش «لایسنس‌ها» فایل را دانلود کنید. اگر لایسنس باطل شده باشد، پشتیبانی می‌تواند بررسی کند."
                : "Sign in and download from “Licenses” to get a fresh link. If the licence was revoked, support can review it."}
            </p>
            <Link href={href(locale, "/account/licenses")} className="mt-5 inline-flex rounded-full bg-foreground px-5 py-3 text-sm text-background">
              {fa ? "بخش لایسنس‌های من" : "My licenses"}
            </Link>
          </>
        ) : (
          <>
            <p className="flex items-center gap-2 text-caption text-accent">
              <ShieldCheck className="h-4 w-4" />
              {fa ? "لینک تحویل معتبر است" : "Delivery link verified"}
            </p>
            <h1 className="mt-3 font-display text-h2">{title}</h1>
            <p className="mt-2 text-caption text-foreground-secondary" dir="ltr">
              {license!.serial} · {license!.licenseKind}
            </p>
            <p className="mt-3 text-sm text-foreground-secondary">
              {fa
                ? `این لینک تا ${GIFT_LINK_TTL_LABEL.fa} اعتبار دارد. دانلود شما ثبت می‌شود و از سهمیه لایسنس (${license!.downloads.length} از ${
                    license!.maxDownloads > 0 ? license!.maxDownloads : "نامحدود"
                  }) کم می‌شود.`
                : `Valid for ${GIFT_LINK_TTL_LABEL.en}. Downloads are logged and count against the license quota (${license!.downloads.length} of ${
                    license!.maxDownloads > 0 ? license!.maxDownloads : "unlimited"
                  }).`}
            </p>

            {link && files.length > 1 && (
              <div className="mt-6 rounded-xl border border-border p-4">
                <p className="text-caption font-medium">{fa ? "فایل‌های این تحویل" : "Files in this delivery"}</p>
                <ul className="mt-3 space-y-2">
                  {files.map((file) => (
                    <li key={file.key} className="flex flex-wrap items-center gap-2 text-caption">
                      <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: file.hex }} aria-hidden />
                      <span className="font-medium">{file.colourway}</span>
                      <a
                        href={file.url}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 hover:border-foreground"
                        dir="ltr"
                      >
                        <Download className="h-3 w-3" />
                        {file.format}
                        <span className="text-muted">
                          {file.size >= 1048576 ? `${(file.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {link ? (
              <a href={link} className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background">
                <Download className="h-4 w-4" />
                {fa ? "دانلود فایل اصلی" : "Download the master file"}
              </a>
            ) : (
              <p className="mt-6 rounded-xl bg-warning/10 p-4 text-caption text-warning">
                {fa
                  ? "سهمیه دانلود این لایسنس تکمیل شده است. برای تمدید با پشتیبانی تماس بگیرید."
                  : "This licence has reached its download quota — contact support to extend it."}
              </p>
            )}

            <p className="mt-6 text-caption text-foreground-secondary">
              {fa ? "گواهی PDF لایسنس:" : "PDF certificate:"}{" "}
              <a href={`/api/marketplace/licenses/${license!.id}/certificate?locale=${locale}&token=${encodeURIComponent(decodeURIComponent(token))}`} className="text-accent underline" target="_blank" rel="noreferrer">
                {license!.serial}
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
