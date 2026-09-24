"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Crown, FileText, Layers, Lock, ShieldCheck, ShoppingBag, User } from "lucide-react";
import { useMarketplaceCart } from "@/components/marketplace/MarketplaceCart";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice, href, t } from "@/lib/utils";
import { familyById } from "@/lib/data/families";
import type { Locale, Localized } from "@/lib/i18n/types";
import type { LicenseTier, PricePair } from "@/lib/marketplace/types";

export interface AssetDetailData {
  id: string;
  slug: string;
  title: { fa: string; en: string };
  description: { fa: string; en: string };
  kind: string;
  tags: string[];
  /** Product family chosen on upload (`lib/data/families.ts`) — optional. */
  familyId?: string | null;
  /** Colour versions of this work, each with its own preview and file set. */
  colourways?: {
    id: string;
    name: Localized;
    hex: string;
    preview: string | null;
    files: { formatId: string; sizeBytes: number; width?: number; height?: number }[];
  }[];
  /** Every deliverable format this work ships, in PNG→EPS order. */
  formats?: { id: string; label: Localized; bytes: number; colourways: number }[];
  status: string;
  soldExclusive: boolean;
  purchasable: boolean;
  artistId: string | null;
  createdAt: string;
  stats: { views: number; sales: number };
  tiers: LicenseTier[];
  media: { preview: string | null; tile: string | null; thumbs: string[]; mockups: { key: string; kind: string; variant?: string }[] };
  seamless: { verdict: string; score: number; tileable: boolean };
  file?: { mime: string; sizeBytes: number; width?: number; height?: number; sha256: string };
}

interface Props {
  locale: Locale;
  asset: AssetDetailData;
  artistName: { fa: string; en: string } | null;
  couponHint?: string | null;
}

const KIND_LABEL: Record<string, { fa: string; en: string }> = {
  pattern: { fa: "الگو", en: "Pattern" },
  illustration: { fa: "تصویرسازی", en: "Illustration" },
  photo: { fa: "عکس", en: "Photo" },
  vector: { fa: "وکتور", en: "Vector" },
  template: { fa: "قالب", en: "Template" },
  font: { fa: "فونت", en: "Font" },
};

function bytes(value: number, locale: Locale) {
  const mb = value / 1024 / 1024;
  const text = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
  return locale === "fa" ? text.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]) : text;
}

export function AssetDetail({ locale, asset, artistName, couponHint }: Props) {
  const fa = locale === "fa";
  const family = familyById(asset.familyId);
  const { add, has, remove, captureReferral } = useMarketplaceCart();
  const referral = useSearchParams().get("ref");
  useEffect(() => {
    if (referral) captureReferral(referral);
  }, [referral, captureReferral]);
  const tiers = asset.tiers.filter((tier) => tier.enabled);
  const [selected, setSelected] = useState<string>(tiers.find((tier) => !tier.exclusive)?.id ?? tiers[0]?.id ?? "");
  const [galleryIndex, setGalleryIndex] = useState(0);

  const tier = tiers.find((item) => item.id === selected) ?? null;
  const colourways = asset.colourways ?? [];
  /* Gallery order: colour 1 (mockups around it), then every other colour, then
     the flat 2×2 tile. Missing previews are skipped rather than left blank. */
  const gallery = [
    ...(colourways[0]?.preview ? [colourways[0].preview] : asset.media.preview ? [asset.media.preview] : []),
    ...asset.media.mockups.map((file) => file.key),
    ...colourways.slice(1).map((colourway) => colourway.preview).filter((key): key is string => Boolean(key)),
    ...(asset.media.tile ? [asset.media.tile] : []),
  ];
  const activeKey = gallery[Math.min(galleryIndex, Math.max(gallery.length - 1, 0))] ?? null;

  /** Which gallery frame shows each colour (null when a colour ships no preview). */
  const colourFrame = (() => {
    const frames = new Map<string, number>();
    let cursor = asset.media.preview || colourways[0]?.preview ? 1 + asset.media.mockups.length : 0;
    colourways.forEach((colourway, index) => {
      if (index === 0) {
        frames.set(colourway.id, 0);
        return;
      }
      if (!colourway.preview) return;
      frames.set(colourway.id, cursor);
      cursor += 1;
    });
    return frames;
  })();

  const inCart = asset.id ? has(asset.id) : false;

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <div className="relative aspect-4/3 overflow-hidden rounded-2xl border border-border bg-background-secondary">
          {activeKey ? (
            <Image
              src={`/api/marketplace/media?key=${encodeURIComponent(activeKey)}`}
              alt={t(asset.title, locale)}
              fill
              priority
              sizes="(max-width:1024px) 100vw, 58vw"
              className="object-contain"
            />
          ) : (
            <span className="grid h-full place-items-center text-caption text-foreground-secondary">
              {fa ? "پیش‌نمایشی ثبت نشده است" : "No preview registered"}
            </span>
          )}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_45%,rgba(255,255,255,.06)_50%,transparent_55%)]" />
          <span className="absolute bottom-3 start-3 rounded-full bg-black/60 px-3 py-1 text-caption text-white backdrop-blur">
            {fa ? "پیش‌نمایش واترمارک‌شده — فایل اصلی بدون واترمارک است" : "Watermarked preview — the master file is clean"}
          </span>
        </div>

        {colourways.length > 1 && (
          <div className="mt-4">
            <p className="mb-2 text-caption font-medium text-foreground-secondary">
              {fa ? `رنگ‌بندی‌ها (${colourways.length} رنگ)` : `Colourways (${colourways.length})`}
            </p>
            <div className="flex flex-wrap gap-2">
              {colourways.map((colourway) => {
                const frame = colourFrame.get(colourway.id);
                const active = frame !== undefined && frame === galleryIndex && galleryIndex < gallery.length - asset.media.mockups.length - (asset.media.tile ? 1 : 0);
                return (
                  <button
                    key={colourway.id}
                    type="button"
                    onClick={() => frame !== undefined && setGalleryIndex(frame)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-caption transition-colors ${
                      active ? "border-accent bg-accent/10" : "border-border hover:border-foreground/40"
                    }`}
                    title={colourway.preview ? undefined : fa ? "پیش‌نمایشی برای این رنگ ثبت نشده" : "No preview for this colour yet"}
                  >
                    <span className="h-4 w-4 rounded-full border border-border" style={{ background: colourway.hex }} aria-hidden />
                    {colourway.name[locale] ?? colourway.name.fa}
                    <span className="text-muted">{colourway.files.length}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((key, index) => (
              <button
                key={key}
                type="button"
                onClick={() => setGalleryIndex(index)}
                className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border ${
                  index === galleryIndex ? "border-accent" : "border-border"
                }`}
              >
                <Image src={`/api/marketplace/media?key=${encodeURIComponent(key)}`} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-caption text-foreground-secondary">
              <Layers className="h-3.5 w-3.5" />
              {fa ? "وضعیت درزبندی الگو" : "Pattern seam check"}
            </p>
            <p className="mt-1 font-medium">
              {asset.seamless.verdict === "seamless"
                ? fa
                  ? "بی‌درز"
                  : "Seamless"
                : asset.seamless.verdict === "near-seamless"
                  ? fa
                    ? "تقریباً بی‌درز"
                    : "Near seamless"
                  : fa
                    ? "بی‌درز نیست"
                    : "Not seamless"}
              <span className="ms-2 text-caption text-foreground-secondary">
                {(asset.seamless.score * 100).toFixed(0)}%
              </span>
            </p>
            <p className="mt-1 text-caption leading-relaxed text-foreground-secondary">
              {fa
                ? "امتیاز از مقایسه اختلاف لبه‌های تکرارشونده با نواحی داخلی تصویر محاسبه می‌شود."
                : "Score compares wrap-edge continuity against interior variation."}
            </p>
          </div>

          {asset.formats && asset.formats.length > 0 && (
            <div className="rounded-xl border border-border p-4 sm:col-span-2">
              <p className="flex items-center gap-2 text-caption font-medium text-foreground">
                <Layers className="h-3.5 w-3.5 text-accent" />
                {fa ? "فرمت‌های تحویل" : "Delivered formats"}
              </p>
              <p className="mt-1 text-caption text-foreground-secondary">
                {fa
                  ? "با خرید لایسنس، همهٔ این فایل‌ها را در حساب خود دانلود می‌کنید — خام، بدون واترمارک."
                  : "One license unlocks every file below in your account — clean, un-watermarked."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {asset.formats.map((format) => (
                  <span
                    key={format.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background-secondary px-3 py-1.5 text-caption"
                  >
                    <span className="font-semibold" dir="ltr">
                      {format.label[locale] ?? format.label.fa}
                    </span>
                    <span className="text-muted" dir="ltr">
                      {format.bytes >= 1024 * 1024 ? `${(format.bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(format.bytes / 1024))} KB`}
                    </span>
                    {format.colourways > 1 && (
                      <span className="text-muted">
                        {fa ? `${format.colourways} رنگ` : `${format.colourways} colours`}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-caption text-foreground-secondary">
              <FileText className="h-3.5 w-3.5" />
              {fa ? "مشخصات فایل" : "File"}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {asset.file?.width && asset.file?.height && (
                <li>
                  {fa ? "ابعاد" : "Dimensions"}: <span dir="ltr">{asset.file.width}×{asset.file.height}</span>
                </li>
              )}
              {asset.file && <li>{fa ? "حجم" : "Size"}: {bytes(asset.file.sizeBytes, locale)}</li>}
              {asset.file && <li className="truncate">{fa ? "نوع" : "Type"}: <span dir="ltr">{asset.file.mime}</span></li>}
              <li className="flex items-center gap-1 text-caption text-foreground-secondary">
                <Lock className="h-3 w-3" />
                {fa ? "فایل اصلی خصوصی است و فقط با لایسنس تحویل می‌شود." : "The master stays private and is delivered only with a license."}
              </li>
            </ul>
          </div>
        </div>

        {asset.description && (asset.description.fa || asset.description.en) && (
          <div className="mt-8">
            <h2 className="font-display text-h3">{fa ? "درباره این اثر" : "About this work"}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground-secondary">{t(asset.description, locale)}</p>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-border p-5">
          <h2 className="font-display text-h3">{fa ? "چطور فایل را تحویل می‌گیرم؟" : "How is the file delivered?"}</h2>
          <ol className="mt-3 space-y-3 text-sm text-foreground-secondary">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-caption text-accent">۱</span>
              {fa
                ? "لایسنس مناسب را انتخاب و سفارش را پرداخت می‌کنید (درگاه آزمایشی هم کاملاً کار می‌کند)."
                : "Pick a license and pay (the test gateway exercises the whole flow)."}
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-caption text-accent">۲</span>
              {fa
                ? "بلافاصله یک لینک دانلود امضاشده + گواهی PDF لایسنس صادر می‌شود."
                : "A signed download link plus a PDF license certificate are issued immediately."}
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-caption text-accent">۳</span>
              {fa
                ? "هر دانلود ثبت می‌شود و سهم هنرمند به‌صورت خودکار در کیف پولش می‌نشیند."
                : "Every download is logged and the artist royalty lands in their wallet automatically."}
            </li>
          </ol>
        </div>
      </div>

      <aside className="lg:col-span-5">
        <div className="sticky top-[calc(var(--header-h)+1rem)] space-y-4">
          <div className="rounded-2xl border border-border p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{KIND_LABEL[asset.kind] ? t(KIND_LABEL[asset.kind], locale) : asset.kind}</Badge>
              {family && (
                <Link href={`${href(locale, "/shop")}?family=${family.slug}`} className="inline-flex">
                  <Badge tone="outline">{family.name[locale] ?? family.name.fa}</Badge>
                </Link>
              )}
              {asset.seamless.verdict === "seamless" && <Badge tone="success">{fa ? "بی‌درز" : "Seamless"}</Badge>}
              {asset.soldExclusive && <Badge tone="error">{fa ? "انحصاری فروخته شد" : "Sold exclusively"}</Badge>}
            </div>

            <h1 className="mt-4 font-display text-h2 text-balance">{t(asset.title, locale)}</h1>

            {artistName && (
              <p className="mt-2 flex items-center gap-2 text-caption text-foreground-secondary">
                <User className="h-3.5 w-3.5" />
                {fa ? "هنرمند" : "Artist"}: <b className="font-medium text-foreground">{t(artistName, locale)}</b>
              </p>
            )}

            {asset.stats.sales > 0 && (
              <p className="mt-1 text-caption text-foreground-secondary">
                {fa ? `${asset.stats.sales} فروش موفق` : `${asset.stats.sales} completed sales`}
              </p>
            )}

            <div className="mt-5 space-y-2">
              {tiers.length === 0 && (
                <p className="rounded-lg bg-background-secondary px-3 py-2 text-caption">
                  {fa ? "لایسنسی فعال نیست." : "No active license tier."}
                </p>
              )}
              {tiers.map((item) => {
                const isActive = item.id === selected;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={asset.soldExclusive}
                    onClick={() => setSelected(item.id)}
                    className={`w-full rounded-xl border p-4 text-start transition ${
                      isActive ? "border-accent bg-accent/5" : "border-border hover:border-foreground/40"
                    } ${asset.soldExclusive ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium">
                          {item.exclusive && <Crown className="h-4 w-4 text-accent" />}
                          {t(item.title, locale)}
                        </span>
                        <span className="mt-1 block text-caption leading-relaxed text-foreground-secondary">{t(item.terms, locale)}</span>
                        <span className="mt-1 block text-caption text-foreground-secondary">
                          {item.maxUnits > 0 ? (fa ? `تا ${item.maxUnits} واحد` : `up to ${item.maxUnits} units`) : fa ? "بدون محدودیت تعداد" : "unlimited units"}
                          {" · "}
                          {item.maxDownloads > 0 ? (fa ? `${item.maxDownloads} دانلود` : `${item.maxDownloads} downloads`) : fa ? "دانلود نامحدود" : "unlimited downloads"}
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        <span className="block font-medium">{formatPrice(item.price, locale)}</span>
                        {isActive && <Check className="ms-auto mt-1 h-4 w-4 text-accent" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {couponHint && <p className="mt-4 text-caption text-accent">{couponHint}</p>}

            <div className="mt-5 flex flex-col gap-2">
              {asset.soldExclusive ? (
                <Button href={href(locale, "/marketplace")} variant="outline">
                  {fa ? "بازگشت به فروشگاه" : "Back to the shop"}
                </Button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!tier}
                    onClick={() => {
                      if (!tier) return;
                      if (inCart) remove(asset.id, tier.id);
                      else
                        add({
                          assetId: asset.id,
                          tierId: tier.id,
                          slug: asset.slug,
                          titleFa: asset.title.fa,
                          titleEn: asset.title.en,
                          tierTitleFa: tier.title.fa,
                          tierTitleEn: tier.title.en,
                          licenseKind: tier.kind,
                          price: tier.price,
                          preview: asset.media.preview,
                          artistFa: artistName?.fa ?? "",
                          artistEn: artistName?.en ?? "",
                        });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-50"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {inCart ? (fa ? "در سبد خرید — رفتن به پرداخت" : "In cart — go to checkout") : fa ? "افزودن به سبد خرید" : "Add to cart"}
                  </button>
                  {inCart && (
                    <Button href={href(locale, "/marketplace/cart")} variant="outline">
                      {fa ? "مشاهده سبد و پرداخت" : "Open cart & checkout"}
                    </Button>
                  )}
                </>
              )}
            </div>

            <ul className="mt-5 space-y-2 text-caption text-foreground-secondary">
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                {fa ? "پرداخت امن؛ در نبود کلید درگاه، حالت آزمایشی فعال می‌شود." : "Secure payment; a test gateway takes over when no live keys exist."}
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                {fa ? "گواهی PDF با کد QR راستی‌آزمایی، قابل ارائه به مشتری نهایی." : "QR-verifiable PDF certificate you can hand to your client."}
              </li>
              <li className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-accent" />
                {fa ? "مجوز استفاده تجاری در لایسنس تجاری و گسترده." : "Commercial usage rights under the commercial/extended tiers."}
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-border p-5 text-caption text-foreground-secondary">
            <p className="font-medium text-foreground">{fa ? "گارانتی کیفیت فایل" : "File quality guarantee"}</p>
            <p className="mt-1 leading-relaxed">
              {fa
                ? "هر فایل قبل از انتشار اسکن ویروس می‌شود و پیش‌نمایش آن با واترمارک ساخته می‌شود. اگر فایل خراب باشد، لایسنس باطل و مبلغ بازگردانده می‌شود."
                : "Every file is virus-scanned and previewed with a watermark before publication. If a file is defective, the license is revoked and refunded."}
            </p>
            <Link href={href(locale, "/legal/returns")} className="mt-2 inline-block text-accent underline">
              {fa ? "سیاست بازگشت" : "Refund policy"}
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

export type { PricePair };
