import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { withNoStore } from "@/lib/http";
import { clientIp, tooManyAttempts, recordAttempt, retryAfterSeconds } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Allowed MIME types and their canonical extensions */
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** 8 MB hard limit */
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Magic-byte signatures for allowed image formats.
 * We check these to prevent MIME-type spoofing.
 */
const MAGIC: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF + WEBP at offset 8 — checked below
  { mime: "image/avif", bytes: [0x00, 0x00, 0x00], offset: 0 }, // ftyp box — checked below
];

function detectMimeFromBytes(buf: Buffer): string | null {
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  // WebP: RIFF????WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  // AVIF / HEIF: ftyp box — 4 bytes length, then "ftyp", then brand "avif"/"heic"/"heif"
  if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
    const brand = buf.slice(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("heic") || brand.startsWith("heif") || brand.startsWith("mif1")) return "image/avif";
  }
  return null;
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: "unauthorized" }, withNoStore({ status: 401 }));
}

/* ─── Storage backends ────────────────────────────────────────────── */

async function uploadToCloudinary(buffer: Buffer, ext: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.round(Date.now() / 1000).toString();
  const folder = "rozadi/uploads";
  const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const form = new FormData();
  // Slice to get a proper ArrayBuffer (not SharedArrayBuffer) for Blob
  const arrayBuf = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  form.append("file", new Blob([arrayBuf], { type: `image/${ext}` }), `upload.${ext}`);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`cloudinary ${res.status}`);
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

async function uploadToVercelBlob(buffer: Buffer, filename: string): Promise<string> {
  // Use eval to avoid Next.js static analysis bundling @vercel/blob when not installed.
  // This function is only called when BLOB_READ_WRITE_TOKEN is set, meaning the package exists.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-eval
  const mod = await (eval('import("@vercel/blob")') as Promise<{
    put: (path: string, data: Buffer, opts: Record<string, unknown>) => Promise<{ url: string }>;
  }>);
  const blob = await mod.put(`uploads/${filename}`, buffer, {
    access: "public",
    addRandomSuffix: false,
  });
  return blob.url;
}

async function uploadLocal(buffer: Buffer, filename: string): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "images", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, filename), buffer);
  return `/images/uploads/${filename}`;
}

/**
 * POST /api/artist/upload
 * Accepts multipart/form-data with a single `file` field.
 *
 * Storage priority (first configured backend wins):
 *   1. Cloudinary  (CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET)
 *   2. Vercel Blob (BLOB_READ_WRITE_TOKEN)
 *   3. Local file  public/images/uploads/<hash>.<ext>
 */
export async function POST(req: Request) {
  // Only artists and admins may upload
  const session = await getSession();
  if (!session || (session.role !== "artist" && session.role !== "admin")) {
    return unauthorized();
  }

  // Rate limit: 20 uploads per 5 min per IP
  const rlKey = `upload:${clientIp(req)}`;
  if (tooManyAttempts(rlKey)) {
    const retryAfter = retryAfterSeconds(rlKey);
    const res = NextResponse.json({ ok: false, error: "too_many_attempts" }, withNoStore({ status: 429 }));
    if (retryAfter > 0) res.headers.set("Retry-After", String(retryAfter));
    return res;
  }
  recordAttempt(rlKey);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_form_data" }, withNoStore({ status: 400 }));
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, withNoStore({ status: 400 }));
  }

  // Validate declared MIME type
  const declaredExt = ALLOWED[file.type];
  if (!declaredExt) {
    return NextResponse.json(
      { ok: false, error: "unsupported_type", allowed: Object.keys(ALLOWED) },
      withNoStore({ status: 415 }),
    );
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "file_too_large", maxBytes: MAX_BYTES },
      withNoStore({ status: 413 }),
    );
  }

  // Read bytes
  const buffer = Buffer.from(await file.arrayBuffer());

  // Magic-byte validation — reject spoofed MIME types
  const detectedMime = detectMimeFromBytes(buffer);
  if (!detectedMime || !ALLOWED[detectedMime]) {
    return NextResponse.json(
      { ok: false, error: "invalid_image_data" },
      withNoStore({ status: 415 }),
    );
  }
  const ext = ALLOWED[detectedMime];

  // Deterministic content-hash filename (deduplicates identical uploads)
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 16);
  const filename = `${hash}.${ext}`;

  try {
    let url: string;

    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      url = await uploadToCloudinary(buffer, ext);
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      url = await uploadToVercelBlob(buffer, filename);
    } else {
      url = await uploadLocal(buffer, filename);
    }

    return NextResponse.json({ ok: true, url }, withNoStore());
  } catch (e) {
    console.error("[artist/upload] storage error:", e);
    return NextResponse.json({ ok: false, error: "storage_error" }, withNoStore({ status: 502 }));
  }
}
