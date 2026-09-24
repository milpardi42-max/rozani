import { finalizeWork, getAsset, isSha256Hex, type FinalizeManifestEntry } from "@/lib/marketplace/assets";
import { sendReviewNotice } from "@/lib/marketplace/email";
import { isExportFormatId } from "@/lib/marketplace/formats";
import { normaliseColourwayId } from "@/lib/marketplace/upload-rules";
import { fail, json, readJson, requireArtistOrAdmin } from "@/lib/marketplace/guard";
import { familyById } from "@/lib/data/families";

export const dynamic = "force-dynamic";

/** A batch never carries more files than colourways × formats; this is a generous cap. */
const MAX_MANIFEST_FILES = 200;

/**
 * POST /api/marketplace/upload/finalize
 *
 * Called once, after the browser has sent every file of a work
 * (`/upload/session` → `/upload/part`… → `/upload/complete`, per file).
 *
 *   body: { assetId, files: [{ colourwayId, formatId, sizeBytes, sha256? }] }
 *
 * The server compares that manifest with what it really holds. Any missing,
 * short or altered file → 409 `incomplete_upload` with the list of problems; the
 * work stays private and the browser re-sends just those files.
 *
 * When everything checks out the publishing policy is applied (see
 * `finalizeWork`): by default the work goes live at once and the response links
 * to its page and to its category in the shop.
 */
export async function POST(request: Request) {
  const auth = await requireArtistOrAdmin();
  if ("response" in auth) return auth.response;

  const body = await readJson<{
    assetId?: string;
    files?: { colourwayId?: string; formatId?: string; sizeBytes?: number; sha256?: string | null }[];
  }>(request);
  if (!body?.assetId || !Array.isArray(body.files) || body.files.length === 0) return fail("invalid_payload");
  if (body.files.length > MAX_MANIFEST_FILES) return fail("too_many_files", 400, { max: MAX_MANIFEST_FILES });

  const manifest: FinalizeManifestEntry[] = [];
  for (const entry of body.files) {
    const sizeBytes = Number(entry?.sizeBytes);
    if (!entry || !isExportFormatId(entry.formatId) || !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
      return fail("invalid_manifest", 400);
    }
    if (entry.sha256 !== undefined && entry.sha256 !== null && !isSha256Hex(entry.sha256)) return fail("invalid_checksum", 400);
    manifest.push({
      colourwayId: normaliseColourwayId(entry.colourwayId),
      formatId: entry.formatId,
      sizeBytes,
      sha256: entry.sha256 ?? null,
    });
  }

  const asset = await getAsset(body.assetId);
  if (!asset) return fail("asset_not_found", 404);
  if (asset.ownerUserId !== auth.user.id && auth.user.role !== "admin") return fail("forbidden", 403);

  try {
    const result = await finalizeWork({ assetId: asset.id, manifest });

    /* Same notice an admin approval sends — the artist gets it in writing too. */
    if (result.published && result.reason !== "already_published") {
      const owner = await ownerEmail(result.asset.ownerUserId);
      if (owner) {
        await sendReviewNotice({ to: owner, assetTitle: result.asset.title, status: "approved", locale: "fa" }).catch(() => undefined);
      }
    }

    const family = familyById(result.asset.familyId);
    return json({
      ok: true,
      published: result.published,
      reason: result.reason,
      verified: result.verified,
      asset: {
        id: result.asset.id,
        slug: result.asset.slug,
        title: result.asset.title,
        status: result.asset.status,
        visibility: result.asset.visibility,
        familyId: result.asset.familyId ?? null,
        uploadState: result.asset.uploadState ?? "complete",
      },
      /* Locale-less paths; the client prefixes its locale. */
      links: {
        work: result.published ? `/marketplace/${result.asset.slug}` : null,
        category: result.published && family ? `/shop?family=${family.slug}` : null,
      },
      family: family ? { id: family.id, slug: family.slug, name: family.name } : null,
    });
  } catch (error) {
    const message = String(error);
    if (message.includes("incomplete_upload")) {
      const detail = error as { problems?: unknown; verified?: unknown };
      return fail("incomplete_upload", 409, { problems: detail.problems ?? [], verified: detail.verified ?? null });
    }
    if (message.includes("asset_locked")) return fail("asset_locked", 409);
    if (message.includes("asset_not_found")) return fail("asset_not_found", 404);
    console.error("[marketplace/upload/finalize]", error);
    return fail("server_error", 500);
  }
}

async function ownerEmail(ownerUserId: string | null | undefined): Promise<string | null> {
  if (!ownerUserId) return null;
  const { findUserById } = await import("@/lib/data/users");
  const user = await findUserById(ownerUserId).catch(() => null);
  return user?.email ?? null;
}
