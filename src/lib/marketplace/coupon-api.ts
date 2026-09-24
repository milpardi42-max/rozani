import "server-only";
import { quote } from "./orders";
import type { PaymentProviderId, PricePair } from "./types";
import type { Localized } from "@/lib/i18n/types";

/**
 * Thin helper so the public coupon endpoint and the checkout share one pricing
 * path. A coupon is validated by running a real quote — the discount returned to
 * the browser is therefore exactly the discount the order will get.
 */

export interface CouponCheckInput {
  code: string;
  items: { assetId: string; tierId: string }[];
  planId?: string | null;
  provider: PaymentProviderId;
  userId?: string | null;
}

export interface CouponCheckResult {
  ok: boolean;
  valid: boolean;
  code: string;
  discount?: PricePair;
  total?: PricePair;
  isAffiliate?: boolean;
  affiliatePct?: number;
  reason?: string;
  message?: Localized;
}

const REASONS: Record<string, Localized> = {
  not_found: { fa: "این کد تخفیف وجود ندارد.", en: "Coupon code not found." },
  inactive: { fa: "این کد فعال نیست.", en: "This coupon is not active." },
  expired: { fa: "این کد منقضی شده است.", en: "This coupon has expired." },
  limit_reached: { fa: "ظرفیت استفاده از این کد تکمیل شده است.", en: "This coupon has reached its limit." },
  min_subtotal: { fa: "حداقل مبلغ سفارش برای این کد رعایت نشده است.", en: "Cart total is below the coupon minimum." },
  not_applicable: { fa: "این کد برای آثار انتخابی معتبر نیست.", en: "This coupon does not apply to the selected works." },
  international_only: { fa: "این کد فقط برای پرداخت بین‌المللی است.", en: "This coupon is for international payments only." },
};

export async function evalCouponPublic(input: CouponCheckInput): Promise<CouponCheckResult> {
  if (!input.items.length && !input.planId) {
    return { ok: false, valid: false, code: input.code, reason: "empty_cart", message: { fa: "سبد خرید خالی است.", en: "Cart is empty." } };
  }

  const priced = await quote({
    lines: input.items,
    planId: input.planId ?? null,
    couponCode: input.code,
    provider: input.provider,
    userId: input.userId,
  });

  if (priced.couponError || !priced.coupon) {
    const reason = priced.couponError ?? "not_found";
    return {
      ok: true,
      valid: false,
      code: input.code,
      reason,
      message: REASONS[reason] ?? REASONS.not_found,
    };
  }

  return {
    ok: true,
    valid: true,
    code: priced.coupon.code,
    discount: priced.discount,
    total: priced.total,
    isAffiliate: Boolean(priced.coupon.affiliateUserId),
    affiliatePct: priced.coupon.affiliatePct,
    message: { fa: "کد تخفیف اعمال شد.", en: "Coupon applied." },
  };
}
