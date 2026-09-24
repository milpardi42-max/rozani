import { minUploadBytes } from "@/lib/marketplace/formats";
import {
  abortUploadSession,
  claimUploadSession,
  completeUpload,
  getOpenUploadSession,
  getUploadSession,
  releaseUploadSession,
  sessionPartCount,
} from "@/lib/marketplace/assets";
import { DEFAULT_COLOURWAY_ID } from "@/lib/marketplace/colourways";
import { deleteObject, deletePrefix } from "@/lib/marketplace/storage";
import { fail, json, requireArtistOrAdmin } from "@/lib/marketplace/guard";
import { scanBuffer } from "@/lib/marketplace/scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/marketplace/upload/complete
 *
 * Finishes an upload session. Two shapes are accepted:
 *
 *   • multipart/form-data — `sessionId` plus the file itself (sessions whose
 *     size is under the multipart threshold).
 *   • multipart/form-data with only `sessionId`, or a JSON body `{ sessionId }`
 *     — the chunks previously POSTed to `/upload/part` are concatenated here
 *     (this is the path used for masters larger than the threshold).
 *
 * The pipeline verifies the bytes (exact size, and the browser's SHA-256 when it
 * sent one), stores the file privately, scans it and builds the watermarked
 * derivatives + mockups. The work stays private: it is only published by
 * `/upload/finalize`, after every file of the batch has been verified.
 */
export async function POST(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  let sessionId = "";
  let file: File | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    sessionId = body?.sessionId ?? "";
  } else {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("invalid_form_data", 400);
    }
    sessionId = String(form.get("sessionId") ?? "");
    const candidate = form.get("file");
    if (candidate instanceof File) file = candidate;
  }

  if (!sessionId) return fail("missing_session");

  const session = await getOpenUploadSession(sessionId, auth.user.id);
  if (!session) {
    const finished = await getUploadSession(sessionId);
    if (finished?.status === "completed" && finished.userId === auth.user.id) {
      return fail("already_completed", 409, { assetId: finished.assetId });
    }
    return fail("session_not_found", 404);
  }

  /* ---------- assemble the master ---------- */
  let buffer: Buffer | undefined;

  if (session.mode === "multipart" || session.parts.length > 1) {
    const totalParts = sessionPartCount(session);
    const received = new Set(session.parts.map((part) => part.partNumber));
    const missing: number[] = [];
    for (let index = 1; index <= totalParts; index += 1) if (!received.has(index)) missing.push(index);
    if (missing.length) return fail("missing_parts", 409, { missing, received: session.parts.length, totalParts });
    buffer = undefined; // completeUpload assembles the staging chunks itself
  } else if (file) {
    const floor = minUploadBytes(session.formatId);
    if (file.size < floor) return fail("file_too_small", 400, { minBytes: floor });
    buffer = Buffer.from(await file.arrayBuffer());
  } else {
    return fail("missing_body", 400);
  }

  /* One completion per session: a retried request that races the original must
     not build the work twice. The browser waits and asks again. */
  if (!(await claimUploadSession(session.id))) return fail("completing", 409, { retryAfterMs: 2000 });

  try {
    const { asset, scan } = await completeUpload(session, { buffer });

    // Staging chunks are no longer needed once the master is stored.
    await deletePrefix(`private/staging/${session.id}`).catch(() => undefined);

    /* What the server now holds for this file — the browser compares it with
       its own size/hash and reports it back to `/upload/finalize`. */
    const colourwayId = session.colourwayId ?? DEFAULT_COLOURWAY_ID;
    const stored = (asset.colourways ?? [])
      .find((colourway) => colourway.id === colourwayId)
      ?.files.find((item) => item.formatId === session.formatId);

    return json({
      ok: true,
      asset: {
        id: asset.id,
        slug: asset.slug,
        title: asset.title,
        status: asset.status,
        previewKey: asset.previewKey,
        tileKey: asset.tileKey,
        mockups: asset.mockups.length,
        seamless: asset.seamless,
        scan,
        master: { filename: asset.master.filename, sizeBytes: asset.master.sizeBytes, sha256: asset.master.sha256 },
      },
      file: stored
        ? { colourwayId, formatId: stored.formatId, sizeBytes: stored.sizeBytes, sha256: stored.sha256, scan: stored.scanStatus ?? scan.status }
        : null,
      /* not public yet: `/upload/finalize` publishes once the whole batch is verified */
      message: "stored_awaiting_finalize",
    });
  } catch (error) {
    /* Nothing was built: let the session be retried (or aborted below). */
    await releaseUploadSession(session.id).catch(() => undefined);
    const message = String(error);
    if (message.includes("size_mismatch") || message.includes("checksum_mismatch")) {
      /* The bytes are not the ones announced: nothing was kept, start this file over. */
      const detail = error as { code?: string; expected?: number | string; received?: number | string };
      await abortUploadSession(session.id).catch(() => undefined);
      await deletePrefix(`private/staging/${session.id}`).catch(() => undefined);
      return fail(message.includes("size_mismatch") ? "size_mismatch" : "checksum_mismatch", 422, {
        expected: detail.expected ?? null,
        received: detail.received ?? null,
      });
    }
    if (message.includes("file_too_small")) {
      return fail("file_too_small", 400, { minBytes: (error as { minBytes?: number }).minBytes ?? 0 });
    }
    if (message.includes("asset_not_found")) return fail("asset_not_found", 404);
    if (message.includes("forbidden")) return fail("forbidden", 403);
    if (message.includes("asset_locked")) return fail("asset_locked", 409, { detail: "work is sold exclusively or delisted" });
    if (message.includes("invalid_signature")) {
      const formatId = (error as { formatId?: string }).formatId ?? "";
      await deleteObject(session.attachToAssetId ? session.key : session.key).catch(() => undefined);
      await abortUploadSession(session.id).catch(() => undefined);
      await deletePrefix(`private/staging/${session.id}`).catch(() => undefined);
      return fail("invalid_signature", 422, { formatId });
    }
    if (message.includes("infected")) {
      const scan = (error as { scan?: Awaited<ReturnType<typeof scanBuffer>> }).scan;
      await abortUploadSession(session.id).catch(() => undefined);
      await deletePrefix(`private/staging/${session.id}`).catch(() => undefined);
      return fail("infected", 422, { scan });
    }
    console.error("[marketplace/upload/complete]", error);
    return fail("server_error", 500, { detail: message.slice(0, 200) });
  }
}
