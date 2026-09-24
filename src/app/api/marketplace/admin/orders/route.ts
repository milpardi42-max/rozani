import { adminOrderDetail, adminOrders, adminOps } from "@/lib/marketplace/admin";
import { fail, json, readJson, requireAdmin } from "@/lib/marketplace/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** GET /api/marketplace/admin/orders?id=…&status=…&q=… */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const detail = await adminOrderDetail(id);
    if (!detail) return fail("not_found", 404);
    return json({ ok: true, ...detail });
  }

  const orders = await adminOrders({
    status: (url.searchParams.get("status") as never) ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 100),
  });

  return json({ ok: true, orders });
}

/**
 * POST /api/marketplace/admin/orders
 *
 * actions: fulfill | refund | set_status | deliver_again
 * `fulfill` is the escape hatch for a payment that completed while the callback
 * could not reach us (server restart, timeout) — it re-runs the same idempotent
 * fulfilment used by the gateway callback.
 */
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJson<{
    action?: "fulfill" | "refund" | "set_status" | "deliver_again";
    orderId?: string;
    status?: "pending_payment" | "paid" | "failed" | "canceled" | "refunded";
    note?: string;
  }>(request);

  if (!body?.orderId || !body.action) return fail("invalid_payload");

  switch (body.action) {
    case "fulfill": {
      const result = await adminOps.fulfillOrder(body.orderId, { provider: "wallet", reference: "admin" });
      if (!result.ok) return fail("not_payable", 409);
      return json({ ok: true, alreadyFulfilled: result.alreadyFulfilled, licenses: result.licenses, emails: result.emails });
    }
    case "refund": {
      const result = await adminOps.refundOrder(body.orderId, auth.user.email);
      if (!result.ok) return fail("not_refundable", 409);
      return json({ ok: true, revoked: result.licenses.length });
    }
    case "set_status": {
      if (!body.status) return fail("missing_status");
      const order = await adminOps.setOrderStatus(body.orderId, body.status, body.note);
      if (!order) return fail("not_found", 404);
      return json({ ok: true, order: { id: order.id, status: order.status } });
    }
    case "deliver_again": {
      const { getOrder } = await import("@/lib/marketplace/orders");
      const order = await getOrder(body.orderId);
      if (!order) return fail("not_found", 404);
      const { sendOrderDelivery } = await import("@/lib/marketplace/email");
      const licenses = (await import("@/lib/marketplace/orders")).getLicenses();
      const all = await licenses;
      const mine = all.filter((license) => license.orderId === order.id);
      const emails = await sendOrderDelivery({ order, licenses: mine });
      return json({ ok: true, emails });
    }
    default:
      return fail("unknown_action");
  }
}
