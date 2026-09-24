import { NextResponse } from "next/server";
import { createOrder, getOrdersByUser, getOrdersByEmail } from "@/lib/data/orders";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import type { OrderLine } from "@/lib/data/orders";

export const dynamic = "force-dynamic";

/** POST /api/orders — place a new order */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    postal?: string;
    lines?: OrderLine[];
  } | null;

  if (!body?.name || !body?.email || !body?.lines?.length) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }

  const session = await getSession();
  const total = body.lines.reduce(
    (acc, l) => ({ fa: acc.fa + l.price.fa * l.qty, en: acc.en + l.price.en * l.qty }),
    { fa: 0, en: 0 },
  );

  try {
    const order = await createOrder({
      userId: session?.id,
      name: body.name,
      email: body.email,
      phone: body.phone ?? "",
      address: body.address ?? "",
      city: body.city ?? "",
      postal: body.postal ?? "",
      lines: body.lines,
      total,
    });
    return NextResponse.json({ ok: true, orderId: order.id }, withNoStore());
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, withNoStore({ status: 500 }));
  }
}

/** GET /api/orders — fetch orders for the logged-in user */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }

  const orders =
    session.role === "admin"
      ? (await import("@/lib/data/orders")).getAllOrders()
      : session.id
        ? getOrdersByUser(session.id)
        : getOrdersByEmail(session.email);

  return NextResponse.json({ ok: true, orders: await orders }, withNoStore());
}
