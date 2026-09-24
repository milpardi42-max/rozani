import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";

/**
 * The session probe. It must always reach the origin: a cached `{ user: null }` replayed from an
 * edge/browser cache lands *after* login() set the session and silently logs the admin back out.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json({ user: await getSession() }, withNoStore());
}
