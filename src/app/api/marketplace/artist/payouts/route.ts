import { artistWalletDetails, requestPayout, savePayoutProfile } from "@/lib/marketplace/payouts";
import { sendPayoutNotice } from "@/lib/marketplace/email";
import { fail, json, readJson, requireArtistOrAdmin } from "@/lib/marketplace/guard";
import type { PayoutProfile } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

/** GET /api/marketplace/artist/payouts — wallet, ledger, requests, profile. */
export async function GET() {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;
  if (!auth.user.artistId) return fail("not_an_artist", 403);

  const wallet = await artistWalletDetails(auth.user.artistId);
  return json({
    ok: true,
    wallet: {
      balance: wallet.balance,
      minimum: wallet.minimum,
      licenses: wallet.licenses,
      monthly: wallet.monthly.map((row) => ({ month: row.month, amount: row.amount })),
      profile: wallet.profile,
      payouts: wallet.payouts,
      ledger: wallet.ledger,
    },
  });
}

/**
 * POST /api/marketplace/artist/payouts
 *
 * `action: "profile"` saves the destination account (IBAN / card / PayPal),
 * `action: "request"` opens a settlement request against the available balance.
 */
export async function POST(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;
  if (!auth.user.artistId) return fail("not_an_artist", 403);

  const body = await readJson<{
    action?: "profile" | "request";
    method?: PayoutProfile["method"];
    iban?: string;
    cardNumber?: string;
    paypalEmail?: string;
    accountHolder?: string;
    bankName?: string;
    taxId?: string;
    /** Alias of `taxId` — matches the field name inside `PayoutProfile`. */
    nationalId?: string;
    amountFa?: number;
    amountEn?: number;
    note?: string;
  }>(request);

  if (body?.action === "profile") {
    const method = (body.method ?? "iban") as PayoutProfile["method"];
    const destination = method === "iban" ? body.iban : method === "card" ? body.cardNumber : body.paypalEmail;
    if (!destination || destination.trim().length < 6) return fail("invalid_destination");

    const profile = await savePayoutProfile({
      artistId: auth.user.artistId,
      holder: body.accountHolder?.trim() || auth.user.name,
      method,
      iban: body.iban?.replace(/\s+/g, "").toUpperCase(),
      cardNumber: body.cardNumber?.replace(/\s+/g, ""),
      paypalEmail: body.paypalEmail?.trim(),
      nationalId: (body.taxId ?? body.nationalId)?.trim(),
      bankName: body.bankName?.trim(),
    });
    return json({ ok: true, profile });
  }

  const result = await requestPayout({
    artistId: auth.user.artistId,
    userId: auth.user.id,
    amount:
      body?.amountFa !== undefined || body?.amountEn !== undefined
        ? { fa: body?.amountFa ?? 0, en: body?.amountEn ?? 0 }
        : undefined,
    note: body?.note,
  });

  if (!result.ok) return fail(result.error ?? "request_failed", 409, { available: result.available });

  if (result.payout) {
    await sendPayoutNotice({
      payout: result.payout,
      to: auth.user.email,
      artistName: auth.user.name,
      locale: "fa",
    }).catch(() => undefined);
  }

  return json({ ok: true, payout: result.payout });
}
