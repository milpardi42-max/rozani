import crypto from "crypto";
import { NextResponse } from "next/server";
import { expectedPartBytes, getOpenUploadSession, isSha256Hex, recordUploadPart, sessionPartCount } from "@/lib/marketplace/assets";
import { objectSize, putBuffer, stagingPartKey } from "@/lib/marketplace/storage";
import { fail, json, readJson, requireArtistOrAdmin } from "@/lib/marketplace/guard";
import { clientIp, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/upload/part
 *
 * Receives ONE chunk of a large master.
 *
 *   • multipart/form-data — `sessionId`, `partNumber`, `file` and optionally
 *     `sha256` (local backend: the browser posts each chunk here, so nothing is
 *     buffered for longer than a single part).
 *   • application/json    — `{ sessionId, partNumber, bytes, etag }` to register
 *     a chunk the browser already PUT to a presigned S3 URL.
 *
 * Every chunk must have exactly the length its position implies (`partSize`,
 * the last one the remainder) and, when the browser sent one, the same SHA-256.
 * A chunk cut short on the way is refused with 422 so the browser re-sends it —
 * it is never counted towards the file.
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
    const partNumber = Number(body.partNumber);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > sessionPartCount(session)) return fail("part_out_of_range");

    // Trust nothing: the chunk must actually be in staging, whole, before we count it.
    const stored = await objectSize(stagingPartKey(session.id, partNumber));
    if (!stored) return fail("part_not_stored", 409);
    const expected = expectedPartBytes(session, partNumber);
    if (stored !== expected) return fail("part_size_mismatch", 422, { partNumber, expected, received: stored });

    const updated = await recordUploadPart(session.id, partNumber, stored, body.etag ?? "");
    return json({ ok: true, partNumber, bytes: stored, received: updated?.parts.length ?? 0 });
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
  const declaredHash = form.get("sha256");
  const file = form.get("file");
  if (!sessionId || !Number.isInteger(partNumber) || !partNumber || !(file instanceof File)) return fail("invalid_payload");
  if (declaredHash !== null && !isSha256Hex(declaredHash)) return fail("invalid_checksum", 400);

  const session = await getOpenUploadSession(sessionId, auth.user.id);
  if (!session) return fail("session_not_found", 404);

  const totalParts = sessionPartCount(session);
  if (partNumber < 1 || partNumber > totalParts) return fail("part_out_of_range");
  if (file.size > session.partSize + 1024 * 1024) {
    return fail("part_too_large", 413, { partSize: session.partSize });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const expected = expectedPartBytes(session, partNumber);
  if (buffer.byteLength !== expected) {
    return fail("part_size_mismatch", 422, { partNumber, expected, received: buffer.byteLength });
  }
  const digest = crypto.createHash("sha256").update(buffer).digest("hex");
  if (typeof declaredHash === "string" && declaredHash.toLowerCase() !== digest) {
    return fail("part_corrupted", 422, { partNumber });
  }
  const etag = crypto.createHash("md5").update(buffer).digest("hex");

  try {
    await putBuffer(stagingPartKey(session.id, partNumber), buffer, "application/octet-stream");
  } catch (error) {
    console.error("[marketplace/upload/part]", error);
    return fail("storage_error", 502);
  }

  const updated = await recordUploadPart(session.id, partNumber, buffer.byteLength, etag, digest);
  return json({
    ok: true,
    partNumber,
    etag,
    sha256: digest,
    bytes: buffer.byteLength,
    receivedParts: updated?.parts.length ?? 0,
    totalParts,
  });
}

/** POST /api/marketplace/upload/part?… via OPTIONS-free GET is not supported. */
export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
