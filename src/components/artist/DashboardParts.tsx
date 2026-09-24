import { Badge } from "@/components/ui/Badge";
import type { Locale } from "@/lib/i18n/types";
import { faNum, formatPrice } from "@/lib/utils";

/**
 * Small presentation pieces shared by the artist dashboard and the sales
 * studio, so status chips, money and charts stay identical wherever they
 * appear.
 */

const STATUS_LABEL: Record<string, { fa: string; en: string }> = {
  uploading: { fa: "در حال بارگذاری", en: "Uploading" },
  scanning: { fa: "در حال بررسی فایل", en: "Scanning" },
  pending_review: { fa: "در انتظار تأیید", en: "Pending review" },
  approved: { fa: "تأییدشده", en: "Approved" },
  rejected: { fa: "رد شده", en: "Rejected" },
  delisted: { fa: "از فروشگاه برداشته شد", en: "Delisted" },
  sold_exclusive: { fa: "فروش انحصاری", en: "Sold exclusively" },
};

export function AssetStatusBadge({ status, fa }: { status: string; fa?: boolean }) {
  const tone =
    status === "approved"
      ? "success"
      : status === "rejected"
        ? "error"
        : status === "pending_review" || status === "uploading" || status === "scanning"
          ? "warning"
          : "neutral";
  const label = STATUS_LABEL[status];
  return <Badge tone={tone}>{label ? (fa === false ? label.en : label.fa) : status}</Badge>;
}

export function Money({ amount, locale }: { amount: { fa: number; en: number }; locale: Locale }) {
  const negative = amount.fa < 0;
  return (
    <span className={`shrink-0 font-medium tabular ${negative ? "text-error" : "text-success"}`} dir="ltr">
      {negative ? "−" : "+"}
      {formatPrice({ fa: Math.abs(amount.fa), en: Math.abs(amount.en) }, locale)}
    </span>
  );
}

/** Slim daily-revenue bars — pure CSS height, no chart library. */
export function MiniBars({ series }: { series: { date: string; revenueFa: number; revenueEn: number; orders: number }[] }) {
  const peak = series.reduce((max, point) => Math.max(max, point.revenueFa || point.revenueEn * 1000), 1);
  return (
    <>
      {series.map((point) => {
        const value = point.revenueFa || point.revenueEn * 1000;
        return (
          <span
            key={point.date}
            title={`${point.date} · ${point.orders}`}
            className="flex-1 rounded-t bg-accent/70"
            style={{ height: `${Math.max(3, (value / peak) * 100)}%` }}
          />
        );
      })}
    </>
  );
}

/** Human label for a byte count, in the reader's digits. */
export function bytesLabel(bytes: number, locale: Locale = "fa"): string {
  const localise = (value: string) => (locale === "fa" ? faNum(value) : value);
  if (bytes <= 0) return "—";
  if (bytes >= 1024 * 1024) return `${localise((bytes / (1024 * 1024)).toFixed(1))} MB`;
  if (bytes >= 1024) return `${localise(String(Math.round(bytes / 1024)))} KB`;
  return `${localise(String(bytes))} B`;
}

/** Persian-aware small counter ("۳ فایل"). */
export function Count({ value, locale, one, many }: { value: number; locale: Locale; one: string; many: string }) {
  return <>{locale === "fa" ? `${faNum(value)} ${value === 1 ? one : many}` : `${value} ${value === 1 ? one : many}`}</>;
}
