import { providerAvailability } from "@/lib/marketplace/payments";
import { json } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/payments/providers
 *
 * Which gateways this deployment can actually use, and whether each is live or in
 * sandbox mode. The checkout UI uses it to label the buttons honestly — buyers are
 * never told a test gateway is real.
 */
export async function GET() {
  return json({ ok: true, providers: providerAvailability() });
}
