import "server-only";
import { listSandboxTransactions } from "./sandbox";
import { fulfillOrder, getOrder, setOrderStatus } from "../orders";
import { recordEvent } from "../analytics";

/**
 * Reconciliation for the sandbox gateway.
 *
 * A buyer can close the tab between the "pay" click and the redirect, leaving a
 * transaction marked `paid` on the order still `pending_payment`. Real PSPs solve
 * this with a settlement job; we do the same here, so testing never gets stuck.
 *
 * Called from the admin console ("پاک‌سازی/تسویه تراکنش‌های آزمایشی") — it is
 * deliberately idempotent and safe to run at any time.
 */
export interface SweepResult {
  checked: number;
  paid: number;
  failed: number;
  fulfilled: number;
  alreadyComplete: number;
  orders: { orderId: string; outcome: string }[];
}

export async function sweepSandboxTransactions(limit = 50): Promise<SweepResult> {
  const transactions = (await listSandboxTransactions(limit)).filter((transaction) => transaction.status !== "pending");
  const result: SweepResult = { checked: transactions.length, paid: 0, failed: 0, fulfilled: 0, alreadyComplete: 0, orders: [] };

  for (const transaction of transactions) {
    const order = await getOrder(transaction.orderId);
    if (!order) {
      result.orders.push({ orderId: transaction.orderId, outcome: "order_missing" });
      continue;
    }

    if (transaction.status === "paid") {
      result.paid += 1;
      if (order.status === "paid" && order.fulfillment.completedAt) {
        result.alreadyComplete += 1;
        result.orders.push({ orderId: order.id, outcome: "already_complete" });
        continue;
      }
      await setOrderStatus(order.id, "paid");
      const fulfillment = await fulfillOrder(order.id, { provider: transaction.provider as never, reference: transaction.authority });
      if (fulfillment.ok) {
        result.fulfilled += 1;
        void recordEvent({ kind: "purchase", userId: order.userId, value: order.total, meta: { orderId: order.id, source: "sandbox_sweep" } });
        result.orders.push({ orderId: order.id, outcome: `fulfilled:${fulfillment.licenses.length}` });
      } else {
        result.orders.push({ orderId: order.id, outcome: "fulfill_failed" });
      }
    } else {
      result.failed += 1;
      if (order.status === "pending_payment" || order.status === "paid") continue;
      await setOrderStatus(order.id, "failed", `sandbox_${transaction.status}`);
      result.orders.push({ orderId: order.id, outcome: `marked_${transaction.status}` });
    }
  }

  return result;
}
