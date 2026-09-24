import "server-only";
import { zarinpalMerchantId } from "../config";
import {
  createSandboxTransaction,
  decideSandboxTransaction,
  getSandboxTransaction,
  isSandboxAuthority,
  mintAuthority,
  parseSandboxAuthority,
  sandboxStatusToPaymentStatus,
} from "./sandbox";
import type {
  PaymentInitInput,
  PaymentInitResult,
  PaymentProvider,
  PaymentVerifyInput,
  PaymentVerifyResult,
} from "./types";

/**
 * زرین‌پال — درگاه پرداخت ایرانی
 *
 *   LIVE   `ZARINPAL_MERCHANT_ID` set → REST v4:
 *            request.json → StartPay/{authority} → verify.json (code 100/101)
 *          Amounts are converted to Rial, exactly as the API expects.
 *
 *   SANDBOX  no merchant id → drop-in gateway with the same three steps
 *          (authority → StartPay → verify, same code semantics), so test
 *          purchases run through the real fulfilment pipeline.
 */

const LIVE_BASE = process.env.ZARINPAL_BASE_URL?.trim() || "https://payment.zarinpal.com/pg";
/** Where the buyer is sent when this deployment has no live merchant id. */
const sandboxPath = (locale: "fa" | "en") => `/${locale}/checkout/sandbox`;

interface ZarinpalEnvelope<T> {
  data: T | null;
  errors: unknown;
}

function errorMessage(errors: unknown): string | undefined {
  if (!errors) return undefined;
  if (Array.isArray(errors)) {
    const first = errors[0];
    if (first && typeof first === "object" && "message" in first) return String((first as { message?: unknown }).message);
    return undefined;
  }
  if (typeof errors === "object" && "message" in errors) return String((errors as { message?: unknown }).message);
  return undefined;
}

const toRial = (toman: number) => Math.round(toman * 10);

export const zarinpalProvider: PaymentProvider = {
  id: "zarinpal",
  label: { fa: "زرین‌پال", en: "Zarinpal" },
  currencies: ["IRT"],

  configured: () => Boolean(zarinpalMerchantId()),
  mode: () => (zarinpalMerchantId() ? "live" : "sandbox"),

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const merchantId = zarinpalMerchantId();

    if (!merchantId) {
      const authority = mintAuthority("IRT", input.order.id, input.charge);
      await createSandboxTransaction({ authority, provider: "zarinpal", orderId: input.order.id, amount: input.charge });
      const redirectUrl = `${sandboxPath(input.locale)}?authority=${encodeURIComponent(authority)}`;
      return { ok: true, reference: authority, redirectUrl, sandbox: true };
    }

    try {
      const response = await fetch(`${LIVE_BASE}/v4/payment/request.json`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: toRial(input.charge.amount),
          callback_url: input.callbackUrl,
          description: input.description,
          metadata: { email: input.email ?? "", mobile: input.mobile ?? "" },
        }),
        cache: "no-store",
      });
      const payload = (await response.json()) as ZarinpalEnvelope<{ authority: string; code: number; fee: number }>;
      const code = payload.data?.code;
      const authority = payload.data?.authority;

      if (!authority || (code !== 100 && code !== 101)) {
        return {
          ok: false,
          reference: "",
          sandbox: false,
          error: `zarinpal_request_failed:${code ?? errorMessage(payload.errors) ?? "unknown"}`,
          raw: payload as unknown as Record<string, unknown>,
        };
      }

      return {
        ok: true,
        reference: authority,
        redirectUrl: `${LIVE_BASE}/StartPay/${authority}`,
        sandbox: false,
        raw: payload as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return { ok: false, reference: "", sandbox: false, error: `zarinpal_network:${String(error)}` };
    }
  },

  async verify(input: PaymentVerifyInput): Promise<PaymentVerifyResult> {
    /* ---------- sandbox ---------- */
    if (isSandboxAuthority(input.reference)) {
      const info = parseSandboxAuthority(input.reference);
      const transaction = await getSandboxTransaction(input.reference);
      if (!transaction) {
        return { ok: false, status: "failed", reference: input.reference, sandbox: true, error: "sandbox_not_found" };
      }
      if (info && info.amount !== input.charge.amount) {
        return { ok: false, status: "failed", reference: input.reference, sandbox: true, error: "amount_mismatch" };
      }
      const status = sandboxStatusToPaymentStatus(transaction.status);
      return {
        ok: status === "paid",
        status,
        reference: input.reference,
        refId: transaction.refId,
        cardMask: transaction.cardMask,
        amount: transaction.amount,
        sandbox: true,
        raw: { simulatedBank: transaction.simulatedBank },
      };
    }

    /* ---------- live ---------- */
    const merchantId = zarinpalMerchantId();
    if (!merchantId) {
      return { ok: false, status: "failed", reference: input.reference, sandbox: true, error: "merchant_not_configured" };
    }

    try {
      const response = await fetch(`${LIVE_BASE}/v4/payment/verify.json`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ merchant_id: merchantId, amount: toRial(input.charge.amount), authority: input.reference }),
        cache: "no-store",
      });
      const payload = (await response.json()) as ZarinpalEnvelope<{
        code: number;
        ref_id: number;
        card_pan: string;
        card_hash: string;
      }>;
      const code = payload.data?.code;
      if (code === 100 || code === 101) {
        return {
          ok: true,
          status: "paid",
          reference: input.reference,
          refId: payload.data?.ref_id ? String(payload.data.ref_id) : undefined,
          cardMask: payload.data?.card_pan,
          amount: input.charge,
          sandbox: false,
          raw: payload as unknown as Record<string, unknown>,
        };
      }
      return {
        ok: false,
        status: "failed",
        reference: input.reference,
        sandbox: false,
        error: `zarinpal_verify_failed:${code ?? errorMessage(payload.errors) ?? "unknown"}`,
        raw: payload as unknown as Record<string, unknown>,
      };
    } catch (error) {
      return { ok: false, status: "failed", reference: input.reference, sandbox: false, error: `zarinpal_network:${String(error)}` };
    }
  },
};

/** Used by the sandbox checkout page to render the "bank". */
export async function sandboxDecision(authority: string, outcome: "paid" | "failed" | "canceled", locale: "fa" | "en") {
  return decideSandboxTransaction(authority, outcome, { locale });
}

export { isSandboxAuthority };
