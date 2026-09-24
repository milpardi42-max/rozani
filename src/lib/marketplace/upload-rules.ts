import { formatAcceptsUpload, isExportFormatId, isRasterFormat, type ExportFormatId } from "./formats";

/**
 * Upload rules for a single deliverable.
 *
 * A session always carries *one* file of *one* format for *one* colourway; this
 * module decides whether that combination is acceptable and keeps the wording of
 * the refusals in one place, so the API, the uploader UI and the smoke tests all
 * agree on what "PNG", "AI" or "Preview image" means.
 */

export interface FormatCheckInput {
  formatId?: string | null;
  filename: string;
  mime: string;
  /** True when this file joins an existing work (colourways 2..n). */
  attaching: boolean;
}

export type FormatCheckError = { error: "invalid_format" | "unsupported_type" | "raster_required"; detail: string };

/** Lower-case, storage-safe colourway id (`cw_…`), or the default colourway. */
export function normaliseColourwayId(value: unknown): string {
  if (typeof value !== "string") return "cw-main";
  const clean = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 40);
  return clean.length >= 3 ? clean : "cw-main";
}

/**
 * Validates `formatId` against the file the client is about to send.
 *
 * • the id must exist (`png`, `jpg`, `preview`, `ai`, `psd`, `svg`, `eps`)
 * • the extension or the MIME must match that format
 * • the *first* file of a work must be a raster delivery file (PNG/JPG), because
 *   previews, thumbnails and the seamless report are rendered from it
 */
export function formatAcceptError(input: FormatCheckInput): FormatCheckError | null {
  if (!isExportFormatId(input.formatId)) {
    return { error: "invalid_format", detail: String(input.formatId ?? "") };
  }
  const formatId: ExportFormatId = input.formatId;

  if (!formatAcceptsUpload(formatId, input.filename, input.mime)) {
    return { error: "unsupported_type", detail: formatId };
  }

  if (!input.attaching && formatId !== "png" && formatId !== "jpg") {
    return { error: "raster_required", detail: formatId };
  }

  return null;
}

/** True when this upload will become the artwork the platform can render. */
export function producesPreviews(formatId: string | null | undefined): boolean {
  return formatId === "preview" || isRasterFormat(formatId);
}
