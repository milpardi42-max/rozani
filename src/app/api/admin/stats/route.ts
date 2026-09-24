import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllOrders } from "@/lib/data/orders";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }

  const orders = await getAllOrders();
  const now = new Date();

  /* آمار ۷ روز گذشته — یک نقطه به ازای هر روز */
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  const dailyRevenue = days.map((day) => {
    const dayOrders = orders.filter((o) => o.createdAt.startsWith(day));
    return {
      date: day,
      revenue: dayOrders.reduce((s, o) => s + o.total.fa, 0),
      count: dayOrders.length,
    };
  });

  /* وضعیت سفارشات */
  const statusCount = {
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  /* ۸ سفارش آخر */
  const recent = orders
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  /* جمع کل درآمد */
  const totalRevenue = orders.reduce((s, o) => s + o.total.fa, 0);
  const todayRevenue = orders
    .filter((o) => o.createdAt.startsWith(now.toISOString().slice(0, 10)))
    .reduce((s, o) => s + o.total.fa, 0);

  return NextResponse.json(
    {
      ok: true,
      stats: {
        totalOrders: orders.length,
        pendingOrders: statusCount.pending,
        totalRevenue,
        todayRevenue,
        statusCount,
      },
      dailyRevenue,
      recentOrders: recent,
    },
    withNoStore(),
  );
}
