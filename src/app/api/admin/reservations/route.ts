import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllReservations } from "@/lib/data/reservations";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const reservations = await getAllReservations();
  reservations.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return NextResponse.json({ ok: true, reservations }, withNoStore());
}