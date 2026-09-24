import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Allowed video MIME types */
const ALLOWED_VIDEO: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "video/mpeg": "mpeg",
};

/** Allowed image MIME types (for thumbnail/cover) */
const ALLOWED_IMAGE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** 500 MB hard limit for videos */
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
/** 8 MB hard limit for images */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/* ─── Storage helpers ──────────────────────────────────────── */

async function uploadVideoToCloudinary(
  buffer: Buffer,
  ext: string,
  filename: string
): Promise<{ url: string; durationSec?: number }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.round(Date.now() / 1000).toString();
  const folder = "rozadi/academy/videos";
  const toSign = `folder=${folder}&resource_type=video&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  const arrayBuf = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  form.append("file", new Blob([arrayBuf], { type: `video/${ext}` }), `${filename}.${ext}`);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("resource_type", "video");
  form.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) throw new Error(`cloudinary ${res.status}`);
  const data = (await res.json()) as { secure_url: string; duration?: number };
  return { url: data.secure_url, durationSec: data.duration ? Math.round(data.duration) : undefined };
}

async function uploadVideoToVercelBlob(
  buffer: Buffer,
  filename: string
): Promise<{ url: string }> {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-eval
  const mod = await (eval('import("@vercel/blob")') as Promise<{
    put: (p: string, d: Buffer, o: Record<string, unknown>) => Promise<{ url: string }>;
  }>);
  const blob = await mod.put(`academy/videos/${filename}`, buffer, {
    access: "public",
    addRandomSuffix: false,
  });
  return { url: blob.url };
}

async function uploadVideoLocal(
  buffer: Buffer,
  filename: string
): Promise<{ url: string }> {
  const dir = path.join(process.cwd(), "public", "videos", "academy");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return { url: `/videos/academy/${filename}` };
}

async function uploadImageLocal(
  buffer: Buffer,
  filename: string
): Promise<{ url: string }> {
  const dir = path.join(process.cwd(), "public", "images", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return { url: `/images/uploads/${filename}` };
}

/* ─── Route handler ───────────────────────────────────────── */

/**
 * POST /api/admin/academy/upload-video
 *
 * Accepts multipart/form-data with:
 *   file        — video or image file
 *   fileType    — "video" | "image"  (defaults to "video")
 *
 * Returns: { ok: true, url, sizeBytes, durationSec? }
 *
 * Storage priority (first configured wins):
 *   1. Cloudinary  (CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET)
 *   2. Vercel Blob (BLOB_READ_WRITE_TOKEN)
 *   3. Local disk  public/videos/academy/<hash>.<ext>
 */
export async function POST(req: Request) {
  // Admin only
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return unauthorized();
  }

  // Rate limit: uses "upload" policy (20 per 5 min) from POLICIES
  const rlKey = `upload:${clientIp(req)}-academy`;
  if (tooManyAttempts(rlKey)) {
    const retryAfter = retryAfterSeconds(rlKey);
    const res = NextResponse.json(
      { ok: false, error: "too_many_attempts" },
      withNoStore({ status: 429 })
    );
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_form_data" },
      withNoStore({ status: 400 })
    );
  }

  const file = formData.get("file");
  const fileType = (formData.get("fileType") as string | null) ?? "video";

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "missing_file" },
      withNoStore({ status: 400 })
    );
  }

  if (fileType === "image") {
    // ── image upload (thumbnail / cover) ──
    const ext = ALLOWED_IMAGE[file.type];
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "unsupported_image_type", allowed: Object.keys(ALLOWED_IMAGE) },
        withNoStore({ status: 415 })
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "file_too_large", maxBytes: MAX_IMAGE_BYTES },
        withNoStore({ status: 413 })
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 16);
    const filename = `${hash}.${ext}`;
    try {
      const { url } = await uploadImageLocal(buffer, filename);
      return NextResponse.json(
        { ok: true, url, sizeBytes: file.size },
        withNoStore()
      );
    } catch (e) {
      console.error("[academy/upload-video] image storage error:", e);
      return NextResponse.json(
        { ok: false, error: "storage_error" },
        withNoStore({ status: 502 })
      );
    }
  }

  // ── video upload ──
  const ext = ALLOWED_VIDEO[file.type];
  if (!ext) {
    return NextResponse.json(
      { ok: false, error: "unsupported_video_type", allowed: Object.keys(ALLOWED_VIDEO) },
      withNoStore({ status: 415 })
    );
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { ok: false, error: "file_too_large", maxBytes: MAX_VIDEO_BYTES },
      withNoStore({ status: 413 })
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 16);
  const filename = `${hash}.${ext}`;

  try {
    let result: { url: string; durationSec?: number };

    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      result = await uploadVideoToCloudinary(buffer, ext, hash);
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      result = await uploadVideoToVercelBlob(buffer, filename);
    } else {
      result = await uploadVideoLocal(buffer, filename);
    }

    return NextResponse.json(
      { ok: true, url: result.url, sizeBytes: file.size, durationSec: result.durationSec },
      withNoStore()
    );
  } catch (e) {
    console.error("[academy/upload-video] video storage error:", e);
    return NextResponse.json(
      { ok: false, error: "storage_error" },
      withNoStore({ status: 502 })
    );
  }
}
