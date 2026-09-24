import { getArtistAnalytics } from "@/lib/marketplace/analytics";
import { artistWalletDetails } from "@/lib/marketplace/payouts";
import { fail, json, requireArtistOrAdmin, numberParam } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/artist/analytics?days=30&assetId=…
 *
 * Sales dashboard feed: totals, the daily series, best sellers, the license-mix,
 * buyer countries, gateway split and the referral performance of the artist's own
 * affiliate codes.
 */
export async function GET(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;
  if (!auth.user.artistId) return fail("not_an_artist", 403);

  const url = new URL(request.url);
  const days = numberParam(url, "days", 30);
  const assetId = url.searchParams.get("assetId") ?? undefined;

  const [analytics, wallet] = await Promise.all([
    getArtistAnalytics({ artistId: auth.user.artistId, days, assetId }),
    artistWalletDetails(auth.user.artistId),
  ]);

  return json({
    ok: true,
    analytics,
    wallet: {
      balance: wallet.balance,
      minimum: wallet.minimum,
      licenseCount: wallet.licenses,
    },
  });
}
