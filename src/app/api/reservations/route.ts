import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserReservations } from "@/lib/data/reservations";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const reservations = await getUserReservations(session.id, session.email);
  return NextResponse.json({ ok: true, reservations }, withNoStore());
}