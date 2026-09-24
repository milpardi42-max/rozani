import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Banknote,
  Clock,
  Download,
  Eye,
  FileStack,
  LayoutGrid,
  Palette,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { AssetStatusBadge, MiniBars, Money, bytesLabel } from "@/components/artist/DashboardParts";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { formatLabel } from "@/lib/marketplace/formats";
import { familyName } from "@/lib/data/families";
import type { ArtistDashboardData, DashboardWork } from "@/lib/artist/dashboard";
import type { Locale } from "@/lib/i18n/types";
import { faNum, formatPrice, href, t } from "@/lib/utils";

/**
 * The artist dashboard.
 *
 * Server-rendered: every number, swatch and format chip comes from
 * `getArtistDashboard()` in one pass, so the page is fast and the view stays
 * free of data fetching. Actions deep-link into the sales studio, which owns
 * the interactive editors (upload, pricing, payouts, referral codes).
 */
export function ArtistDashboardView({ locale, data }: { locale: Locale; data: ArtistDashboardData }) {
  const fa = locale === "fa";
  const { artist, totals, gaps, analytics, wallet } = data;

  const pending = totals.inReview > 0;
  const onboarding = [
    {
      done: Boolean(artist?.signupStudio || artist?.name),
      label: fa ? "پرونده‌ی استودیو ثبت شد" : "Studio file submitted",
      href: href(locale, "/artist/portfolio"),
    },
    { done: totals.works > 0, label: fa ? "اولین طرح ارسال شد" : "First work submitted", href: href(locale, "/artist/marketplace?tab=upload") },
    {
      done: totals.colourways >= 2 || totals.works === 0,
      label: fa ? "برای طرح‌ها چند رنگ‌بندی گذاشتید" : "Colourways added to your works",
      href: href(locale, "/artist/marketplace?tab=upload"),
    },
    {
      done: totals.formats.length >= 3,
      label: fa ? "فرمت‌های تحویل کامل (PNG تا EPS)" : "Delivery formats complete (PNG → EPS)",
      href: href(locale, "/artist/marketplace?tab=assets"),
    },
    {
      done: Boolean(wallet.profile),
      label: fa ? "اطلاعات تسویه ثبت شد" : "Payout details saved",
      href: href(locale, "/artist/marketplace?tab=wallet"),
    },
  ];
  const doneCount = onboarding.filter((row) => row.done).length;

  return (
    <div className="space-y-6">
      {/* ── identity ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-background-secondary">
              {artist?.avatar ? (
                <Image src={artist.avatar} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-display text-h3 text-muted">
                  {(t(artist?.name ?? { fa: "؟", en: "?" }, locale) || "؟").slice(0, 1)}
                </span>
              )}
            </span>
            <div>
              <p className="text-label text-accent">{fa ? "داشبورد هنرمند" : "Artist dashboard"}</p>
              <h1 className="mt-1 font-display text-h2">{t(data.artistName, locale) || (fa ? "هنرمند" : "Artist")}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-caption text-foreground-secondary">
                {artist?.profession && <span>{t(artist.profession, locale)}</span>}
                {(artist?.signupCity || t(artist?.location ?? undefined, locale)) && (
                  <span>· {artist?.signupCity || t(artist?.location, locale)}</span>
                )}
                {artist?.signupStudio && <span>· {artist.signupStudio}</span>}
                <Badge tone={artist?.status === "approved" ? "success" : artist?.status === "rejected" ? "error" : "warning"}>
                  {artist?.status === "approved"
                    ? fa
                      ? "تأییدشده"
                      : "Approved"
                    : artist?.status === "rejected"
                      ? fa
                        ? "رد شده"
                        : "Rejected"
                      : fa
                        ? "در انتظار تأیید"
                        : "Pending review"}
                </Badge>
                <Badge tone="neutral">
                  {fa ? `سهم شما ${faNum(data.sharePct)}٪` : `Your share ${data.sharePct}%`}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={href(locale, "/artist/marketplace?tab=upload")}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm text-background transition hover:bg-primary"
            >
              <Plus className="h-4 w-4" />
              {fa ? "ارسال طرح تازه" : "Submit a new work"}
            </Link>
            <Link
              href={href(locale, "/artist/marketplace?tab=assets")}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition hover:border-foreground"
            >
              <Store className="h-4 w-4" />
              {fa ? "میز کار فروش" : "Sales studio"}
            </Link>
            {artist?.slug && (
              <Link
                href={href(locale, `/artists/${artist.slug}`)}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition hover:border-foreground"
              >
                <Eye className="h-4 w-4" />
                {fa ? "پروفایل عمومی" : "Public profile"}
              </Link>
            )}
            <Link
              href={href(locale, "/account")}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm transition hover:border-foreground"
            >
              <User className="h-4 w-4" />
              {fa ? "حساب من" : "My account"}
            </Link>
            <SignOutButton size="lg" />
          </div>
        </div>

        {/* onboarding ribbon */}
        <div className="border-t border-border bg-background-secondary px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-caption font-medium">
              {fa ? `راه‌اندازی استودیو: ${faNum(doneCount)} از ${faNum(onboarding.length)}` : `Studio setup: ${doneCount} of ${onboarding.length}`}
            </span>
            {onboarding.map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className={`inline-flex items-center gap-1.5 text-caption transition ${
                  row.done ? "text-success" : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                {row.done ? <BadgeCheck className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-border" />}
                {row.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Banknote}
          label={fa ? "درآمد ۳۰ روز" : "Revenue · 30d"}
          value={formatPrice(analytics.revenue, locale)}
          delta={pctChange(analytics.revenue.fa, analytics.previous.revenue.fa)}
          hint={fa ? `سهم شما: ${formatPrice(analytics.royalties, locale)}` : `Your royalty: ${formatPrice(analytics.royalties, locale)}`}
          fa={fa}
        />
        <Kpi
          icon={ShoppingBag}
          label={fa ? "فروش ۳۰ روز" : "Sales · 30d"}
          value={faNum(analytics.sales)}
          delta={pctChange(analytics.sales, analytics.previous.sales)}
          hint={
            analytics.averageOrder.fa > 0
              ? fa
                ? `میانگین سفارش: ${formatPrice(analytics.averageOrder, locale)}`
                : `Average order: ${formatPrice(analytics.averageOrder, locale)}`
              : fa
                ? "هنوز فروشی ثبت نشده"
                : "No sales yet"
          }
          fa={fa}
        />
        <Kpi
          icon={Download}
          label={fa ? "دانلود تحویل‌ها" : "Deliveries downloaded"}
          value={faNum(analytics.downloads)}
          delta={pctChange(analytics.downloads, analytics.previous.downloads)}
          hint={fa ? `${faNum(totals.files)} فایل در ${faNum(totals.works)} اثر` : `${totals.files} files across ${totals.works} works`}
          fa={fa}
        />
        <Kpi
          icon={Eye}
          label={fa ? "بازدید ۳۰ روز" : "Views · 30d"}
          value={faNum(analytics.views)}
          delta={pctChange(analytics.views, analytics.previous.views)}
          hint={fa ? `نرخ تبدیل: ${faNum(analytics.conversionPct)}٪` : `Conversion: ${analytics.conversionPct}%`}
          fa={fa}
        />
      </section>

      {/* ── live works + wallet ──────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-caption text-foreground-secondary">
            <LayoutGrid className="h-4 w-4" />
            {fa ? "وضعیت آثار" : "Work status"}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <StatusRow label={fa ? "منتشرشده در فروشگاه" : "Live in the shop"} value={totals.live} tone="success" />
            <StatusRow label={fa ? "در انتظار بازبینی" : "Waiting for review"} value={totals.inReview} tone={pending ? "warning" : "neutral"} />
            <StatusRow label={fa ? "رد شده" : "Rejected"} value={totals.rejected} tone={totals.rejected ? "error" : "neutral"} />
            <StatusRow label={fa ? "کل آثار" : "All works"} value={totals.works} tone="neutral" />
          </ul>
          {pending && (
            <p className="mt-4 flex gap-2 rounded-xl bg-warning/10 p-3 text-caption text-warning">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {fa
                ? "آثار در انتظار بازبینی پس از تأیید مدیر در فروشگاه ظاهر می‌شوند."
                : "Works appear in the shop once an admin approves them."}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-caption text-foreground-secondary">
            <Wallet className="h-4 w-4" />
            {fa ? "کیف پول و تسویه" : "Wallet & payouts"}
          </p>
          <p className="mt-4 font-display text-h3">{formatPrice(wallet.balance.available, locale)}</p>
          <p className="text-caption text-foreground-secondary">{fa ? "موجودی قابل برداشت" : "Available to withdraw"}</p>
          <ul className="mt-4 space-y-2 text-caption">
            <li className="flex justify-between">
              <span className="text-foreground-secondary">{fa ? "کل درآمد سهم شما" : "Total royalties"}</span>
              <span className="font-medium">{formatPrice(wallet.balance.total, locale)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-foreground-secondary">{fa ? "پرداخت‌شده" : "Paid out"}</span>
              <span className="font-medium">{formatPrice(wallet.balance.paidOut, locale)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-foreground-secondary">{fa ? "در انتظار پرداخت" : "Pending"}</span>
              <span className="font-medium">{formatPrice(wallet.balance.pending, locale)}</span>
            </li>
            <li className="flex justify-between border-t border-border pt-2">
              <span className="text-foreground-secondary">{fa ? "حداقل تسویه" : "Payout minimum"}</span>
              <span className="font-medium">{formatPrice(wallet.minimum, locale)}</span>
            </li>
          </ul>
          <Link
            href={href(locale, "/artist/marketplace?tab=wallet")}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-caption transition hover:border-foreground"
          >
            <Banknote className="h-3.5 w-3.5" />
            {fa ? "درخواست تسویه و اطلاعات بانکی" : "Request a payout"}
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-caption text-foreground-secondary">
            <TrendingUp className="h-4 w-4" />
            {fa ? "درآمد روزانه (۳۰ روز)" : "Daily revenue (30d)"}
          </p>
          <div className="mt-4 flex h-24 items-end gap-1" dir="ltr">
            <MiniBars series={analytics.series} />
          </div>
          <p className="mt-3 text-caption text-foreground-secondary">
            {analytics.range.from
              ? `${analytics.range.from} → ${analytics.range.to}`
              : fa
                ? "به‌زودی"
                : "Coming soon"}
          </p>
          {analytics.topAssets.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-border pt-3 text-caption">
              {analytics.topAssets.slice(0, 3).map((row) => (
                <li key={row.assetId} className="flex items-center justify-between gap-3">
                  <span className="truncate">{t(row.title, locale)}</span>
                  <span className="shrink-0 text-foreground-secondary">
                    {faNum(row.sales)} × {formatPrice(row.revenue, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ── delivery quality ─────────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <p className="flex items-center gap-2 text-caption text-foreground-secondary">
            <FileStack className="h-4 w-4" />
            {fa ? "سرانه‌ی تحویل شما" : "Your delivery at a glance"}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-display text-h3">{faNum(totals.colourways)}</p>
              <p className="text-caption text-foreground-secondary">{fa ? "رنگ‌بندی" : "Colourways"}</p>
            </div>
            <div>
              <p className="font-display text-h3">{faNum(totals.files)}</p>
              <p className="text-caption text-foreground-secondary">{fa ? "فایل تحویل" : "Delivery files"}</p>
            </div>
            <div>
              <p className="font-display text-h3">{bytesLabel(totals.bytes, locale)}</p>
              <p className="text-caption text-foreground-secondary">{fa ? "حجم کل تحویل" : "Total delivery size"}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {totals.formats.length === 0 ? (
              <p className="text-caption text-foreground-secondary">
                {fa ? "هنوز فایلی ارسال نشده است." : "No files submitted yet."}
              </p>
            ) : (
              totals.formats.map((row) => (
                <span key={row.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-caption">
                  <span className="font-medium" dir="ltr">
                    {formatLabel(row.id, locale)}
                  </span>
                  <span className="text-foreground-secondary">
                    {fa ? `${faNum(row.works)} اثر` : `${row.works} works`}
                  </span>
                </span>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="flex items-center gap-2 text-caption text-foreground-secondary">
            <Sparkles className="h-4 w-4" />
            {fa ? "پیشنهاد برای فروش بیشتر" : "Make it sell better"}
          </p>
          <ul className="mt-4 space-y-3 text-caption">
            {gaps.missingFormats.map((row) => (
              <li key={row.label.en} className="flex gap-2">
                <FileStack className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {fa
                  ? `${faNum(row.works)} اثر فایل ${row.label.fa} ندارد — خریداران چاپ دوستش دارند.`
                  : `${row.works} work(s) have no ${row.label.en} file — print buyers look for it.`}
              </li>
            ))}
            {gaps.singleColour > 0 && (
              <li className="flex gap-2">
                <Palette className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {fa
                  ? `${faNum(gaps.singleColour)} اثر تنها یک رنگ دارد؛ چند رنگ‌بندی شانس فروش را بالا می‌برد.`
                  : `${gaps.singleColour} work(s) ship in a single colour; more colourways sell more.`}
              </li>
            )}
            {gaps.withoutPreview > 0 && (
              <li className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                {fa
                  ? `${faNum(gaps.withoutPreview)} اثر پیش‌نمایش تصویری ندارد.`
                  : `${gaps.withoutPreview} work(s) have no preview image.`}
              </li>
            )}
            {(gaps.missingFormats.length === 0 && gaps.singleColour === 0 && gaps.withoutPreview === 0) && (
              <li className="flex gap-2">
                <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                {fa
                  ? "تحویل همه‌ی آثار کامل است: رنگ‌بندی، فرمت و پیش‌نمایش."
                  : "Every work has a complete delivery: colourways, formats and previews."}
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ── works ────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="font-display text-h3">{fa ? "آثار من" : "My works"}</h2>
            <p className="mt-1 text-caption text-foreground-secondary">
              {fa
                ? "هر اثر با رنگ‌بندی‌ها، فرمت‌های تحویل و وضعیت فروش."
                : "Every work with its colourways, delivery formats and sales status."}
            </p>
          </div>
          <Link
            href={href(locale, "/artist/marketplace?tab=assets")}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-caption transition hover:border-foreground"
          >
            <Store className="h-3.5 w-3.5" />
            {fa ? "مدیریت قیمت‌ها و لایسنس‌ها" : "Manage prices & licences"}
          </Link>
        </div>

        {data.works.length === 0 ? (
          <div className="p-10 text-center">
            <FileStack className="mx-auto h-7 w-7 text-muted" />
            <p className="mt-4 font-medium">{fa ? "هنوز اثری نساخته‌اید" : "No works yet"}</p>
            <p className="mt-1 text-caption text-foreground-secondary">
              {fa
                ? "اولین طرح را با رنگ‌بندی و فرمت‌های تحویل ارسال کنید؛ بعد از تأیید مدیر در فروشگاه می‌آید."
                : "Submit your first design with its colourways and delivery formats; it goes live after review."}
            </p>
            <Link
              href={href(locale, "/artist/marketplace?tab=upload")}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm text-background"
            >
              <Plus className="h-4 w-4" />
              {fa ? "ارسال طرح تازه" : "Submit a new work"}
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data.works.map((work) => (
              <WorkRow key={work.id} work={work} locale={locale} />
            ))}
          </ul>
        )}
      </section>

      {/* ── activity + licences ──────────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-h4">
            <Banknote className="h-4 w-4 text-accent" />
            {fa ? "آخرین تراکنش‌ها" : "Latest transactions"}
          </h2>
          {data.activity.length === 0 ? (
            <p className="mt-4 text-caption text-foreground-secondary">
              {fa ? "تراکنشی ثبت نشده است." : "No transactions yet."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-caption">
              {data.activity.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate">{row.note || row.kind}</span>
                    <span className="text-muted">{row.at.slice(0, 10)}</span>
                  </span>
                  <Money amount={row.amount} locale={locale} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-h4">
            <BarChart3 className="h-4 w-4 text-accent" />
            {fa ? "ترکیب فروش" : "Sales mix"}
          </h2>
          {analytics.byLicense.length === 0 ? (
            <p className="mt-4 text-caption text-foreground-secondary">
              {fa ? "به‌زودی با اولین فروش پر می‌شود." : "Fills up with your first sale."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border text-caption">
              {analytics.byLicense.map((row) => (
                <li key={row.kind} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{licenseKindLabel(row.kind, fa)}</span>
                  <span className="text-foreground-secondary">
                    {faNum(row.sales)} × {formatPrice(row.revenue, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {analytics.referral.clicks + analytics.referral.conversions > 0 && (
            <p className="mt-4 rounded-xl bg-background-secondary p-3 text-caption text-foreground-secondary">
              {fa
                ? `کدهای معرف: ${faNum(analytics.referral.clicks)} کلیک، ${faNum(analytics.referral.conversions)} تبدیل، کمیسیون ${formatPrice(analytics.referral.commission, locale)}`
                : `Referral codes: ${analytics.referral.clicks} clicks, ${analytics.referral.conversions} conversions, ${formatPrice(analytics.referral.commission, locale)} commission`}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  fa,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: number | null;
  hint: string;
  fa: boolean;
}) {
  const up = delta !== null && delta >= 0;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <Icon className="h-4 w-4 text-accent" />
        {delta !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption ${
              up ? "bg-success/10 text-success" : "bg-error/10 text-error"
            }`}
            title={fa ? "نسبت به ۳۰ روز قبل" : "vs the previous 30 days"}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {fa ? `${faNum(Math.abs(delta))}٪` : `${Math.abs(delta)}%`}
          </span>
        )}
      </div>
      <p className="mt-3 text-caption text-foreground-secondary">{label}</p>
      <p className="mt-1 font-display text-h3">{value}</p>
      <p className="mt-1 text-caption text-muted">{hint}</p>
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "error" | "neutral" }) {
  const dot =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : tone === "error" ? "bg-error" : "bg-border";
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-foreground-secondary">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="font-medium">{value.toLocaleString("en-US")}</span>
    </li>
  );
}

function WorkRow({ work, locale }: { work: DashboardWork; locale: Locale }) {
  const fa = locale === "fa";
  const price = work.priceFrom;

  return (
    <li className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
      <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-background-secondary">
        {work.preview ? (
          <Image src={`/api/marketplace/media?key=${encodeURIComponent(work.preview)}`} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted">
            <FileStack className="h-5 w-5" />
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{t(work.title, locale)}</p>
          <AssetStatusBadge status={work.status} fa={fa} />
          {work.filesUpdatedAt && (
            <Badge tone="warning">{fa ? "فایل تازه — بازبینی دوباره" : "New files — re-review"}</Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-foreground-secondary">
          {work.familyId && <span>{familyName(work.familyId, locale)}</span>}
          <span className="inline-flex items-center gap-1.5">
            {work.colourways.map((colourway) => (
              <span
                key={colourway.id}
                title={t(colourway.name, locale)}
                className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                style={{ background: colourway.hex }}
              />
            ))}
            <span>{fa ? `${faNum(work.colourways.length)} رنگ` : `${work.colourways.length} colours`}</span>
          </span>
          <span dir="ltr" className="inline-flex flex-wrap gap-1">
            {work.formats.map((id) => (
              <span key={id} className="rounded border border-border px-1.5 py-0.5 text-[10px]">
                {formatLabel(id, locale)}
              </span>
            ))}
          </span>
          <span>{bytesLabel(work.bytes, locale)}</span>
        </div>

        {work.reviewNote && (
          <p className="mt-2 rounded-lg bg-error/5 px-3 py-2 text-caption text-error">
            {fa ? "یادداشت بازبینی: " : "Review note: "}
            {work.reviewNote}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-6">
        <div className="text-center">
          <p className="text-caption text-muted">{fa ? "بازدید" : "Views"}</p>
          <p className="font-medium">{faNum(work.views)}</p>
        </div>
        <div className="text-center">
          <p className="text-caption text-muted">{fa ? "فروش" : "Sales"}</p>
          <p className="font-medium">{faNum(work.sales)}</p>
        </div>
        <div className="text-center">
          <p className="text-caption text-muted">{fa ? "از" : "From"}</p>
          <p className="font-medium">{price ? formatPrice(price, locale) : "—"}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href={href(locale, `/marketplace/${work.slug}`)}
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-caption transition hover:border-foreground"
          >
            {fa ? "مشاهده" : "View"}
          </Link>
          <Link
            href={href(locale, "/artist/marketplace?tab=assets")}
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-caption transition hover:border-foreground"
          >
            {fa ? "ویرایش" : "Edit"}
          </Link>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function licenseKindLabel(kind: string, fa: boolean): string {
  const map: Record<string, { fa: string; en: string }> = {
    personal: { fa: "لایسنس شخصی", en: "Personal" },
    commercial: { fa: "لایسنس تجاری", en: "Commercial" },
    extended: { fa: "لایسنس گسترده", en: "Extended" },
    exclusive: { fa: "لایسنس انحصاری", en: "Exclusive" },
    subscription: { fa: "اشتراک", en: "Subscription" },
  };
  const row = map[kind];
  return row ? (fa ? row.fa : row.en) : kind;
}
