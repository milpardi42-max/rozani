import { MULTIPART_PART_SIZE } from "@/lib/marketplace/config";
import { minUploadBytes } from "@/lib/marketplace/formats";
import { completeUpload, getOpenUploadSession, getUploadSession, abortUploadSession } from "@/lib/marketplace/assets";
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
 * The pipeline then stores the master privately, scans it and builds the
 * watermarked derivatives + mockups before queueing it for admin review.
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
    const totalParts = Math.ceil(session.sizeBytes / MULTIPART_PART_SIZE);
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

  try {
    const { asset, scan } = await completeUpload(session, { buffer });

    // Staging chunks are no longer needed once the master is stored.
    await deletePrefix(`private/staging/${session.id}`).catch(() => undefined);

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
      message: "queued_for_review",
    });
  } catch (error) {
    const message = String(error);
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
