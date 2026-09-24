import { NextResponse } from "next/server";
import {
  MAX_MASTER_BYTES,
  MULTIPART_PART_SIZE,
  MULTIPART_THRESHOLD_BYTES,
  ACCEPTED_MASTER_MIME,
  storageProvider,
} from "@/lib/marketplace/config";
import { createUploadSession, getAssets, getUploadSession, abortUploadSession } from "@/lib/marketplace/assets";
import { presignUpload, stagingPartKey } from "@/lib/marketplace/storage";
import { formatAcceptError, normaliseColourwayId } from "@/lib/marketplace/upload-rules";
import { fail, json, readJson, requireArtistOrAdmin } from "@/lib/marketplace/guard";
import { clientIp, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";
import { isFamilyId } from "@/lib/data/families";
import { EXPORT_FORMAT_IDS, detectFormat, isExportFormatId, minUploadBytes } from "@/lib/marketplace/formats";
import type { UploadSession } from "@/lib/marketplace/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/upload/session
 *
 * Opens an upload session for a private master file.
 *
 * The response tells the client *how* to send the bytes:
 *   • provider "s3"    → `partUrls` are presigned PUTs; the browser uploads
 *                        straight to the bucket (nothing flows through Next.js)
 *   • provider "local" → the client POSTs each chunk to `/upload/part`
 *
 * Both cases then call `/upload/complete`.
 */
export async function POST(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const key = `marketplace-upload:session:${clientIp(request)}`;
  if (tooManyAttempts(key)) return fail("too_many_attempts", 429);
  recordAttempt(key);

  const body = await readJson<{
    filename?: string;
    sizeBytes?: number;
    mime?: string;
    title?: { fa?: string; en?: string };
    description?: { fa?: string; en?: string };
    kind?: UploadSession["meta"]["kind"];
    tags?: string[];
    familyId?: string | null;
    patternId?: string | null;
    /** Deliverable format (PNG/JPG/preview/AI/PSD/SVG/EPS) — see `lib/marketplace/formats.ts`. */
    formatId?: string;
    colourwayId?: string;
    colourway?: { name?: { fa?: string; en?: string }; hex?: string };
    /** Colourways 2..n attach their files to the work created by colourway 1. */
    attachToAssetId?: string | null;
  }>(request);

  if (!body?.filename || !body.mime || !body.sizeBytes) return fail("invalid_payload");
  /* Every work must be filed under a real product family — see `lib/data/families.ts`. */
  if (!isFamilyId(body.familyId)) return fail("invalid_family", 400);
  if (body.sizeBytes > MAX_MASTER_BYTES) {
    return fail("file_too_large", 413, { maxBytes: MAX_MASTER_BYTES });
  }

  /* The format decides what is accepted, and the file must really be that format.
     Callers that predate colourways may omit `formatId`; it is then inferred from
     the file name (and, failing that, the MIME type). */
  const declaredFormat = isExportFormatId(body.formatId) ? body.formatId : detectFormat(body.filename, body.mime)?.id;
  const formatError = formatAcceptError({
    formatId: declaredFormat,
    filename: body.filename,
    mime: body.mime,
    attaching: Boolean(body.attachToAssetId),
  });
  if (formatError) {
    return formatError.error === "unsupported_type"
      ? fail("unsupported_type", 415, { allowed: Object.keys(ACCEPTED_MASTER_MIME), format: formatError.detail })
      : fail(formatError.error, 422, { format: formatError.detail });
  }

  /* Attaching is only allowed on a work the caller already owns. */
  if (body.attachToAssetId) {
    const assets = await getAssets();
    const target = assets.find((asset) => asset.id === body.attachToAssetId);
    if (!target) return fail("asset_not_found", 404);
    if (target.ownerUserId !== auth.user.id && auth.user.role !== "admin") return fail("forbidden", 403);
    if (target.status === "sold_exclusive" || target.status === "delisted") return fail("asset_locked", 409);
  }

  try {
    const session = await createUploadSession({
      userId: auth.user.id,
      artistId: auth.user.artistId ?? null,
      filename: body.filename,
      mime: body.mime,
      sizeBytes: body.sizeBytes,
      formatId: declaredFormat as UploadSession["formatId"],
      colourwayId: normaliseColourwayId(body.colourwayId),
      colourway: body.colourway
        ? {
            name: {
              fa: body.colourway.name?.fa?.trim() || "رنگ جدید",
              en: body.colourway.name?.en?.trim() || "New colour",
            },
            hex: body.colourway.hex ?? "#0f172a",
          }
        : null,
      attachToAssetId: body.attachToAssetId ?? null,
      meta: {
        title: {
          fa: body.title?.fa?.trim() || body.filename,
          en: body.title?.en?.trim() || body.filename,
        },
        description: { fa: body.description?.fa ?? "", en: body.description?.en ?? "" },
        kind: body.kind ?? "pattern",
        tags: body.tags ?? [],
        familyId: body.familyId,
        patternId: body.patternId ?? null,
      },
    });

    const totalParts = session.mode === "multipart" ? Math.ceil(session.sizeBytes / MULTIPART_PART_SIZE) : 1;
    const provider = storageProvider();

    /* S3: one presigned PUT per chunk, straight into the staging folder. */
    const partUrls =
      provider === "s3"
        ? Array.from({ length: totalParts }, (_, index) => presignUpload(stagingPartKey(session.id, index + 1), 3600))
        : null;

    return json({
      ok: true,
      session: {
        id: session.id,
        mode: session.mode,
        key: session.key,
        sizeBytes: session.sizeBytes,
        partSize: MULTIPART_PART_SIZE,
        totalParts,
        partUrls,
        partEndpoint: provider === "s3" ? null : "/api/marketplace/upload/part",
        completeEndpoint: "/api/marketplace/upload/complete",
      },
      limits: {
        maxBytes: MAX_MASTER_BYTES,
        thresholdBytes: MULTIPART_THRESHOLD_BYTES,
        accepted: Object.keys(ACCEPTED_MASTER_MIME),
        formats: EXPORT_FORMAT_IDS,
        minBytes: minUploadBytes(declaredFormat),
      },
    });
  } catch (error) {
    const message = String(error);
    if (message.includes("file_too_large")) return fail("file_too_large", 413, { maxBytes: MAX_MASTER_BYTES });
    if (message.includes("file_too_small")) return fail("file_too_small", 400, { minBytes: minUploadBytes(declaredFormat) });
    console.error("[marketplace/upload/session]", error);
    return fail("server_error", 500);
  }
}

/** GET /api/marketplace/upload/session?id=… — status + fresh presigned URLs. */
export async function GET(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("missing_id");

  const session = await getUploadSession(id);
  if (!session || session.userId !== auth.user.id) return fail("not_found", 404);

  const totalParts = session.mode === "multipart" ? Math.ceil(session.sizeBytes / MULTIPART_PART_SIZE) : 1;
  const provider = storageProvider();
  return json({
    ok: true,
    session: {
      id: session.id,
      mode: session.mode,
      status: session.status,
      receivedParts: session.parts.map((part) => part.partNumber),
      bytesReceived: session.parts.reduce((sum, part) => sum + part.bytes, 0),
      totalParts,
      partSize: session.partSize,
      partUrls:
        provider === "s3"
          ? Array.from({ length: totalParts }, (_, index) => presignUpload(stagingPartKey(session.id, index + 1), 3600))
          : null,
    },
  });
}

/** DELETE /api/marketplace/upload/session?id=… — abandon the session. */
export async function DELETE(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("missing_id");

  const session = await getUploadSession(id);
  if (!session || session.userId !== auth.user.id) return fail("not_found", 404);
  if (session.status === "completed") return fail("already_completed", 409);

  await abortUploadSession(id);
  const { deletePrefix, deleteObject } = await import("@/lib/marketplace/storage");
  await deleteObject(session.key).catch(() => undefined);
  await deletePrefix(`private/staging/${session.id}`).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
