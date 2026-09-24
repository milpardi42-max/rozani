import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAllUsers, toPublicUser, updateUser, saveAllUsers, createUser } from "@/lib/data/users";
import { withNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}

/** GET /api/admin/users — list all users (without passwordHash) */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const users = await getAllUsers();
  return NextResponse.json({ ok: true, users: users.map(toPublicUser) }, withNoStore());
}

/** PATCH /api/admin/users — update role */
export async function PATCH(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const body = (await req.json().catch(() => null)) as { id?: string; role?: string } | null;
  if (!body?.id || !body?.role) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  if (!["user", "artist"].includes(body.role)) {
    return NextResponse.json({ ok: false, error: "invalid_role" }, withNoStore({ status: 400 }));
  }
  const updated = await updateUser(body.id, { role: body.role as "user" | "artist" });
  if (!updated) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }
  return NextResponse.json({ ok: true, user: toPublicUser(updated) }, withNoStore());
}

/** DELETE /api/admin/users — delete a user by id */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  const users = await getAllUsers();
  const filtered = users.filter((u) => u.id !== body.id);
  if (filtered.length === users.length) {
    return NextResponse.json({ ok: false, error: "not_found" }, withNoStore({ status: 404 }));
  }
  await saveAllUsers(filtered);
  return NextResponse.json({ ok: true }, withNoStore());
}

/** POST /api/admin/users — create a new user (admin only) */
export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
  }
  const body = (await req.json().catch(() => null)) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  } | null;

  if (!body?.name || !body?.email || !body?.password) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, withNoStore({ status: 400 }));
  }
  if (body.password.length < 6) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, withNoStore({ status: 400 }));
  }

  const role = body.role === "artist" ? "artist" : "user";

  try {
    const stored = await createUser(body.name, body.email, body.password, role);
    return NextResponse.json({ ok: true, user: toPublicUser(stored) }, withNoStore());
  } catch (e) {
    if (e instanceof Error && e.message === "email_taken") {
      return NextResponse.json({ ok: false, error: "email_taken" }, withNoStore({ status: 409 }));
    }
    return NextResponse.json({ ok: false, error: "server_error" }, withNoStore({ status: 500 }));
  }
}
