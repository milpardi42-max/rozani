import { decidePayout, listPayouts, payoutOverview, getPayoutProfile } from "@/lib/marketplace/payouts";
import { sendPayoutNotice } from "@/lib/marketplace/email";
import { fail, json, readJson, requireAdmin } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";

/** GET /api/marketplace/admin/payouts — overview + requests (optionally ?artistId=). */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const artistId = url.searchParams.get("artistId") ?? undefined;

  if (artistId) {
    const [payouts, profile] = await Promise.all([listPayouts({ artistId }), getPayoutProfile(artistId)]);
    return json({ ok: true, payouts, profile });
  }

  const overview = await payoutOverview();
  return json({ ok: true, ...overview });
}

/**
 * POST /api/marketplace/admin/payouts
 *
 * actions: approve | reject | paid
 * Marking a payout as paid writes the matching ledger entry, so the artist's
 * balance stays explainable purely from the ledger.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJson<{
    action?: "approve" | "reject" | "paid";
    payoutId?: string;
    reference?: string;
    note?: string;
  }>(request);

  if (!body?.payoutId || !body.action) return fail("invalid_payload");

  const status = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "paid";
  const payout = await decidePayout({
    id: body.payoutId,
    status,
    decidedBy: auth.user.email,
    reference: body.reference,
    note: body.note,
  });
  if (!payout) return fail("not_found", 404);

  const profile = await getPayoutProfile(payout.artistId);
  if (profile) {
    const { findUserById } = await import("@/lib/data/users");
    const { getAssets } = await import("@/lib/marketplace/assets");
    const assets = await getAssets();
    const owner = assets.find((asset) => asset.artistId === payout.artistId)?.ownerUserId ?? null;
    const user = owner ? await findUserById(owner).catch(() => null) : null;
    if (user?.email) {
      await sendPayoutNotice({
        payout,
        to: user.email,
        artistName: user.name,
        locale: "fa",
      }).catch(() => undefined);
    }
  }

  return json({ ok: true, payout });
}
