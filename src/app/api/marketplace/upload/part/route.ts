import crypto from "crypto";
import { NextResponse } from "next/server";
import { getOpenUploadSession, recordUploadPart } from "@/lib/marketplace/assets";
import { objectExists, putBuffer, stagingPartKey } from "@/lib/marketplace/storage";
import { fail, json, readJson, requireArtistOrAdmin } from "@/lib/marketplace/guard";
import { clientIp, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/upload/part
 *
 * Receives ONE chunk of a large master.
 *
 *   • multipart/form-data — `sessionId`, `partNumber`, `file` (local backend:
 *     the browser posts each chunk here, so nothing is buffered for longer than
 *     a single part).
 *   • application/json    — `{ sessionId, partNumber, bytes, etag }` to register
 *     a chunk the browser already PUT to a presigned S3 URL.
 *
 * Chunks land in the private staging area (`private/staging/<session>/…`) and are
 * deleted as they are concatenated during completion.
 */
export async function POST(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const key = `marketplace-upload:part:${clientIp(request)}`;
  if (tooManyAttempts(key)) return fail("too_many_attempts", 429);
  recordAttempt(key);

  const contentType = request.headers.get("content-type") ?? "";

  /* ---------- S3 direct-upload registration ---------- */
  if (contentType.includes("application/json")) {
    const body = await readJson<{ sessionId?: string; partNumber?: number; bytes?: number; etag?: string }>(request);
    if (!body?.sessionId || !body.partNumber) return fail("invalid_payload");
    const session = await getOpenUploadSession(body.sessionId, auth.user.id);
    if (!session) return fail("session_not_found", 404);
    if (body.partNumber > Math.ceil(session.sizeBytes / session.partSize)) return fail("part_out_of_range");

    // Trust nothing: the chunk must actually exist in staging before we count it.
    const staged = await objectExists(stagingPartKey(session.id, body.partNumber));
    if (!staged) return fail("part_not_stored", 409);

    const updated = await recordUploadPart(session.id, body.partNumber, body.bytes ?? 0, body.etag ?? "");
    return json({ ok: true, partNumber: body.partNumber, received: updated?.parts.length ?? 0 });
  }

  /* ---------- local chunk upload ---------- */
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_form_data", 400);
  }

  const sessionId = String(form.get("sessionId") ?? "");
  const partNumber = Number(form.get("partNumber") ?? 0);
  const file = form.get("file");
  if (!sessionId || !partNumber || !(file instanceof File)) return fail("invalid_payload");

  const session = await getOpenUploadSession(sessionId, auth.user.id);
  if (!session) return fail("session_not_found", 404);

  const totalParts = Math.ceil(session.sizeBytes / session.partSize);
  if (partNumber < 1 || partNumber > Math.max(totalParts, 1)) return fail("part_out_of_range");
  if (file.size > session.partSize + 1024 * 1024) {
    return fail("part_too_large", 413, { partSize: session.partSize });
  }

  const received = session.parts.reduce((sum, part) => sum + part.bytes, 0);
  const alreadyThisPart = session.parts.some((part) => part.partNumber === partNumber);
  if (!alreadyThisPart && received + file.size > session.sizeBytes + 1024 * 1024) {
    return fail("exceeds_declared_size", 413, { declared: session.sizeBytes, received });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const etag = crypto.createHash("md5").update(buffer).digest("hex");

  try {
    await putBuffer(stagingPartKey(session.id, partNumber), buffer, "application/octet-stream");
  } catch (error) {
    console.error("[marketplace/upload/part]", error);
    return fail("storage_error", 502);
  }

  const updated = await recordUploadPart(session.id, partNumber, buffer.byteLength, etag);
  return json({
    ok: true,
    partNumber,
    etag,
    bytes: buffer.byteLength,
    receivedParts: updated?.parts.length ?? 0,
    totalParts,
  });
}

/** POST /api/marketplace/upload/part?… via OPTIONS-free GET is not supported. */
export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
