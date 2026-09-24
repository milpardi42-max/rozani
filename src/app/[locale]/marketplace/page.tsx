import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Download, FileArchive, ShieldCheck, Sparkles } from "lucide-react";
import { MarketplaceCatalog, type CatalogAsset } from "@/components/marketplace/MarketplaceCatalog";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { listPublicAssets } from "@/lib/marketplace/assets";
import { assetColourways, assetFormatIds } from "@/lib/marketplace/colourways";
import { trackReferralClick } from "@/lib/marketplace/analytics";
import { getCoupon } from "@/lib/marketplace/orders";
import { SUBSCRIPTION_PLANS } from "@/lib/marketplace/config";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const fa = locale === "fa";
  return {
    title: fa ? "فروشگاه فایل دیجیتال و لایسنس" : "Digital files & licensing",
    description: fa
      ? "خرید آثار دیجیتال با لایسنس شفاف، دانلود امن، گواهی PDF و نسخه آزمایشی درگاه پرداخت."
      : "Buy digital works with clear licensing, secure downloads, PDF certificates and a test gateway.",
  };
}

const PILLARS = [
  {
    icon: ShieldCheck,
    fa: { title: "دانلود امن و امضاشده", text: "هر لایسنس لینک اختصاصی و کوتاه‌عمر دارد؛ سهمیه دانلود ثبت می‌شود." },
    en: { title: "Signed secure downloads", text: "Every license gets its own short-lived link and an audited download quota." },
  },
  {
    icon: FileArchive,
    fa: { title: "فایل مادر تمیز", text: "فایل اصلی فقط پس از پرداخت و با لایسنس معتبر در اختیار شماست." },
    en: { title: "Clean master files", text: "The original file is only reachable with a valid, paid license." },
  },
  {
    icon: BadgeCheck,
    fa: { title: "گواهی لایسنس PDF", text: "گواهی رسمی فارسی/انگلیسی با QR راستی‌آزمایی، آماده چاپ." },
    en: { title: "PDF license certificate", text: "An official FA/EN certificate with a verification QR code." },
  },
  {
    icon: Download,
    fa: { title: "پیش‌نمایش بی‌درز", text: "کاشی تکرارشونده، ماکاپ حرفه‌ای و اعلام خودکار درزبندی الگو." },
    en: { title: "Seamless previews", text: "Repeat tiles, professional mockups and automatic seam detection." },
  },
];

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale } = await params;
  const { ref } = await searchParams;
  const fa = locale === "fa";
  const assets = await listPublicAssets();

  /* Affiliate landing: `/{locale}/marketplace?ref=CODE`.
     Only counted for codes that really exist, so the numbers stay honest and a
     random querystring cannot inflate anyone's stats. */
  const referral = (ref ?? "").trim().toUpperCase();
  if (referral) {
    const coupon = await getCoupon(referral).catch(() => null);
    if (coupon?.affiliateUserId && (coupon.active ?? true)) {
      /* Awaited (not fire-and-forget): Next is free to end the request as soon as
         the response is flushed, which would drop the click. */
      await trackReferralClick(referral).catch(() => undefined);
    }
  }

  const breadcrumb = [
    { label: fa ? "خانه" : "Home", href: href(locale, "/") },
    { label: fa ? "فایل دیجیتال" : "Digital files" },
  ];

  const stats = [
    { value: assets.length, fa: "اثر موجود", en: "works available" },
    { value: assets.reduce((sum, asset) => sum + asset.stats.sales, 0), fa: "فروش موفق", en: "completed sales" },
    { value: assets.filter((asset) => asset.seamless.verdict === "seamless").length, fa: "الگوی بی‌درز", en: "seamless patterns" },
    { value: SUBSCRIPTION_PLANS.length, fa: "پلن اشتراک", en: "download passes" },
  ];

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb items={breadcrumb} locale={locale} className="mb-5" />

      <header className="relative overflow-hidden rounded-2xl bg-background-secondary p-8 md:p-12">
        <div className="absolute -end-24 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <p className="anim-blur-in text-label text-accent">
          <Sparkles className="me-2 inline h-3.5 w-3.5" />
          {fa ? "لایسنس شفاف · پرداخت امن · تحویل فوری" : "Clear licensing · secure payment · instant delivery"}
        </p>
        <h1 className="anim-blur-in mt-4 max-w-2xl font-display text-h1 text-balance" style={{ animationDelay: "80ms" }}>
          {fa ? "آثار دیجیتال با لایسنس رسمی" : "Digital works with official licensing"}
        </h1>
        <p className="anim-blur-in mt-4 max-w-xl text-body-lg text-foreground-secondary" style={{ animationDelay: "140ms" }}>
          {fa
            ? "الگو، تصویرسازی و وکتور — با فایل مادر خصوصی، پیش‌نمایش واترمارک‌شده، گواهی لایسنس PDF و امکان خرید انحصاری."
            : "Patterns, illustrations and vectors — private master files, watermarked previews, PDF license certificates and exclusive purchases."}
        </p>

        <dl className="anim-fade-up mt-8 grid grid-cols-2 gap-4 md:grid-cols-4" style={{ animationDelay: "200ms" }}>
          {stats.map((stat) => (
            <div key={stat.en} className="rounded-xl border border-border/60 bg-background/60 p-4">
              <dt className="text-caption text-foreground-secondary">{fa ? stat.fa : stat.en}</dt>
              <dd className="mt-1 font-display text-2xl">{locale === "fa" ? stat.value.toLocaleString("fa-IR") : stat.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon;
          const copy = locale === "fa" ? pillar.fa : pillar.en;
          return (
            <div key={copy.title} className="rounded-xl border border-border p-5">
              <Icon className="h-5 w-5 text-accent" />
              <p className="mt-3 font-medium">{copy.title}</p>
              <p className="mt-1 text-caption leading-relaxed text-foreground-secondary">{copy.text}</p>
            </div>
          );
        })}
      </section>

      <MarketplaceCatalog
        locale={locale}
        initial={assets.map(
          (asset): CatalogAsset => ({
            id: asset.id,
            slug: asset.slug,
            title: asset.title,
            kind: asset.kind,
            tags: asset.tags,
            status: asset.status,
            soldExclusive: asset.status === "sold_exclusive",
            artistId: asset.artistId,
            createdAt: asset.createdAt,
            stats: { views: asset.stats.views, sales: asset.stats.sales },
            fromPrice: (() => {
              const prices = asset.tiers.filter((tier) => tier.enabled).map((tier) => tier.price.fa).filter((value) => value > 0);
              const usd = asset.tiers.filter((tier) => tier.enabled).map((tier) => tier.price.en).filter((value) => value > 0);
              return prices.length && usd.length ? { fa: Math.min(...prices), en: Math.min(...usd) } : null;
            })(),
            tiers: asset.tiers,
            media: {
              preview: asset.previewKey ?? null,
              tile: asset.tileKey ?? null,
              thumbs: asset.derivatives.filter((file) => file.kind === "thumb").map((file) => file.key),
              mockups: asset.mockups.map((file) => ({ key: file.key, kind: file.kind, variant: file.variant })),
            },
            seamless: { verdict: asset.seamless.verdict, score: asset.seamless.score, tileable: asset.seamless.tileable },
            formats: assetFormatIds(asset),
            colourways: assetColourways(asset).map((colourway) => ({ hex: colourway.hex, name: colourway.name })),
          }),
        )}
      />

      <section className="mt-16 rounded-2xl border border-border bg-gradient-to-b from-background-secondary to-background p-8 md:p-10">
        <h2 className="font-display text-h2">{fa ? "اشتراک دانلود ماهانه" : "Monthly download passes"}</h2>
        <p className="mt-2 max-w-xl text-foreground-secondary">
          {fa
            ? "با پلن ماهانه، هر ماه چند فایل با لایسنس شخصی/تجاری دانلود کنید. آثار انحصاری از پلن مستثنا هستند."
            : "With a monthly pass you download a handful of files each month under personal/commercial licenses. Exclusive works stay out of passes."}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-5 ${plan.featured ? "border-accent bg-accent/5" : "border-border"}`}
            >
              <p className="font-medium">{t(plan.title, locale)}</p>
              <p className="mt-2 font-display text-2xl">
                {fa ? `${plan.price.fa.toLocaleString("fa-IR")} تومان` : `$${plan.price.en}`}
                <span className="text-caption text-foreground-secondary"> /{fa ? "ماه" : "mo"}</span>
              </p>
              <p className="mt-2 text-caption text-foreground-secondary">{t(plan.description, locale)}</p>
              <Link
                href={href(locale, "/marketplace/subscriptions")}
                className="mt-4 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background"
              >
                {fa ? "انتخاب پلن" : "Choose plan"}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
