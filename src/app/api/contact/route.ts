import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, string> | null;
  if (!body?.email || !body?.name) return NextResponse.json({ ok: false }, { status: 400 });
  // Integration point: forward to CRM / email.
  return NextResponse.json({ ok: true, id: `REQ-${Date.now().toString(36).toUpperCase()}` });
}
