import { adminDashboard, adminOrders, adminStatus, getReviewQueue, updateSettings } from "@/lib/marketplace/admin";
import { payoutOverview } from "@/lib/marketplace/payouts";
import { getOutbox, retryMessage } from "@/lib/marketplace/email";
import { getReferralStats } from "@/lib/marketplace/analytics";
import { listSandboxTransactions } from "@/lib/marketplace/payments/sandbox";
import { sweepSandboxTransactions } from "@/lib/marketplace/payments/sandbox-sweeper";
import { fail, json, readJson, requireAdmin } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/admin?view=dashboard|status|orders|payouts|outbox|referrals|sandbox
 *
 * Single read endpoint for the admin marketplace console — the panel chooses the
 * view, the server returns exactly that slice (nothing else is shipped).
 */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const view = url.searchParams.get("view") ?? "dashboard";
  const days = Number(url.searchParams.get("days") ?? 30);

  switch (view) {
    case "dashboard":
      return json({ ok: true, ...(await adminDashboard(days)) });
    case "status":
      return json({ ok: true, status: await adminStatus() });
    case "queue": {
      const queue = await getReviewQueue();
      return json({ ok: true, count: queue.length, items: queue.slice(0, 50).map((item) => ({ ...item })) });
    }
    case "orders":
      return json({
        ok: true,
        orders: await adminOrders({
          status: (url.searchParams.get("status") as never) ?? undefined,
          search: url.searchParams.get("q") ?? undefined,
          limit: Number(url.searchParams.get("limit") ?? 50),
        }),
      });
    case "payouts":
      return json({ ok: true, ...(await payoutOverview()) });
    case "outbox":
      return json({ ok: true, messages: await getOutbox(Number(url.searchParams.get("limit") ?? 60)) });
    case "referrals":
      return json({ ok: true, referrals: await getReferralStats() });
    case "sandbox":
      return json({ ok: true, transactions: await listSandboxTransactions(Number(url.searchParams.get("limit") ?? 40)) });
    default:
      return fail("unknown_view");
  }
}

/**
 * POST /api/marketplace/admin
 *
 * settings  → platform knobs (VAT, artist share, affiliate percent, payout floor)
 * retry-mail → re-send one queued e-mail from the outbox
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJson<{
    action?: "settings" | "retry_mail" | "sweep_sandbox";
    settings?: {
      vatPct?: number;
      artistSharePct?: number;
      affiliatePct?: number;
      affiliateDiscountPct?: number;
      payoutMinimumFa?: number;
      payoutMinimumEn?: number;
      autoApproveSeamless?: boolean;
      emailOnSale?: boolean;
    };
    messageId?: string;
  }>(request);

  if (body?.action === "settings") {
    const patch = body.settings ?? {};
    const settings = await updateSettings({
      ...(patch.vatPct !== undefined ? { vatPct: clamp(patch.vatPct, 0, 30) } : {}),
      ...(patch.artistSharePct !== undefined ? { artistSharePct: clamp(patch.artistSharePct, 0, 90) } : {}),
      ...(patch.affiliatePct !== undefined ? { affiliatePct: clamp(patch.affiliatePct, 0, 50) } : {}),
      ...(patch.affiliateDiscountPct !== undefined ? { affiliateDiscountPct: clamp(patch.affiliateDiscountPct, 0, 80) } : {}),
      ...(patch.payoutMinimumFa !== undefined ? { payoutMinimumFa: Math.max(0, patch.payoutMinimumFa) } : {}),
      ...(patch.payoutMinimumEn !== undefined ? { payoutMinimumEn: Math.max(0, patch.payoutMinimumEn) } : {}),
      ...(patch.autoApproveSeamless !== undefined ? { autoApproveSeamless: patch.autoApproveSeamless } : {}),
      ...(patch.emailOnSale !== undefined ? { emailOnSale: patch.emailOnSale } : {}),
    });
    return json({ ok: true, settings });
  }

  if (body?.action === "sweep_sandbox") {
    // Settles sandbox payments whose browser never returned to the callback.
    const result = await sweepSandboxTransactions(50);
    return json({ ok: true, sweep: result });
  }

  if (body?.action === "retry_mail") {
    if (!body.messageId) return fail("missing_message_id");
    const message = await retryMessage(body.messageId);
    if (!message) return fail("not_found", 404);
    return json({ ok: true, message });
  }

  return fail("unknown_action");
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}
