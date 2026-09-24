import "server-only";
import { KEYS, mutateCollection, readCollection } from "../store";
import { signObjectToken, verifyObjectToken } from "../storage";
import type { ChargeAmount, PaymentProviderId, PaymentStatus } from "../types";

/**
 * Sandbox gateway ledger.
 *
 * When a provider has no live credentials configured, checkout uses *this*
 * gateway: it mints a signed authority, sends the buyer to a real confirm page,
 * records the outcome, and answers `verify()` exactly like the live REST API
 * does. Test purchases therefore run through the entire production code path —
 * order → payment → licence → certificate → royalty ledger → delivery e-mail.
 */

export const SANDBOX_PREFIX = "SND";

export interface SandboxTransaction {
  authority: string;
  provider: Exclude<PaymentProviderId, "wallet">;
  orderId: string;
  amount: ChargeAmount;
  status: "pending" | "paid" | "failed" | "canceled";
  cardMask?: string;
  refId?: string;
  /** Simulated bank/PSP name shown on the confirm page. */
  simulatedBank?: string;
  createdAt: string;
  decidedAt?: string;
}

/** Deterministic-ish fake card numbers so receipts look realistic. */
const FAKE_BANKS = [
  { name: "بانک ملت", mask: "6104-****-****-3312" },
  { name: "بانک سامان", mask: "6219-****-****-8841" },
  { name: "بانک پاسارگاد", mask: "5022-****-****-1097" },
  { name: "Bank Melli", mask: "6037-****-****-5520" },
  { name: "Bank Saderat", mask: "6037-****-****-7741" },
];

export function mintAuthority(provider: ChargeAmount["currency"], orderId: string, amount: ChargeAmount): string {
  const token = signObjectToken({
    k: `sandbox://${provider.toLowerCase()}/${orderId}`,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 6,
    lic: orderId,
    fn: String(amount.amount),
    src: `sandbox-${provider}`,
  });
  return `${SANDBOX_PREFIX}_${provider}_${token}`;
}

export function isSandboxAuthority(authority: string): boolean {
  return authority.startsWith(`${SANDBOX_PREFIX}_`);
}

export interface SandboxAuthorityInfo {
  provider: ChargeAmount["currency"];
  orderId: string;
  amount: number;
}

/**
 * Splits `SND_<CURRENCY>_<signed-token>` and verifies the signature.
 *
 * Only the first two separators are significant: the signed token is base64url,
 * so it legitimately contains `_` characters and must not be split on.
 */
export function parseSandboxAuthority(authority: string): SandboxAuthorityInfo | null {
  if (!isSandboxAuthority(authority)) return null;
  const rest = authority.slice(SANDBOX_PREFIX.length + 1);
  const separator = rest.indexOf("_");
  if (separator <= 0) return null;
  const payload = verifyObjectToken(rest.slice(separator + 1));
  if (!payload?.lic) return null;
  return {
    provider: rest.slice(0, separator) === "USD" ? "USD" : "IRT",
    orderId: payload.lic,
    amount: Number(payload.fn ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

export async function saveSandboxTransaction(transaction: SandboxTransaction): Promise<void> {
  await mutateCollection<SandboxTransaction, void>(KEYS.sandbox, (items) => {
    const index = items.findIndex((item) => item.authority === transaction.authority);
    if (index === -1) return { next: [...items, transaction], result: undefined };
    const copy = items.slice();
    copy[index] = transaction;
    return { next: copy, result: undefined };
  });
}

/**
 * Records the pending transaction the moment the gateway hands back an
 * authority — exactly what a real PSP does on its side. Without this the
 * confirm page would have nothing to show and verification would have no
 * amount to compare against.
 */
export async function createSandboxTransaction(input: {
  authority: string;
  provider: Exclude<PaymentProviderId, "wallet">;
  orderId: string;
  amount: ChargeAmount;
}): Promise<SandboxTransaction> {
  const transaction: SandboxTransaction = {
    authority: input.authority,
    provider: input.provider,
    orderId: input.orderId,
    amount: input.amount,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await saveSandboxTransaction(transaction);
  return transaction;
}

export async function getSandboxTransaction(authority: string): Promise<SandboxTransaction | null> {
  const items = await readCollection<SandboxTransaction>(KEYS.sandbox);
  return items.find((item) => item.authority === authority) ?? null;
}

export async function listSandboxTransactions(limit = 50): Promise<SandboxTransaction[]> {
  const items = await readCollection<SandboxTransaction>(KEYS.sandbox);
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}

/** Called by the confirm page — this is the "bank" answering. */
export async function decideSandboxTransaction(
  authority: string,
  outcome: "paid" | "failed" | "canceled",
  options: { locale?: "fa" | "en" } = {},
): Promise<SandboxTransaction | null> {
  const transaction = await getSandboxTransaction(authority);
  if (!transaction || transaction.status !== "pending") return transaction;
  const bank = FAKE_BANKS[Math.floor(Math.random() * FAKE_BANKS.length)];
  const updated: SandboxTransaction = {
    ...transaction,
    status: outcome,
    decidedAt: new Date().toISOString(),
    ...(outcome === "paid"
      ? {
          cardMask: bank.mask,
          simulatedBank: options.locale === "en" ? bank.name.replace("بانک ", "") : bank.name,
          refId: String(Math.floor(10_000_000 + Math.random() * 89_999_999)),
        }
      : {}),
  };
  await saveSandboxTransaction(updated);
  return updated;
}

export function sandboxStatusToPaymentStatus(status: SandboxTransaction["status"]): PaymentStatus {
  switch (status) {
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "canceled":
      return "canceled";
    default:
      return "created";
  }
}
