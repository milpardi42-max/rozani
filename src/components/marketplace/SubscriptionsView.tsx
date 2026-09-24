"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Loader2, Sparkles } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { SESSION_FETCH } from "@/lib/http";
import type { PricePair } from "@/lib/marketplace/types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Download passes.
 *
 * A pass is bought like any other order (so the sandbox gateway works here too)
 * and then redeemed from an asset page or the checkout screen — each redemption
 * burns one download from the monthly quota and issues a real license.
 */

interface Plan {
  id: string;
  title: Localized;
  description: Localized;
  price: PricePair;
  downloadsPerMonth: number;
  covers: string[];
  excludesExclusive: boolean;
  features: Localized[];
  featured: boolean;
}

interface ActivePass {
  id: string;
  planId: string;
  planTitle: Localized;
  status: string;
  currentPeriodEnd: string;
  downloadsUsed: number;
  quota: { used: number; limit: number; remaining: number | null; unlimited: boolean };
}

export function SubscriptionsView() {
  const { locale } = useLocale();
  const router = useRouter();
  const fa = locale === "fa";
  const [plans, setPlans] = useState<Plan[]>([]);
  const [pass, setPass] = useState<ActivePass | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/marketplace/subscriptions", SESSION_FETCH);
      const data = (await response.json()) as { plans?: Plan[]; subscription?: ActivePass | null };
      setPlans(data.plans ?? []);
      setPass(data.subscription ?? null);
    })();
  }, []);

  async function subscribe(planId: string) {
    setBusy(planId);
    try {
      // The pass is a normal order, so the whole payment + delivery pipeline applies.
      const response = await fetch("/api/marketplace/checkout", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [],
          planId,
          provider: fa ? "zarinpal" : "stripe",
          locale,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        mode?: string;
        order?: { id: string };
        payment?: { redirectUrl: string };
      };

      if (!data.ok) {
        setNotice(
          data.error === "invalid_email"
            ? fa
              ? "برای خرید اشتراک باید وارد حساب خود شوید."
              : "Sign in to buy a pass."
            : data.error ?? "checkout_failed",
        );
        return;
      }
      if (data.mode === "free") {
        router.push(`/${locale}/checkout/return?order=${data.order?.id}&status=paid`);
        return;
      }
      if (data.payment?.redirectUrl) window.location.href = data.payment.redirectUrl;
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      const response = await fetch("/api/marketplace/subscriptions", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = (await response.json()) as { ok?: boolean };
      setNotice(data.ok ? (fa ? "اشتراک لغو شد." : "Pass cancelled.") : fa ? "لغو نشد." : "Could not cancel.");
      setPass(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {pass && (
        <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6">
          <p className="flex items-center gap-2 font-medium">
            <Crown className="h-4 w-4 text-accent" />
            {fa ? `اشتراک فعال: ${pass.planTitle.fa}` : `Active pass: ${pass.planTitle.en}`}
          </p>
          <p className="mt-2 text-caption text-foreground-secondary">
            {fa
              ? `دوره تا ${new Date(pass.currentPeriodEnd).toLocaleDateString("fa-IR")} · استفاده‌شده ${
                  pass.quota.unlimited ? "نامحدود" : `${pass.quota.used} از ${pass.quota.limit}`
                }`
              : `Renews until ${new Date(pass.currentPeriodEnd).toDateString()} · used ${
                  pass.quota.unlimited ? "unlimited" : `${pass.quota.used} of ${pass.quota.limit}`
                }`}
          </p>
          <button type="button" onClick={cancel} disabled={busy === "cancel"} className="mt-3 rounded-full border border-border px-4 py-2 text-caption">
            {fa ? "لغو اشتراک" : "Cancel pass"}
          </button>
        </div>
      )}

      {notice && <p className="rounded-xl bg-warning/10 p-3 text-caption text-warning">{notice}</p>}

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-2xl border p-6 ${plan.featured ? "border-accent shadow-sm" : "border-border"}`}
          >
            {plan.featured && (
              <Badge tone="accent" className="self-start">
                <Sparkles className="me-1 h-3 w-3" />
                {fa ? "پیشنهاد ما" : "Recommended"}
              </Badge>
            )}
            <h2 className="mt-3 font-display text-h3">{fa ? plan.title.fa : plan.title.en}</h2>
            <p className="mt-2 font-display text-2xl">
              {formatPrice(plan.price, locale)}
              <span className="text-caption text-foreground-secondary"> /{fa ? "ماه" : "mo"}</span>
            </p>
            <p className="mt-2 text-caption leading-relaxed text-foreground-secondary">{fa ? plan.description.fa : plan.description.en}</p>

            <ul className="mt-4 flex-1 space-y-2 text-caption">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-success" />
                {plan.downloadsPerMonth === 0
                  ? fa
                    ? "دانلود نامحدود"
                    : "Unlimited downloads"
                  : fa
                    ? `${plan.downloadsPerMonth} دانلود در ماه`
                    : `${plan.downloadsPerMonth} downloads / month`}
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-success" />
                {fa ? "لایسنس: " : "Licenses: "}
                {plan.covers.join(" · ")}
              </li>
              {plan.excludesExclusive && (
                <li className="flex items-center gap-2 text-foreground-secondary">
                  <Crown className="h-3.5 w-3.5" />
                  {fa ? "آثار انحصاری مستثنا هستند" : "Exclusive works excluded"}
                </li>
              )}
              {(plan.features ?? []).slice(0, 4).map((feature) => (
                <li key={feature.en} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success" />
                  {fa ? feature.fa : feature.en}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => subscribe(plan.id)}
              disabled={busy === plan.id || pass?.planId === plan.id}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-60"
            >
              {busy === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {pass?.planId === plan.id ? (fa ? "اشتراک فعال شما" : "Your active pass") : fa ? "خرید اشتراک" : "Buy pass"}
            </button>
          </div>
        ))}
      </div>

      <p className="text-caption leading-relaxed text-foreground-secondary">
        {fa
          ? "اشتراک ماهانه حقوق لایسنس شخصی/تجاری را پوشش می‌دهد و جایگزین خرید لایسنس گسترده یا انحصاری نیست. با هر دانلود، یک لایسنس واقعی با گواهی PDF صادر می‌شود."
          : "A monthly pass covers personal/commercial licenses; it does not replace extended or exclusive purchases. Every download still issues a real license with a PDF certificate."}
      </p>
    </div>
  );
}
