"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BadgePercent, Check, CreditCard, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import { useMarketplaceCart } from "@/components/marketplace/MarketplaceCart";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { SESSION_FETCH } from "@/lib/http";
import { formatPrice, href } from "@/lib/utils";
import type { PricePair } from "@/lib/marketplace/types";

/**
 * Digital checkout.
 *
 * Flow: quote (server-priced) → coupon → gateway choice → `POST /checkout`.
 * If the quote is zero (100% discount or a subscription redemption) the order is
 * fulfilled server-side and the buyer lands straight on the receipt page. Otherwise
 * the response carries the gateway URL — including the built-in sandbox page when
 * no live PSP credentials are configured, which is what makes test buying work.
 */

interface QuoteLine {
  assetId: string;
  tierId: string;
  title: { fa: string; en: string };
  kind: string;
  licenseKind: string;
  price: PricePair;
  discount: PricePair;
}

interface Quote {
  lines: QuoteLine[];
  subtotal: PricePair;
  discount: PricePair;
  tax: PricePair;
  total: PricePair;
  charge: { currency: "IRT" | "USD"; amount: number };
  coupon?: { code: string; kind: string; affiliatePct?: number };
  couponError?: string;
  errors: { code: string; assetId?: string; message: { fa: string; en: string } }[];
  payable: boolean;
}

interface GatewayOption {
  id: "zarinpal" | "stripe";
  label: { fa: string; en: string };
  currencies: ("IRT" | "USD")[];
  configured: boolean;
  mode: string;
}

const COUPON_ERRORS: Record<string, { fa: string; en: string }> = {
  not_found: { fa: "این کد وجود ندارد.", en: "That code does not exist." },
  inactive: { fa: "این کد فعال نیست.", en: "This code is not active." },
  expired: { fa: "این کد منقضی شده است.", en: "That code has expired." },
  limit_reached: { fa: "ظرفیت این کد تکمیل شده است.", en: "That code reached its limit." },
  min_subtotal: { fa: "حداقل مبلغ سفارش رعایت نشده است.", en: "Cart total is below the code minimum." },
  not_applicable: { fa: "این کد برای این آثار معتبر نیست.", en: "The code does not apply to these works." },
  international_only: { fa: "این کد فقط برای پرداخت بین‌المللی است.", en: "This code is for international payments." },
};

export function DigitalCheckout() {
  const { locale, dict } = useLocale();
  const { user } = useAuth();
  const { lines, remove, clear, subtotal, setLastOrderId, referral } = useMarketplaceCart();
  const router = useRouter();
  const fa = locale === "fa";

  const [quote, setQuote] = useState<Quote | null>(null);
  const [gateways, setGateways] = useState<GatewayOption[]>([]);
  const [provider, setProvider] = useState<"zarinpal" | "stripe">(fa ? "zarinpal" : "stripe");
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [useSubscription, setUseSubscription] = useState(false);
  const [subscription, setSubscription] = useState<{ planId: string; quota: { remaining: number | null } } | null>(null);
  /* `?ref=` wins (fresh affiliate link), otherwise the code remembered while
     browsing the storefront. */
  const urlReferral = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("ref");
  const affiliateCode = (urlReferral ?? referral)?.trim().toUpperCase() || null;

  /* ---------- gateways + subscription ---------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPlanId(params.get("plan"));
    void (async () => {
      const [gatewayRes, subRes] = await Promise.all([
        fetch("/api/marketplace/payments/providers", SESSION_FETCH),
        fetch("/api/marketplace/subscriptions", SESSION_FETCH),
      ]);
      const gatewayData = (await gatewayRes.json()) as { providers?: GatewayOption[] };
      if (gatewayData.providers?.length) setGateways(gatewayData.providers);
      const subData = (await subRes.json()) as { subscription?: { planId: string; quota: { remaining: number | null } } | null };
      setSubscription(subData.subscription ?? null);
    })();
  }, []);

  /* ---------- quoting ---------- */
  const requestQuote = useCallback(
    async (options: { couponCode?: string | null; useSub?: boolean } = {}) => {
      setQuoting(true);
      setError(null);
      try {
        const response = await fetch("/api/marketplace/checkout/quote", {
          ...SESSION_FETCH,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            items: lines.map((line) => ({ assetId: line.assetId, tierId: line.tierId, viaSubscriptionId: options.useSub ? "pending" : undefined })),
            planId,
            couponCode: options.couponCode === undefined ? couponApplied : options.couponCode,
            affiliateCode,
            provider,
          }),
        });
        const data = (await response.json()) as { ok?: boolean; quote?: Quote; error?: string };
        if (!data.ok || !data.quote) {
          setError(data.error === "empty_cart" ? (fa ? "سبد خرید خالی است." : "Your cart is empty.") : data.error ?? "quote_failed");
          return;
        }
        setQuote(data.quote);
      } finally {
        setQuoting(false);
      }
    },
    [lines, planId, couponApplied, affiliateCode, provider, fa],
  );

  useEffect(() => {
    if (lines.length || planId) void requestQuote();
  }, [lines.length, planId, requestQuote]);

  /* ---------- coupon ---------- */
  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    const response = await fetch("/api/marketplace/coupons", {
      ...SESSION_FETCH,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        items: lines.map((line) => ({ assetId: line.assetId, tierId: line.tierId })),
        planId,
        provider,
        trackClick: true,
      }),
    });
    const data = (await response.json()) as { ok?: boolean; valid?: boolean; reason?: string };
    if (!data.ok || !data.valid) {
      setCouponApplied(null);
      setCouponError(data.reason ?? "not_found");
      void requestQuote({ couponCode: null });
      return;
    }
    setCouponApplied(code);
    void requestQuote({ couponCode: code });
  }

  /* ---------- submit ---------- */
  async function checkout(form: HTMLFormElement) {
    setBusy(true);
    setError(null);
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/marketplace/checkout", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({ assetId: line.assetId, tierId: line.tierId })),
          planId,
          couponCode: couponApplied,
          affiliateCode,
          provider,
          locale,
          useSubscription,
          buyer: {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            phone: String(formData.get("phone") ?? "") || undefined,
            company: String(formData.get("company") ?? "") || undefined,
          },
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        mode?: "free" | "payment";
        order?: { id: string };
        payment?: { redirectUrl: string; sandbox: boolean };
        licenses?: unknown[];
      };

      if (!data.ok) {
        setError(
          data.error === "unavailable"
            ? fa
              ? "یکی از آثار دیگر قابل خرید نیست."
              : "One of the works can no longer be purchased."
            : data.error ?? "checkout_failed",
        );
        return;
      }

      if (data.order?.id) setLastOrderId(data.order.id);

      if (data.mode === "free") {
        clear();
        router.push(`/${locale}/checkout/return?order=${data.order?.id}&status=paid`);
        return;
      }

      if (data.payment?.redirectUrl) {
        clear();
        window.location.href = data.payment.redirectUrl;
        return;
      }

      setError(fa ? "پاسخ درگاه نامعتبر بود." : "The gateway returned an unexpected response.");
    } finally {
      setBusy(false);
    }
  }

  const total = quote?.total ?? subtotal;
  const empty = !lines.length && !planId;

  const bestGateway = useMemo(() => gateways.find((gateway) => gateway.id === provider) ?? null, [gateways, provider]);

  if (empty) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-border p-12 text-center">
        <p className="font-medium">{fa ? "سبد خرید دیجیتال خالی است." : "Your digital cart is empty."}</p>
        <p className="mt-2 text-caption text-foreground-secondary">
          {fa ? "از فروشگاه یک اثر و لایسنس انتخاب کنید." : "Pick a work and a license from the shop."}
        </p>
        <Button href={href(locale, "/marketplace")} className="mt-5">
          {fa ? "رفتن به فروشگاه" : "Go to the shop"}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <ul className="space-y-3">
          {lines.map((line) => (
            <li key={`${line.assetId}:${line.tierId}`} className="flex gap-4 rounded-xl border border-border p-3">
              <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-background-secondary">
                {line.preview && (
                  <Image src={`/api/marketplace/media?key=${encodeURIComponent(line.preview)}`} alt="" fill sizes="96px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={href(locale, `/marketplace/${line.slug}`)} className="font-medium hover:text-accent">
                  {fa ? line.titleFa : line.titleEn}
                </Link>
                <p className="mt-1 text-caption text-foreground-secondary">{fa ? line.tierTitleFa : line.tierTitleEn}</p>
                <p className="mt-1 text-sm">{formatPrice(line.price, locale)}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(line.assetId, line.tierId)}
                className="self-start rounded-full p-2 text-foreground-secondary hover:text-error"
                aria-label={fa ? "حذف" : "Remove"}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        {subscription && lines.length > 0 && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              checked={useSubscription}
              onChange={(event) => {
                setUseSubscription(event.target.checked);
                void requestQuote({ useSub: event.target.checked });
              }}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{fa ? "استفاده از اشتراک دانلود" : "Use my download pass"}</span>
              <span className="mt-1 block text-caption text-foreground-secondary">
                {fa
                  ? `پلن فعال شما ${subscription.quota.remaining === null ? "دانلود نامحدود" : `${subscription.quota.remaining} دانلود باقی‌مانده`} دارد.`
                  : `Your active pass has ${subscription.quota.remaining === null ? "unlimited" : `${subscription.quota.remaining} downloads`} left.`}
              </span>
            </span>
          </label>
        )}

        <div className="mt-6 rounded-xl border border-border p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <BadgePercent className="h-4 w-4 text-accent" />
            {fa ? "کد تخفیف / کد معرف" : "Coupon / referral code"}
          </label>
          <div className="mt-3 flex gap-2">
            <Input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="RA-…"
              className="flex-1"
              dir="ltr"
            />
            <Button type="button" variant="outline" onClick={applyCoupon}>
              {fa ? "اعمال" : "Apply"}
            </Button>
          </div>
          {couponApplied && (
            <p className="mt-2 flex items-center gap-2 text-caption text-success">
              <Check className="h-3.5 w-3.5" /> {fa ? `کد ${couponApplied} اعمال شد.` : `Code ${couponApplied} applied.`}
            </p>
          )}
          {(couponError || quote?.couponError) && (
            <p className="mt-2 flex items-center gap-2 text-caption text-error">
              <AlertCircle className="h-3.5 w-3.5" />
              {(COUPON_ERRORS[couponError ?? quote?.couponError ?? "not_found"] ?? COUPON_ERRORS.not_found)[fa ? "fa" : "en"]}
            </p>
          )}
        </div>

        <form
          className="mt-6 space-y-4 rounded-xl border border-border p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void checkout(event.currentTarget);
          }}
        >
          <p className="font-medium">{fa ? "اطلاعات خریدار (برای صدور گواهی)" : "Buyer details (printed on the certificate)"}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={fa ? "نام و نام خانوادگی" : "Full name"}>
              <Input name="name" defaultValue={user?.name ?? ""} required />
            </Field>
            <Field label={fa ? "ایمیل" : "Email"}>
              <Input name="email" type="email" defaultValue={user?.email ?? ""} dir="ltr" required />
            </Field>
            <Field label={fa ? "تلفن (اختیاری)" : "Phone (optional)"}>
              <Input name="phone" dir="ltr" />
            </Field>
            <Field label={fa ? "شرکت (اختیاری)" : "Company (optional)"}>
              <Input name="company" />
            </Field>
          </div>

          {!user && (
            <p className="text-caption text-foreground-secondary">
              {fa ? "مهمان هم می‌توانید خرید کنید؛ لینک دانلود به ایمیل بالا ارسال می‌شود." : "Guest checkout works too — download links go to the e-mail above."}
            </p>
          )}

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4 text-accent" />
              {fa ? "درگاه پرداخت" : "Payment gateway"}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(gateways.length
                ? gateways
                : [
                    { id: "zarinpal" as const, label: { fa: "زرین‌پال", en: "Zarinpal" }, currencies: ["IRT" as const], configured: false, mode: "sandbox" },
                    { id: "stripe" as const, label: { fa: "Stripe", en: "Stripe" }, currencies: ["USD" as const], configured: false, mode: "sandbox" },
                  ]
              ).map((gateway) => (
                <button
                  key={gateway.id}
                  type="button"
                  onClick={() => setProvider(gateway.id)}
                  className={`rounded-xl border p-3 text-start text-sm transition ${
                    provider === gateway.id ? "border-accent bg-accent/5" : "border-border hover:border-foreground/40"
                  }`}
                >
                  <span className="block font-medium">{fa ? gateway.label.fa : gateway.label.en}</span>
                  <span className="mt-1 block text-caption text-foreground-secondary">
                    {gateway.currencies.join(" / ")} ·{" "}
                    {gateway.mode === "live"
                      ? fa
                        ? "اتصال واقعی"
                        : "live"
                      : fa
                        ? "حالت آزمایشی"
                        : "sandbox"}
                  </span>
                </button>
              ))}
            </div>
            {bestGateway?.mode === "sandbox" && (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-accent-soft p-3 text-caption text-accent">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {fa
                  ? "این درگاه در حالت آزمایشی است: پرداخت واقعی انجام نمی‌شود، اما کل مسیر (سفارش ← تأیید ← گواهی ← تحویل) دقیقاً مثل حالت واقعی اجرا می‌شود."
                  : "This gateway is in sandbox mode: no real charge, but the entire pipeline (order → verification → certificate → delivery) runs for real."}
              </p>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-2 rounded-lg bg-error/10 p-3 text-caption text-error">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}
          {quote?.errors?.length ? (
            <ul className="space-y-1 rounded-lg bg-warning/10 p-3 text-caption text-warning">
              {quote.errors.map((problem) => (
                <li key={`${problem.code}:${problem.assetId ?? ""}`}>{fa ? problem.message.fa : problem.message.en}</li>
              ))}
            </ul>
          ) : null}

          <button
            type="submit"
            disabled={busy || quoting || Boolean(quote && quote.lines.length === 0 && !planId)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {quote && !quote.payable
              ? fa
                ? "تکمیل خرید رایگان و تحویل فوری"
                : "Complete free order & deliver"
              : fa
                ? `پرداخت ${formatPrice(total, locale)}`
                : `Pay ${formatPrice(total, locale)}`}
          </button>
        </form>
      </div>

      <aside className="lg:col-span-5">
        <div className="sticky top-[calc(var(--header-h)+1rem)] space-y-3 rounded-2xl border border-border p-5">
          <p className="font-display text-h3">{fa ? "خلاصه سفارش" : "Order summary"}</p>

          <dl className="space-y-2 text-sm">
            <Row label={fa ? "جمع اقلام" : "Subtotal"} value={formatPrice(quote?.subtotal ?? subtotal, locale)} />
            {(quote?.discount.fa ?? 0) > 0 && (
              <Row label={fa ? "تخفیف" : "Discount"} value={`− ${formatPrice(quote!.discount, locale)}`} tone="success" />
            )}
            {(quote?.tax.fa ?? 0) > 0 && <Row label={fa ? "مالیات بر ارزش افزوده" : "VAT"} value={formatPrice(quote!.tax, locale)} />}
            <div className="border-t border-border pt-2">
              <Row label={fa ? "مبلغ قابل پرداخت" : "Total"} value={formatPrice(total, locale)} strong />
            </div>
          </dl>

          {quote?.charge && (
            <p className="text-caption text-foreground-secondary">
              {fa ? "مبلغ درگاه" : "Gateway amount"}:{" "}
              <span dir="ltr">
                {quote.charge.currency === "USD" ? `$${(quote.charge.amount / 100).toFixed(2)}` : `${quote.charge.amount.toLocaleString("en-US")} IRT`}
              </span>
            </p>
          )}

          {quoting && (
            <p className="flex items-center gap-2 text-caption text-foreground-secondary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {fa ? "به‌روزرسانی قیمت…" : "Re-pricing…"}
            </p>
          )}

          <ul className="mt-2 space-y-2 text-caption text-foreground-secondary">
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              {fa ? "لینک دانلود امضاشده و کوتاه‌عمر" : "Signed, short-lived download links"}
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-accent" />
              {fa ? "گواهی لایسنس PDF با QR راستی‌آزمایی" : "PDF license certificate with verification QR"}
            </li>
          </ul>

          {error === "empty_cart" && <p className="text-caption text-error">{fa ? "سبد خالی است." : "Cart is empty."}</p>}
          <button type="button" onClick={clear} className="flex items-center gap-1 text-caption text-foreground-secondary underline">
            <X className="h-3 w-3" />
            {fa ? "خالی کردن سبد" : "Clear cart"}
          </button>
          <Link href={href(locale, "/marketplace")} className="block text-caption text-accent underline">
            {dict.common.continueShopping}
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, value, tone, strong }: { label: string; value: string; tone?: "success"; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-medium" : "text-foreground-secondary"}>{label}</dt>
      <dd className={`${strong ? "font-display text-lg" : ""} ${tone === "success" ? "text-success" : ""}`}>{value}</dd>
    </div>
  );
}
