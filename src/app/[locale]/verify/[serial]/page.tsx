import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BadgeCheck } from "lucide-react";
import { findLicenseBySerial } from "@/lib/marketplace/orders";
import { getAsset } from "@/lib/marketplace/assets";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Public certificate page addressed by serial number — the friendly target of
 * every QR code we print. Deliberately reveals the minimum: the work, the
 * artist, the kind of licence and whether it is still active. Buyer identity is
 * masked, and nothing about the file or the sale price leaves this page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; serial: string }>;
}): Promise<Metadata> {
  const { locale, serial } = await params;
  const fa = locale === "fa";
  return {
    title: fa ? `گواهی ${serial}` : `Certificate ${serial}`,
    robots: { index: false },
  };
}

export default async function VerifySerialPage({
  params,
}: {
  params: Promise<{ locale: Locale; serial: string }>;
}) {
  const { locale, serial: rawSerial } = await params;
  const serial = decodeURIComponent(rawSerial ?? "").toUpperCase();
  const fa = locale === "fa";

  /* The console page handles free-text entry; deep links land here. */
  if (!serial) redirect(href(locale, "/verify"));

  const license = await findLicenseBySerial(serial);
  const asset = license ? await getAsset(license.assetId) : null;
  const valid = Boolean(license && license.status === "active");

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "راستی‌آزمایی گواهی" : "Verify certificate", href: href(locale, "/verify") },
          { label: serial },
        ]}
        locale={locale}
        className="mb-6"
      />

      <div className={`mx-auto max-w-2xl rounded-2xl border p-7 ${valid ? "border-success/40 bg-success/5" : "border-error/40 bg-error/5"}`}>
        <p className="flex items-center gap-2 font-display text-h3">
          {valid ? <BadgeCheck className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-error" />}
          {valid
            ? fa
              ? "این گواهی معتبر است"
              : "This certificate is valid"
            : license
              ? fa
                ? "این گواهی باطل شده است"
                : "This certificate has been revoked"
              : fa
                ? "گواهی پیدا نشد"
                : "Certificate not found"}
        </p>

        <p className="mt-2 text-caption text-foreground-secondary" dir="ltr">
          {serial}
        </p>

        {license && (
          <>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <Field label={fa ? "اثر" : "Work"} value={asset ? (fa ? asset.title.fa : asset.title.en) : "—"} />
              <Field label={fa ? "هنرمند" : "Artist"} value={fa ? license.artistName.fa : license.artistName.en} />
              <Field label={fa ? "نوع لایسنس" : "License type"} value={license.licenseKind} />
              <Field label={fa ? "دارنده" : "Issued to"} value={maskName(license.buyerName)} />
              <Field label={fa ? "تاریخ صدور" : "Issued"} value={new Date(license.issuedAt).toLocaleDateString(fa ? "fa-IR" : "en-GB")} />
              <Field
                label={fa ? "دانلودهای انجام‌شده" : "Downloads"}
                value={`${license.downloads.length}${license.maxDownloads > 0 ? ` / ${license.maxDownloads}` : ""}`}
                ltr
              />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {license.exclusive && <Badge tone="accent">{fa ? "لایسنس انحصاری" : "Exclusive license"}</Badge>}
              <Badge tone={license.status === "active" ? "success" : "error"}>{license.status}</Badge>
            </div>

            {asset && (
              <Link href={href(locale, `/marketplace/${asset.slug}`)} className="mt-5 inline-flex text-sm text-accent underline">
                {fa ? "مشاهده صفحه اثر" : "View the work"}
              </Link>
            )}
          </>
        )}

        <p className="mt-6 text-caption leading-relaxed text-foreground-secondary">
          {fa
            ? "این صفحه فقط اطلاعات لازم برای احراز اصالت گواهی را نشان می‌دهد؛ نام کامل خریدار، مبلغ و فایل اثر محرمانه است."
            : "Only the information needed to authenticate the certificate is shown; the buyer's full name, prices and the file itself stay private."}
        </p>
      </div>
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

/** "Sara Mohammadi" → "S. M." — enough to recognise, not enough to identify. */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return parts.map((part) => `${part[0]}.`).join(" ");
}
