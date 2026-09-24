"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileUp,
  Loader2,
  Palette,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Field, Input } from "@/components/ui/Input";
import { PRODUCT_FAMILIES, familyById } from "@/lib/data/families";
import {
  EXPORT_FORMATS,
  formatAcceptsUpload,
  formatLabel,
  type ExportFormat,
  type ExportFormatId,
} from "@/lib/marketplace/formats";
import { COLOUR_PRESETS, contrastingInk, sanitizeHex } from "@/lib/marketplace/colourways";
import {
  UploadError,
  WHOLE_FILE_HASH_LIMIT,
  describeUploadError,
  getJson,
  postForm,
  postJson,
  putChunk,
  sha256Hex,
  sleep,
  withRetry,
  type ApiBody,
} from "@/lib/marketplace/upload-client";
import { cn, faNum, href } from "@/lib/utils";

/**
 * Master uploader — the professional hand-off form.
 *
 * The artist describes the work once, then builds its colourways: each colour has
 * a name, a swatch and its own file slots for PNG, JPG, the preview image, AI,
 * PSD, SVG and EPS. Pressing upload sends every attached file in sequence — the
 * first one creates the work, the rest are attached to it — reusing the same
 * session/part/complete pipeline as a single master file (including chunked
 * uploads above the multipart threshold).
 *
 * Nothing is claimed before the server confirms it:
 *   • every file (and every chunk) carries its SHA-256; the server refuses bytes
 *     that do not match, and transient failures are retried automatically;
 *   • a slot only turns “stored” once the server answered with that exact size
 *     (and hash);
 *   • after the last file, `/upload/finalize` compares the whole batch with what
 *     the server holds. Only then is the work published (or queued for review,
 *     if the admin turned immediate publishing off) — a half-uploaded work never
 *     reaches the shop, and a failed batch resumes where it stopped.
 */

interface SessionInfo {
  id: string;
  mode: "single" | "multipart";
  sizeBytes: number;
  partSize: number;
  totalParts: number;
  partUrls: string[] | null;
  partEndpoint: string | null;
  completeEndpoint: string;
  /** The (normalised) colourway id the server files this upload under. */
  colourwayId?: string | null;
}

/** Answer of `/upload/finalize` — the only source of truth for the result panel. */
interface FinalizeResponse {
  ok: boolean;
  published: boolean;
  reason:
    | "auto_published"
    | "auto_approved_seamless"
    | "already_published"
    | "review_required"
    | "suspicious_file"
    | "hidden_by_admin"
    | "rejected";
  verified: { files: number; bytes: number };
  asset: { id: string; slug: string; title: { fa: string; en: string }; status: string; visibility: string; familyId: string | null };
  links: { work: string | null; category: string | null };
  family: { id: string; slug: string; name: { fa: string; en: string } } | null;
}

interface FinalizeProblem {
  colourwayId: string;
  formatId: string;
  problem: "missing" | "size_mismatch" | "checksum_mismatch" | "object_missing";
}

/** A file the server confirmed it holds, byte for byte. */
interface StoredFile {
  file: File;
  colourwayId: string;
  formatId: ExportFormatId;
  sizeBytes: number;
  sha256: string | null;
}

interface DraftColourway {
  id: string;
  nameFa: string;
  nameEn: string;
  hex: string;
  /** formatId → file, one file per format per colour. */
  files: Partial<Record<ExportFormatId, File>>;
}

type Phase = "idle" | "uploading" | "done" | "error";
type SlotState = { state: "queued" | "uploading" | "done" | "error"; percent: number; error?: string; note?: string };

const BLANK_META = {
  titleFa: "",
  titleEn: "",
  kind: "pattern",
  tags: "",
  descriptionFa: "",
  /* The real product category — required, see `lib/data/families.ts`. */
  familyId: "",
};

const FORMAT_ACCEPT: Record<ExportFormatId, string> = {
  png: ".png,image/png",
  jpg: ".jpg,.jpeg,image/jpeg",
  preview: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
  ai: ".ai,application/postscript,application/illustrator,application/pdf",
  psd: ".psd,image/vnd.adobe.photoshop",
  svg: ".svg,image/svg+xml",
  eps: ".eps,application/postscript",
};

const GROUP_TITLE: Record<ExportFormat["group"], { fa: string; en: string }> = {
  delivery: { fa: "فایل‌های تحویل", en: "Delivery files" },
  cover: { fa: "تصویر فروشگاه", en: "Storefront cover" },
  source: { fa: "فایل‌های منبع و برداری", en: "Sources & vectors" },
};

function newColourwayId(): string {
  return `cw-${Math.random().toString(36).slice(2, 8)}`;
}

function blankColourway(index: number, preset?: { hex: string; nameFa: string; nameEn: string }): DraftColourway {
  return {
    id: newColourwayId(),
    nameFa: preset?.nameFa ?? (index === 0 ? "رنگ اصلی" : `رنگ ${index + 1}`),
    nameEn: preset?.nameEn ?? (index === 0 ? "Original" : `Colour ${index + 1}`),
    hex: preset?.hex ?? COLOUR_PRESETS[index % COLOUR_PRESETS.length].hex,
    files: {},
  };
}

function slotKey(colourwayId: string, formatId: ExportFormatId): string {
  return `${colourwayId}:${formatId}`;
}

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function MasterUploader({
  onUploaded,
  onViewWorks,
  autoPublish,
}: {
  onUploaded?: () => void;
  /** Opens the studio's “My works” tab. */
  onViewWorks?: () => void;
  /** The admin's publishing policy (`undefined` while unknown) — only words the promises; the result comes from the server. */
  autoPublish?: boolean;
}) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [result, setResult] = useState<FinalizeResponse | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [redirectIn, setRedirectIn] = useState<number | null>(null);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const [meta, setMeta] = useState(BLANK_META);
  const [colourways, setColourways] = useState<DraftColourway[]>([blankColourway(0)]);

  const chosenFamily = familyById(meta.familyId);
  /* Only a work the server actually published sends the artist to the shop. */
  const categoryHref = result?.published && result.links.category ? href(locale, result.links.category) : null;
  const workHref = result?.published && result.links.work ? href(locale, result.links.work) : null;

  /* ---------- derived state ---------- */
  const attached = useMemo(
    () =>
      colourways.flatMap((colourway) =>
        EXPORT_FORMATS.filter((format) => colourway.files[format.id]).map((format) => ({
          colourwayId: colourway.id,
          colourwayName: { fa: colourway.nameFa || "رنگ", en: colourway.nameEn || "Colour" },
          hex: sanitizeHex(colourway.hex),
          formatId: format.id,
          file: colourway.files[format.id]!,
        })),
      ),
    [colourways],
  );

  /**
   * Upload order matters: the first file of a work must be a raster delivery
   * file, because every preview, thumbnail and the seamless report is rendered
   * from it. The rest follow in the artist's own order.
   */
  const queue = useMemo(() => {
    const primary = attached.find((item) => item.formatId === "png") ?? attached.find((item) => item.formatId === "jpg");
    if (!primary) return attached;
    return [primary, ...attached.filter((item) => item !== primary)];
  }, [attached]);

  const formatsPresent = useMemo(() => [...new Set(attached.map((item) => item.formatId))], [attached]);
  const ready = Boolean(chosenFamily) && meta.titleFa.trim().length > 0 && queue.length > 0;
  const busy = phase === "uploading";

  const missing = !chosenFamily
    ? fa
      ? "دسته‌بندی اصلی"
      : "main category"
    : !meta.titleFa.trim()
      ? fa
        ? "عنوان فارسی"
        : "Persian title"
      : !queue.length
        ? fa
          ? "حداقل یک فایل (PNG پیشنهاد می‌شود)"
          : "at least one file (PNG recommended)"
        : null;

  /* ---------- colourway editing ---------- */
  const updateColourway = (id: string, patch: Partial<DraftColourway>) =>
    setColourways((current) => current.map((colourway) => (colourway.id === id ? { ...colourway, ...patch } : colourway)));

  const attachFile = (colourwayId: string, formatId: ExportFormatId, file: File) =>
    setColourways((current) =>
      current.map((colourway) => (colourway.id === colourwayId ? { ...colourway, files: { ...colourway.files, [formatId]: file } } : colourway)),
    );

  const detachFile = (colourwayId: string, formatId: ExportFormatId) =>
    setColourways((current) =>
      current.map((colourway) => {
        if (colourway.id !== colourwayId) return colourway;
        const next = { ...colourway.files };
        delete next[formatId];
        return { ...colourway, files: next };
      }),
    );

  const addColourway = (copyFrom?: DraftColourway) =>
    setColourways((current) => [
      ...current,
      copyFrom
        ? {
            ...blankColourway(current.length),
            nameFa: `${copyFrom.nameFa} ۲`,
            nameEn: `${copyFrom.nameEn} 2`,
            hex: COLOUR_PRESETS[(current.length * 3) % COLOUR_PRESETS.length].hex,
          }
        : blankColourway(current.length),
    ]);

  const removeColourway = (id: string) =>
    setColourways((current) => (current.length > 1 ? current.filter((colourway) => colourway.id !== id) : current));

  /* ---------- upload ---------- */
  type QueueItem = (typeof attached)[number];

  /**
   * What already reached the server in this batch, so pressing the button again
   * resumes instead of starting over: the work id (created by the first file) and
   * every file the server confirmed, per slot. A slot whose file was swapped is
   * sent again; changing the work's details starts a fresh work.
   */
  const resume = useRef<{ fingerprint: string; workId: string | null; stored: Map<string, StoredFile> }>({
    fingerprint: "",
    workId: null,
    stored: new Map(),
  });

  const setSlot = useCallback(
    (key: string, patch: Partial<SlotState>) =>
      setSlots((current) => ({ ...current, [key]: { ...(current[key] ?? { state: "queued", percent: 0 }), ...patch } })),
    [],
  );

  /**
   * Sessions of files that failed for good. They are closed on the server so the
   * studio's "unfinished uploads" list does not fill up with dead attempts — right
   * away if the network allows, otherwise at the next attempt. The server refuses
   * (409) to close a session whose completion is still running; those are kept.
   */
  const abandoned = useRef<Set<string>>(new Set());
  const flushAbandoned = useCallback(() => {
    for (const id of [...abandoned.current]) {
      fetch(`/api/marketplace/upload/session?id=${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin", cache: "no-store" })
        .then(async (response) => {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          if (response.ok || response.status === 404 || data.error === "already_completed") abandoned.current.delete(id);
        })
        .catch(() => undefined);
    }
  }, []);

  const sendFile = useCallback(
    async (item: QueueItem, workId: string | null): Promise<StoredFile & { workId: string }> => {
      const key = slotKey(item.colourwayId, item.formatId);
      const onRetry = (attempt: number) =>
        setSlot(key, { note: fa ? `اتصال ناپایدار — تلاش دوباره (${faNum(attempt + 1)})…` : `unstable connection — retry ${attempt + 1}…` });
      const percentOf = (bytes: number) => 4 + Math.round((Math.min(bytes, item.file.size) / Math.max(1, item.file.size)) * 86);

      setSlot(key, { state: "uploading", percent: 1, error: undefined, note: fa ? "محاسبه‌ی چک‌سام…" : "checksumming…" });
      /* the session of the attempt in flight — closed if this file fails for good */
      let openSession: string | null = null;
      const wholeHash = item.file.size <= WHOLE_FILE_HASH_LIMIT ? await sha256Hex(item.file) : null;
      setSlot(key, { percent: 4, note: undefined });

      /* A completion whose answer was lost (or that is still running) must not be
         repeated: wait for the server and adopt the work it built. */
      const waitForCompletion = async (sessionId: string): Promise<ApiBody | null> => {
        setSlot(key, { note: fa ? "در انتظار پایان پردازش روی سرور…" : "waiting for the server to finish…" });
        for (let poll = 0; poll < 120; poll += 1) {
          await sleep(3000);
          const state = await getJson(`/api/marketplace/upload/session?id=${encodeURIComponent(sessionId)}`).catch(() => null);
          const info = state?.session as { status?: string; completing?: boolean; assetId?: string | null } | undefined;
          if (!info) continue;
          if (info.status === "completed" && info.assetId) return { ok: true, asset: { id: info.assetId }, file: null };
          if (info.status === "aborted") throw new UploadError("session_not_found", 404);
          if (!info.completing) return null; // the other attempt failed — complete it ourselves
        }
        throw new UploadError("timeout", 0);
      };

      const complete = async (sessionId: string, run: () => Promise<ApiBody>): Promise<ApiBody> => {
        for (let round = 0; round < 3; round += 1) {
          try {
            return await withRetry(run, { onRetry });
          } catch (error) {
            if (error instanceof UploadError && error.code === "already_completed" && error.detail.assetId) {
              return { ok: true, asset: { id: String(error.detail.assetId) }, file: null };
            }
            if (error instanceof UploadError && error.code === "completing") {
              const adopted = await waitForCompletion(sessionId);
              if (adopted) return adopted;
              continue;
            }
            throw error;
          }
        }
        throw new UploadError("server_error", 500);
      };

      /* One full pass over this file with a fresh session. */
      const attempt = async (): Promise<StoredFile & { workId: string }> => {
        const opened = await withRetry(
          () =>
            postJson("/api/marketplace/upload/session", {
              filename: item.file.name,
              sizeBytes: item.file.size,
              mime: item.file.type || "application/octet-stream",
              sha256: wholeHash ?? undefined,
              title: { fa: meta.titleFa || item.file.name, en: meta.titleEn || item.file.name },
              description: { fa: meta.descriptionFa, en: "" },
              kind: meta.kind,
              familyId: meta.familyId,
              tags: meta.tags
                .split(/[,،]/)
                .map((tag) => tag.trim())
                .filter(Boolean),
              formatId: item.formatId,
              colourwayId: item.colourwayId,
              colourway: { name: item.colourwayName, hex: item.hex },
              attachToAssetId: workId,
            }),
          { onRetry },
        );
        const session = opened.session as SessionInfo | undefined;
        if (!session?.id) throw new UploadError("bad_response", 200);
        openSession = session.id;

        let completed: ApiBody;
        if (session.mode === "single") {
          completed = await complete(session.id, () => {
            const form = new FormData();
            form.set("sessionId", session.id);
            form.set("file", item.file);
            return postForm(session.completeEndpoint, form, (fraction) => setSlot(key, { percent: percentOf(item.file.size * fraction) }));
          });
        } else {
          let sent = 0;
          for (let index = 0; index < session.totalParts; index += 1) {
            const partNumber = index + 1;
            const start = index * session.partSize;
            const chunk = item.file.slice(start, Math.min(start + session.partSize, item.file.size));
            const chunkHash = await sha256Hex(chunk);
            await withRetry(
              async () => {
                const partUrl = session.partUrls?.[index];
                if (partUrl) {
                  const etag = await putChunk(partUrl, chunk);
                  const registered = await postJson(session.partEndpoint ?? "/api/marketplace/upload/part", {
                    sessionId: session.id,
                    partNumber,
                    bytes: chunk.size,
                    etag,
                  });
                  if (Number(registered.bytes) !== chunk.size) throw new UploadError("part_size_mismatch", 422, { partNumber });
                  return;
                }
                const form = new FormData();
                form.set("sessionId", session.id);
                form.set("partNumber", String(partNumber));
                if (chunkHash) form.set("sha256", chunkHash);
                form.set("file", new File([chunk], `${partNumber}.part`));
                const stored = await postForm(session.partEndpoint ?? "/api/marketplace/upload/part", form, (fraction) =>
                  setSlot(key, { percent: percentOf(sent + chunk.size * fraction) }),
                );
                /* the server says how many bytes of this chunk it kept — they must all be there */
                if (Number(stored.bytes) !== chunk.size || (chunkHash && stored.sha256 && stored.sha256 !== chunkHash)) {
                  throw new UploadError("part_corrupted", 422, { partNumber });
                }
              },
              { onRetry },
            );
            sent += chunk.size;
            setSlot(key, { percent: percentOf(sent), note: undefined });
          }
          setSlot(key, { note: fa ? "سرهم‌کردن تکه‌ها و بررسی چک‌سام…" : "assembling chunks & verifying…" });
          completed = await complete(session.id, () => postJson(session.completeEndpoint, { sessionId: session.id }));
        }

        const asset = completed.asset as { id?: string } | undefined;
        const file = completed.file as { sizeBytes?: number; sha256?: string } | null | undefined;
        if (!asset?.id) throw new UploadError("bad_response", 200);
        openSession = null; // completed: nothing to clean up
        /* Trust, but verify: what the server says it stored must be this very file. */
        if (file && file.sizeBytes !== item.file.size) throw new UploadError("size_mismatch", 422);
        if (file && wholeHash && file.sha256 && file.sha256 !== wholeHash) throw new UploadError("checksum_mismatch", 422);
        return {
          workId: asset.id,
          file: item.file,
          colourwayId: session.colourwayId ?? item.colourwayId,
          formatId: item.formatId,
          sizeBytes: item.file.size,
          sha256: wholeHash,
        };
      };

      try {
        let stored: StoredFile & { workId: string };
        try {
          stored = await attempt();
        } catch (error) {
          /* The server refused what arrived (and discarded it): send the file once more from scratch. */
          const restart =
            error instanceof UploadError && ["size_mismatch", "checksum_mismatch", "missing_parts", "session_not_found"].includes(error.code);
          if (!restart) throw error;
          setSlot(key, { percent: 4, note: fa ? "فایل ناقص رسید — ارسال دوباره…" : "arrived incomplete — sending again…" });
          stored = await attempt();
        }
        setSlot(key, { state: "done", percent: 100, note: undefined });
        return stored;
      } catch (error) {
        if (openSession) {
          abandoned.current.add(openSession);
          flushAbandoned();
        }
        const message = describeUploadError(error, locale, { format: formatLabel(item.formatId, locale) });
        setSlot(key, { state: "error", error: message, note: undefined });
        throw new UploadError(error instanceof UploadError ? error.code : "network", error instanceof UploadError ? error.status : 0, {
          message,
        });
      }
    },
    [fa, flushAbandoned, locale, meta, setSlot],
  );

  const problemLabel = useCallback(
    (problem: FinalizeProblem["problem"]) =>
      ({
        missing: fa ? "به سرور نرسید" : "never reached the server",
        size_mismatch: fa ? "ناقص رسید (حجم متفاوت)" : "arrived with a different size",
        checksum_mismatch: fa ? "محتوا با فایل شما یکی نیست" : "contents differ from your file",
        object_missing: fa ? "نسخه‌ی ذخیره‌شده ناقص یا گم شده است" : "stored copy is missing or short",
      })[problem],
    [fa],
  );

  const uploadAll = useCallback(async () => {
    const fingerprint = JSON.stringify(meta);
    if (resume.current.fingerprint !== fingerprint) resume.current = { fingerprint, workId: null, stored: new Map() };
    const state = resume.current;
    const isStored = (item: QueueItem) =>
      Boolean(state.workId) && state.stored.get(slotKey(item.colourwayId, item.formatId))?.file === item.file;

    flushAbandoned(); // the network may be back: close sessions a previous attempt left open
    setPhase("uploading");
    setResult(null);
    setProblems([]);
    setRedirectIn(null);
    setAutoRedirect(true);
    setSlots(
      Object.fromEntries(
        queue.map((item) => [
          slotKey(item.colourwayId, item.formatId),
          isStored(item) ? { state: "done" as const, percent: 100 } : { state: "queued" as const, percent: 0 },
        ]),
      ),
    );

    const totalBytes = Math.max(1, queue.reduce((sum, item) => sum + item.file.size, 0));
    let doneBytes = queue.filter(isStored).reduce((sum, item) => sum + item.file.size, 0);
    setProgress(Math.round((doneBytes / totalBytes) * 95));

    let failure: string | null = null;
    let position = 0;
    for (const item of queue) {
      position += 1;
      if (isStored(item)) continue;
      setStatus(
        fa
          ? `بارگذاری ${formatLabel(item.formatId, "fa")} · رنگ «${item.colourwayName.fa}» — فایل ${faNum(position)} از ${faNum(queue.length)}`
          : `Uploading ${formatLabel(item.formatId, "en")} · «${item.colourwayName.en}» — file ${position} of ${queue.length}`,
      );
      try {
        const sent = await sendFile(item, state.workId);
        state.workId = sent.workId;
        state.stored.set(slotKey(item.colourwayId, item.formatId), {
          file: sent.file,
          colourwayId: sent.colourwayId,
          formatId: sent.formatId,
          sizeBytes: sent.sizeBytes,
          sha256: sent.sha256,
        });
        doneBytes += item.file.size;
        setProgress(Math.round((doneBytes / totalBytes) * 95));
      } catch (error) {
        failure = error instanceof UploadError ? String(error.detail.message ?? error.code) : String(error);
        break;
      }
    }

    if (failure || !state.workId) {
      const kept = queue.filter(isStored).length;
      setPhase("error");
      setStatus(
        (failure ?? (fa ? "بارگذاری کامل نشد." : "The upload did not complete.")) +
          (kept
            ? fa
              ? ` — ${faNum(kept)} از ${faNum(queue.length)} فایل کامل رسیده و محفوظ است. اثر تا رسیدن همه‌ی فایل‌ها خصوصی می‌ماند و منتشر نمی‌شود.`
              : ` — ${kept} of ${queue.length} files arrived intact and are kept. The work stays private until every file has arrived.`
            : ""),
      );
      if (state.workId) onUploaded?.();
      return;
    }

    /* ---------- the server checks the whole batch, then publishes ---------- */
    setStatus(fa ? "بررسی نهایی: مقایسه‌ی همه‌ی فایل‌ها با نسخه‌ی ذخیره‌شده روی سرور…" : "Final check: comparing every file with what the server stored…");
    const manifest = queue.map((item) => {
      const stored = state.stored.get(slotKey(item.colourwayId, item.formatId))!;
      return { colourwayId: stored.colourwayId, formatId: stored.formatId, sizeBytes: stored.sizeBytes, sha256: stored.sha256 };
    });
    try {
      const data = (await withRetry(() => postJson("/api/marketplace/upload/finalize", { assetId: state.workId, files: manifest }))) as unknown as FinalizeResponse;
      setResult(data);
      setPhase("done");
      setProgress(100);
      setStatus("");
      resume.current = { fingerprint: "", workId: null, stored: new Map() };
      onUploaded?.();
    } catch (error) {
      if (error instanceof UploadError && error.code === "incomplete_upload") {
        const list = (Array.isArray(error.detail.problems) ? error.detail.problems : []) as FinalizeProblem[];
        const lines: string[] = [];
        for (const problem of list) {
          const item = queue.find(
            (candidate) =>
              candidate.formatId === problem.formatId &&
              (state.stored.get(slotKey(candidate.colourwayId, candidate.formatId))?.colourwayId ?? candidate.colourwayId) === problem.colourwayId,
          );
          const name = item ? `${item.colourwayName[locale] ?? item.colourwayName.fa} · ${formatLabel(problem.formatId as ExportFormatId, locale)}` : problem.formatId;
          lines.push(`${name}: ${problemLabel(problem.problem)}`);
          if (item) {
            const key = slotKey(item.colourwayId, item.formatId);
            state.stored.delete(key); // re-sent on resume
            setSlot(key, { state: "error", percent: 0, error: problemLabel(problem.problem) });
          }
        }
        setProblems(lines);
        setStatus(
          fa
            ? `سرور ${faNum(list.length)} فایل را کامل دریافت نکرده است؛ اثر خصوصی ماند و منتشر نشد. «ادامه‌ی آپلود» را بزنید تا فقط همین فایل‌ها دوباره فرستاده شوند.`
            : `The server did not receive ${list.length} file(s) intact; the work stayed private. Press “Resume upload” to re-send just those files.`,
        );
      } else {
        setStatus(describeUploadError(error, locale));
      }
      setPhase("error");
      onUploaded?.();
    }
  }, [fa, flushAbandoned, locale, meta, onUploaded, problemLabel, queue, sendFile, setSlot]);

  /** Clears the form for the next work (the category is kept — artists often upload a series). */
  const startAnother = () => {
    flushAbandoned();
    resume.current = { fingerprint: "", workId: null, stored: new Map() };
    setMeta((current) => ({ ...BLANK_META, familyId: current.familyId }));
    setColourways([blankColourway(0)]);
    setSlots({});
    setResult(null);
    setProblems([]);
    setProgress(0);
    setStatus("");
    setRedirectIn(null);
    setAutoRedirect(true);
    setPhase("idle");
  };

  /* A published work: take the artist to its category, where it now appears. */
  useEffect(() => {
    if (!categoryHref || phase !== "done" || !autoRedirect) {
      setRedirectIn(null);
      return;
    }
    setRedirectIn(8);
    const tick = setInterval(() => setRedirectIn((value) => (value === null ? null : Math.max(0, value - 1))), 1000);
    const jump = setTimeout(() => router.push(categoryHref), 8000);
    return () => {
      clearInterval(tick);
      clearTimeout(jump);
    };
  }, [autoRedirect, categoryHref, phase, router]);

  /* After a failure, files the server already confirmed are not sent again. */
  const keptFiles = phase === "error" ? queue.filter((item) => slots[slotKey(item.colourwayId, item.formatId)]?.state === "done").length : 0;
  const resumable = keptFiles > 0;
  const remainingFiles = queue.length - keptFiles;


  return (
    <div className="space-y-6">
      {/* ---------- 1. category ---------- */}
      <Field
        label={fa ? "دسته‌بندی اصلی محصول" : "Main product category"}
        hint={
          autoPublish === false
            ? fa
              ? "اثر شما پس از تأیید مدیر، زیر همین دسته در فروشگاه نمایش داده می‌شود."
              : "Once an admin approves it, your work appears under this category in the shop."
            : autoPublish
              ? fa
                ? "اثر شما پس از آپلود کامل همه‌ی فایل‌ها، زیر همین دسته در فروشگاه منتشر می‌شود و همین دسته برایتان باز می‌شود."
                : "Once every file has arrived, your work is published under this category in the shop — and the category opens for you."
              : fa
                ? "اثر شما زیر همین دسته در فروشگاه دسته‌بندی می‌شود."
                : "Your work is filed under this category in the shop."
        }
      >
        <div
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          role="radiogroup"
          aria-label={fa ? "دسته‌بندی اصلی محصول" : "Main product category"}
        >
          {PRODUCT_FAMILIES.map((family) => {
            const active = meta.familyId === family.id;
            return (
              <button
                key={family.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMeta({ ...meta, familyId: family.id })}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-start transition-all duration-200",
                  active ? "border-accent bg-accent/10 shadow-soft" : "border-border bg-surface hover:border-foreground/40",
                )}
              >
                <span className="min-w-0">
                  <span className={cn("block truncate text-[13px]", active ? "font-semibold text-foreground" : "text-foreground-secondary")}>
                    {family.name[locale] ?? family.name.fa}
                  </span>
                  <span className="block truncate text-[11px] text-muted" dir="ltr">
                    {family.name.en}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active ? "border-accent bg-accent text-white" : "border-border",
                  )}
                >
                  {active && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* ---------- 2. metadata ---------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={fa ? "عنوان اثر (فارسی)" : "Title (Persian)"}>
          <Input value={meta.titleFa} onChange={(event) => setMeta({ ...meta, titleFa: event.target.value })} placeholder="الگوی اسلیمی" />
        </Field>
        <Field label={fa ? "عنوان (انگلیسی)" : "Title (English)"}>
          <Input value={meta.titleEn} onChange={(event) => setMeta({ ...meta, titleEn: event.target.value })} placeholder="Arabesque pattern" dir="ltr" />
        </Field>
        <Field label={fa ? "نوع اثر" : "Kind"}>
          <select
            value={meta.kind}
            onChange={(event) => setMeta({ ...meta, kind: event.target.value })}
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="pattern">{fa ? "الگو" : "Pattern"}</option>
            <option value="illustration">{fa ? "تصویرسازی" : "Illustration"}</option>
            <option value="photo">{fa ? "عکس" : "Photo"}</option>
            <option value="vector">{fa ? "وکتور" : "Vector"}</option>
            <option value="template">{fa ? "قالب" : "Template"}</option>
            <option value="font">{fa ? "فونت" : "Font"}</option>
          </select>
        </Field>
        <Field label={fa ? "برچسب‌ها (با ویرگول)" : "Tags (comma separated)"}>
          <Input value={meta.tags} onChange={(event) => setMeta({ ...meta, tags: event.target.value })} placeholder="arabesque, persian" />
        </Field>
      </div>

      {/* ---------- 3. colourways ---------- */}
      <section className="rounded-2xl border border-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-h4">
              <Palette className="h-4 w-4 text-accent" />
              {fa ? "رنگ‌بندی‌های طرح" : "Colourways"}
            </h3>
            <p className="mt-1 text-caption text-foreground-secondary">
              {fa
                ? "از هر طرح چند رنگ بسازید؛ هر رنگ نام، سواچ و فایل‌های خودش را دارد و در فروشگاه هم جدا نمایش داده می‌شود."
                : "Ship several colours of one design — each with its own name, swatch and files, shown separately in the shop."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => addColourway()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-caption hover:border-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            {fa ? "افزودن رنگ" : "Add colour"}
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {colourways.map((colourway, index) => (
            <article key={colourway.id} className="rounded-xl border border-border bg-surface/60 p-4">
              <div className="flex flex-wrap items-start gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-[11px] font-bold"
                  style={{ background: sanitizeHex(colourway.hex), color: contrastingInk(colourway.hex) }}
                  aria-hidden
                >
                  {colourway.hex.replace("#", "").slice(0, 3).toUpperCase()}
                </span>

                <div className="grid min-w-[16rem] flex-1 gap-3 sm:grid-cols-2">
                  <Field label={fa ? `نام رنگ ${faNum(index + 1)}` : `Colour ${index + 1} name`}>
                    <Input
                      value={colourway.nameFa}
                      onChange={(event) => updateColourway(colourway.id, { nameFa: event.target.value })}
                      placeholder={fa ? "آبی نفتی" : "Teal"}
                    />
                  </Field>
                  <Field label={fa ? "نام انگلیسی" : "English name"}>
                    <Input
                      value={colourway.nameEn}
                      onChange={(event) => updateColourway(colourway.id, { nameEn: event.target.value })}
                      placeholder="Teal"
                      dir="ltr"
                    />
                  </Field>
                </div>

                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`hex-${colourway.id}`}>
                    {fa ? "سواچ رنگ" : "Colour swatch"}
                  </label>
                  <input
                    id={`hex-${colourway.id}`}
                    type="color"
                    value={sanitizeHex(colourway.hex)}
                    onChange={(event) => updateColourway(colourway.id, { hex: event.target.value })}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-transparent"
                  />
                  <Input
                    value={colourway.hex}
                    onChange={(event) => updateColourway(colourway.id, { hex: event.target.value })}
                    className="w-24"
                    dir="ltr"
                    aria-label={fa ? "کد رنگ" : "Hex code"}
                  />
                  <button
                    type="button"
                    title={fa ? "کپی این رنگ" : "Duplicate this colour"}
                    onClick={() => addColourway(colourway)}
                    className="rounded-full border border-border p-2 hover:border-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title={fa ? "حذف رنگ" : "Remove colour"}
                    disabled={colourways.length === 1}
                    onClick={() => removeColourway(colourway.id)}
                    className="rounded-full border border-border p-2 hover:border-error hover:text-error disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {COLOUR_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    title={preset.name[locale] ?? preset.name.fa}
                    aria-label={preset.name[locale] ?? preset.name.fa}
                    onClick={() => updateColourway(colourway.id, { hex: preset.hex })}
                    className={cn(
                      "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                      sanitizeHex(colourway.hex) === preset.hex ? "border-foreground ring-2 ring-accent/40" : "border-border",
                    )}
                    style={{ background: preset.hex }}
                  />
                ))}
              </div>

              {/* per-format slots */}
              <div className="mt-4 space-y-3">
                {(["delivery", "cover", "source"] as const).map((group) => (
                  <div key={group}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {GROUP_TITLE[group][locale] ?? GROUP_TITLE[group].fa}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {EXPORT_FORMATS.filter((format) => format.group === group).map((format) => {
                        const file = colourway.files[format.id];
                        const key = slotKey(colourway.id, format.id);
                        const slot = slots[key];
                        return (
                          <div
                            key={format.id}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDragging(key);
                            }}
                            onDragLeave={() => setDragging((current) => (current === key ? null : current))}
                            onDrop={(event) => {
                              event.preventDefault();
                              setDragging(null);
                              const dropped = event.dataTransfer.files?.[0];
                              if (!dropped) return;
                              if (formatAcceptsUpload(format.id, dropped.name, dropped.type)) attachFile(colourway.id, format.id, dropped);
                              else setSlots((current) => ({ ...current, [key]: { state: "error", percent: 0, error: fa ? "نوع فایل با این اسلات نمی‌خواند." : "This file does not match the slot." } }));
                            }}
                            className={cn(
                              "rounded-xl border p-3 transition-colors",
                              file ? "border-accent/50 bg-accent/5" : "border-dashed border-border",
                              dragging === key && "border-accent bg-accent/10",
                              slot?.state === "error" && "border-error/50 bg-error/5",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[13px] font-medium">{formatLabel(format.id, locale)}</span>
                              {file ? (
                                slot?.state === "uploading" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
                                ) : slot?.state === "done" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                ) : slot?.state === "error" ? (
                                  <AlertTriangle className="h-3.5 w-3.5 text-error" />
                                ) : (
                                  <button
                                    type="button"
                                    aria-label={fa ? "حذف فایل" : "Remove file"}
                                    onClick={() => detachFile(colourway.id, format.id)}
                                    className="text-muted hover:text-error"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] uppercase text-muted" dir="ltr">
                                  .{format.ext}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-foreground-secondary">
                              {format.hint[locale] ?? format.hint.fa}
                            </p>

                            {file ? (
                              <p className="mt-2 truncate text-[11px] text-foreground-secondary" dir="ltr">
                                {file.name} · {fileSize(file.size)}
                              </p>
                            ) : (
                              <button
                                type="button"
                                onClick={() => inputs.current[key]?.click()}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[11px] hover:border-foreground"
                              >
                                <FileUp className="h-3 w-3" />
                                {format.recommended ? (fa ? "افزودن (پیشنهادی)" : "Attach (recommended)") : fa ? "افزودن" : "Attach"}
                              </button>
                            )}

                            <input
                              ref={(element) => {
                                inputs.current[key] = element;
                              }}
                              type="file"
                              accept={FORMAT_ACCEPT[format.id]}
                              className="hidden"
                              onChange={(event) => {
                                const picked = event.target.files?.[0];
                                if (picked) attachFile(colourway.id, format.id, picked);
                                event.target.value = "";
                              }}
                            />

                            {slot?.state === "error" && slot.error && (
                              <p className="mt-2 text-[11px] text-error">{slot.error}</p>
                            )}
                            {slot?.state === "uploading" && (
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-background-secondary">
                                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${slot.percent}%` }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- 4. summary + submit ---------- */}
      <div className="rounded-2xl border border-border bg-background-secondary/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-caption text-foreground-secondary">
          <span className="inline-flex items-center gap-2">
            <UploadCloud className="h-4 w-4 text-accent" />
            {fa
              ? `${faNum(colourways.length)} رنگ · ${faNum(attached.length)} فایل · فرمت‌ها: ${formatsPresent.map((id) => formatLabel(id, "fa")).join(" · ") || "—"}`
              : `${colourways.length} colour(s) · ${attached.length} file(s) · formats: ${formatsPresent.map((id) => formatLabel(id, "en")).join(" · ") || "—"}`}
          </span>
          {attached.length > 0 && (
            <span dir="ltr" className="text-muted">
              {fileSize(attached.reduce((total, item) => total + item.file.size, 0))}
            </span>
          )}
        </div>

        {attached.length > 0 && (
          <ul className="mt-3 grid gap-1.5 text-[11px] text-foreground-secondary sm:grid-cols-2">
            {attached.map((item) => {
              const slot = slots[slotKey(item.colourwayId, item.formatId)];
              return (
                <li key={slotKey(item.colourwayId, item.formatId)} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full border border-border" style={{ background: item.hex }} aria-hidden />
                  <span className="truncate">
                    {(item.colourwayName[locale] ?? item.colourwayName.fa) + " · " + formatLabel(item.formatId, locale)}
                  </span>
                  <span
                    className={cn(
                      "ms-auto shrink-0",
                      slot?.state === "done" ? "text-success" : slot?.state === "error" ? "text-error" : "text-muted",
                    )}
                    title={slot?.error}
                  >
                    {slot?.state === "done"
                      ? fa
                        ? "کامل رسید ✓"
                        : "arrived intact ✓"
                      : slot?.state === "uploading"
                        ? slot.note ?? `${faNum(slot.percent)}٪`
                        : slot?.state === "error"
                          ? fa
                            ? "ناموفق"
                            : "failed"
                          : fa
                            ? "در صف"
                            : "queued"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {busy && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-background-secondary">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 flex items-center gap-2 text-caption text-foreground-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {status || (fa ? "در حال بارگذاری…" : "Uploading…")}
          </p>
        </div>
      )}

      {phase === "done" && result && (
        <div
          className={cn(
            "rounded-xl border p-4 text-sm",
            result.published ? "border-success/40 bg-success/5" : "border-accent/40 bg-accent/5",
          )}
          role="status"
        >
          <p className={cn("flex items-center gap-2 font-medium", result.published ? "text-success" : "text-accent")}>
            {result.published ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Clock3 className="h-4 w-4 shrink-0" />}
            {result.published
              ? fa
                ? "اثر شما کامل آپلود شد و در فروشگاه منتشر شد."
                : "Your work is fully uploaded and live in the shop."
              : result.reason === "suspicious_file"
                ? fa
                  ? "همه‌ی فایل‌ها کامل رسید، اما اسکنر امنیتی یکی از آن‌ها را مشکوک دانست؛ اثر تا بررسی مدیر خصوصی می‌ماند."
                  : "Every file arrived, but the security scanner flagged one — the work stays private until an admin checks it."
                : result.reason === "hidden_by_admin"
                  ? fa
                    ? "همه‌ی فایل‌ها کامل رسید. این اثر را مدیر پنهان کرده و تا تصمیم او منتشر نمی‌شود."
                    : "Every file arrived. An admin has hidden this work, so it stays unpublished."
                  : result.reason === "rejected"
                    ? fa
                      ? "همه‌ی فایل‌ها کامل رسید، اما این اثر قبلاً رد شده است."
                      : "Every file arrived, but this work was rejected earlier."
                    : fa
                      ? "همه‌ی فایل‌ها کامل رسید و تأیید شد؛ اثر در صف بازبینی مدیر است."
                      : "Every file arrived and was verified — the work is in the admin's review queue."}
          </p>
          <ul className="mt-2 space-y-1 text-caption text-foreground-secondary">
            <li>
              {fa
                ? /* ⁦…⁩ isolates the LTR size so it does not read “MB 6.9” in RTL */
                  `${faNum(result.verified.files)} فایل در ${faNum(queuedColourwayCount(queue))} رنگ (\u2066${fileSize(result.verified.bytes)}\u2069) — حجم و چک‌سام همه با فایل‌های شما تطبیق داده شد.`
                : `${result.verified.files} file(s) in ${queuedColourwayCount(queue)} colour(s) (${fileSize(result.verified.bytes)}) — every size and checksum matched your files.`}
            </li>
            <li>
              {fa ? "کد اثر" : "Asset"}: <span dir="ltr">{result.asset.id}</span>
            </li>
            {(result.family ?? chosenFamily) && (
              <li>
                {fa ? "دسته‌بندی" : "Category"}:{" "}
                <span className="font-medium text-foreground">
                  {(result.family ?? chosenFamily)!.name[locale] ?? (result.family ?? chosenFamily)!.name.fa}
                </span>
              </li>
            )}
            <li>
              {fa ? "فرمت‌ها: " : "Formats: "}
              {formatsPresent.map((id) => formatLabel(id, locale)).join(" · ")}
            </li>
            <li>
              {result.published
                ? fa
                  ? "خریداران اکنون اثر را با همین رنگ‌ها و فرمت‌ها می‌بینند و پس از خرید همه‌ی فایل‌ها را از پنل خود دانلود می‌کنند."
                  : "Buyers now see the work with exactly these colours and formats, and download every file from their account after purchase."
                : fa
                  ? "پس از تأیید مدیر، اثر زیر همین دسته در فروشگاه نمایش داده می‌شود؛ وضعیت آن را در «آثار من» ببینید."
                  : "Once an admin approves it, the work appears under this category in the shop — follow it in “My works”."}
            </li>
          </ul>

          <div
            className={cn(
              "mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3",
              result.published ? "border-success/20" : "border-accent/20",
            )}
          >
            {workHref && (
              <Link
                href={workHref}
                className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-caption font-semibold text-background"
              >
                {fa ? "مشاهده‌ی اثر در فروشگاه" : "View the work in the shop"}
              </Link>
            )}
            {categoryHref && (
              <Link
                href={categoryHref}
                className="inline-flex items-center gap-1 text-caption font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                {fa
                  ? `مشاهده در دسته‌ی «${result.family?.name.fa ?? chosenFamily?.name.fa ?? ""}»`
                  : `See it in “${result.family?.name.en ?? chosenFamily?.name.en ?? ""}”`}
              </Link>
            )}
            {!result.published && onViewWorks && (
              <button
                type="button"
                onClick={onViewWorks}
                className="rounded-full border border-border px-3 py-1.5 text-caption font-semibold text-foreground"
              >
                {fa ? "مشاهده در «آثار من»" : "Open “My works”"}
              </button>
            )}
            <button
              type="button"
              onClick={startAnother}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-caption text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {fa ? "آپلود اثر دیگر" : "Upload another work"}
            </button>
          </div>

          {categoryHref && autoRedirect && redirectIn !== null && (
            <p className="mt-2 text-caption text-foreground-secondary">
              {fa
                ? `انتقال خودکار به دسته‌بندی در ${faNum(redirectIn)} ثانیه… `
                : `Opening the category in ${redirectIn}s… `}
              <button type="button" onClick={() => setAutoRedirect(false)} className="underline underline-offset-4">
                {fa ? "ماندن در همین صفحه" : "Stay here"}
              </button>
            </p>
          )}
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-xl bg-error/10 p-4 text-caption text-error" role="alert">
          <p className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{status}</span>
          </p>
          {problems.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 ps-8">
              {problems.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {phase !== "done" && (
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => void uploadAll()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : resumable ? (
            <RotateCcw className="h-4 w-4" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {busy
            ? fa
              ? "در حال بارگذاری امن…"
              : "Uploading securely…"
            : resumable
              ? fa
                ? `ادامه‌ی آپلود (${faNum(remainingFiles)} فایل باقی‌مانده)`
                : `Resume upload (${remainingFiles} file(s) left)`
              : autoPublish === false
                ? attached.length > 1
                  ? fa
                    ? `بارگذاری امن ${faNum(attached.length)} فایل و ارسال برای بازبینی`
                    : `Upload ${attached.length} files securely & submit for review`
                  : fa
                    ? "بارگذاری امن و ارسال برای بازبینی"
                    : "Upload securely & submit for review"
                : attached.length > 1
                  ? fa
                    ? `بارگذاری امن ${faNum(attached.length)} فایل و انتشار در فروشگاه`
                    : `Upload ${attached.length} files securely & publish`
                  : fa
                    ? "بارگذاری امن و انتشار در فروشگاه"
                    : "Upload securely & publish"}
        </button>
      )}

      {missing && !busy && (
        <p className="text-center text-caption text-muted">
          {fa ? `برای ارسال، این مورد لازم است: ${missing}` : `Required before submitting: ${missing}`}
        </p>
      )}

      <p className="text-center text-caption text-muted">
        {fa
          ? "فرمت‌های پشتیبانی‌شده: PNG · JPG · تصویر پیش‌نمایش · AI · PSD · SVG · EPS — فایل خام و بدون واترمارک."
          : "Supported formats: PNG · JPG · preview image · AI · PSD · SVG · EPS — the clean, un-watermarked originals."}
      </p>
    </div>
  );
}

function queuedColourwayCount(queue: { colourwayId: string }[]): number {
  return new Set(queue.map((item) => item.colourwayId)).size;
}
