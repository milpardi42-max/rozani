"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FileUp,
  Loader2,
  Palette,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Field, Input } from "@/components/ui/Input";
import { SESSION_FETCH } from "@/lib/http";
import { PRODUCT_FAMILIES, familyById } from "@/lib/data/families";
import {
  EXPORT_FORMATS,
  formatAcceptsUpload,
  formatLabel,
  type ExportFormat,
  type ExportFormatId,
} from "@/lib/marketplace/formats";
import { COLOUR_PRESETS, contrastingInk, sanitizeHex } from "@/lib/marketplace/colourways";
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
}

interface UploadResult {
  ok: boolean;
  asset?: {
    id: string;
    slug: string;
    status: string;
    title?: { fa: string; en: string };
    previewKey?: string;
    tileKey?: string;
    mockups: number;
    seamless: { verdict: string; score: number };
    scan: { engine: string; status: string; threats: { id: string; label: { fa: string; en: string } }[] };
    master: { filename: string; sizeBytes: number; sha256: string };
    formats?: string[];
    colourways?: number;
  };
  error?: string;
  message?: string;
  detail?: string;
  formatId?: string;
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
type SlotState = { state: "queued" | "uploading" | "done" | "error"; percent: number; error?: string };

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

export function MasterUploader({ onUploaded }: { onUploaded?: () => void }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [slots, setSlots] = useState<Record<string, SlotState>>({});
  const [result, setResult] = useState<UploadResult | null>(null);
  const [redirectIn, setRedirectIn] = useState<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const [meta, setMeta] = useState({
    titleFa: "",
    titleEn: "",
    kind: "pattern",
    tags: "",
    descriptionFa: "",
    /* The real product category — required, see `lib/data/families.ts`. */
    familyId: "",
  });
  const [colourways, setColourways] = useState<DraftColourway[]>([blankColourway(0)]);

  const chosenFamily = familyById(meta.familyId);
  const categoryHref = chosenFamily ? `${href(locale, "/shop")}?family=${chosenFamily.slug}` : null;

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
  const coloursWithFiles = useMemo(
    () => colourways.filter((colourway) => Object.keys(colourway.files).length > 0).length,
    [colourways],
  );
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
  const sendFile = useCallback(
    async (item: (typeof attached)[number], workId: string | null): Promise<{ workId: string | null; result: UploadResult }> => {
      const key = slotKey(item.colourwayId, item.formatId);
      const setSlot = (patch: Partial<SlotState>) =>
        setSlots((current) => ({ ...current, [key]: { ...(current[key] ?? { state: "queued", percent: 0 }), ...patch } }));

      setSlot({ state: "uploading", percent: 4, error: undefined });

      const sessionResponse = await fetch("/api/marketplace/upload/session", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: item.file.name,
          sizeBytes: item.file.size,
          mime: item.file.type || "application/octet-stream",
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
      });
      const sessionData = (await sessionResponse.json()) as {
        ok?: boolean;
        error?: string;
        session?: SessionInfo;
        limits?: { maxBytes: number };
      };
      if (!sessionData.ok || !sessionData.session) {
        const message =
          sessionData.error === "unsupported_type"
            ? fa
              ? `فایل انتخاب‌شده با فرمت ${formatLabel(item.formatId, "fa")} نمی‌خواند.`
              : `The file does not match the ${formatLabel(item.formatId, "en")} slot.`
            : sessionData.error === "raster_required"
              ? fa
                ? "اولین فایل هر اثر باید PNG یا JPG باشد."
                : "The first file of a work must be PNG or JPG."
              : sessionData.error === "file_too_large"
                ? fa
                  ? `حجم فایل بیش از حد مجاز است (حداکثر ${Math.round((sessionData.limits?.maxBytes ?? 0) / 1024 / 1024)} مگابایت).`
                  : `File is too large (max ${Math.round((sessionData.limits?.maxBytes ?? 0) / 1024 / 1024)} MB).`
                : sessionData.error === "file_too_small"
                  ? fa
                    ? "این فایل خالی یا ناقص است."
                    : "This file looks empty or truncated."
                  : sessionData.error === "invalid_signature"
                    ? fa
                      ? "محتوای فایل با فرمت انتخابی نمی‌خواند (فایل واقعی آن فرمت نیست)."
                      : "The file's contents are not really in this format."
                    : sessionData.error ?? "session_failed";
        setSlot({ state: "error", error: message });
        throw new Error(message);
      }

      const session = sessionData.session;

      if (session.mode === "single") {
        const form = new FormData();
        form.set("sessionId", session.id);
        form.set("file", item.file);
        setSlot({ percent: 45 });
        const response = await fetch(session.completeEndpoint, { ...SESSION_FETCH, method: "POST", body: form });
        const data = (await response.json()) as UploadResult;
        if (!data.ok) {
          setSlot({ state: "error", error: data.error ?? "upload_failed" });
          throw new Error(data.error ?? "upload_failed");
        }
        setSlot({ state: "done", percent: 100 });
        return { workId: data.asset?.id ?? workId, result: data };
      }

      /* ---------- chunked ---------- */
      const total = session.totalParts;
      let sentBytes = 0;
      for (let index = 0; index < total; index += 1) {
        const partNumber = index + 1;
        const start = index * session.partSize;
        const chunk = item.file.slice(start, Math.min(start + session.partSize, item.file.size));

        if (session.partUrls?.[index]) {
          const put = await fetch(session.partUrls[index], { method: "PUT", body: chunk });
          if (!put.ok) throw new Error(`s3_part_${partNumber}_${put.status}`);
          await fetch(session.partEndpoint ?? "/api/marketplace/upload/part", {
            ...SESSION_FETCH,
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId: session.id, partNumber, bytes: chunk.size, etag: put.headers.get("etag") ?? "" }),
          });
        } else {
          const form = new FormData();
          form.set("sessionId", session.id);
          form.set("partNumber", String(partNumber));
          form.set("file", new File([chunk], `${partNumber}.part`));
          const response = await fetch(session.partEndpoint ?? "/api/marketplace/upload/part", {
            ...SESSION_FETCH,
            method: "POST",
            body: form,
          });
          if (!response.ok) {
            const problem = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(problem.error ?? `part_${partNumber}_failed`);
          }
        }
        sentBytes += chunk.size;
        setSlot({ percent: Math.min(92, Math.round((sentBytes / item.file.size) * 100)) });
      }

      const completeResponse = await fetch(session.completeEndpoint, {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: session.id }),
      });
      const completeData = (await completeResponse.json()) as UploadResult;
      if (!completeData.ok) {
        setSlot({ state: "error", error: completeData.error ?? "complete_failed" });
        throw new Error(completeData.error ?? "complete_failed");
      }
      setSlot({ state: "done", percent: 100 });
      return { workId: completeData.asset?.id ?? workId, result: completeData };
    },
    [fa, meta],
  );

  const uploadAll = useCallback(async () => {
    setPhase("uploading");
    setResult(null);
    setSlots(
      Object.fromEntries(queue.map((item) => [slotKey(item.colourwayId, item.formatId), { state: "queued" as const, percent: 0 }])),
    );
    setProgress(0);

    let workId: string | null = null;
    let done = 0;
    let failure: string | null = null;
    let last: UploadResult | null = null;

    for (const item of queue) {
      setStatus(
        fa
          ? `بارگذاری ${formatLabel(item.formatId, "fa")} · رنگ «${item.colourwayName.fa}» — فایل ${faNum(done + 1)} از ${faNum(queue.length)}`
          : `Uploading ${formatLabel(item.formatId, "en")} · «${item.colourwayName.en}» — file ${done + 1} of ${queue.length}`,
      );
      try {
        const sent = await sendFile(item, workId);
        workId = sent.workId;
        last = sent.result;
        done += 1;
        setProgress(Math.round((done / queue.length) * 100));
      } catch (error) {
        failure = String(error).slice(0, 200);
        break;
      }
    }

    if (failure || !workId) {
      setPhase("error");
      setStatus(failure ?? (fa ? "بارگذاری کامل نشد." : "The upload did not complete."));
      return;
    }

    setResult(
      last
        ? {
            ...last,
            asset: last.asset ? { ...last.asset, formats: formatsPresent, colourways: coloursWithFiles } : last.asset,
          }
        : null,
    );
    setPhase("done");
    setProgress(100);
    setStatus("");
    onUploaded?.();
  }, [coloursWithFiles, fa, formatsPresent, onUploaded, queue, sendFile]);

  /* The artist lands on the category they picked — their new work is filed there. */
  useEffect(() => {
    if (!categoryHref || phase !== "done") return;
    setRedirectIn(5);
    const tick = setInterval(() => setRedirectIn((value) => (value === null ? null : Math.max(0, value - 1))), 1000);
    const jump = setTimeout(() => router.push(categoryHref), 5000);
    return () => {
      clearInterval(tick);
      clearTimeout(jump);
    };
  }, [categoryHref, phase, router]);

  const uploadedFiles = Object.values(slots).filter((slot) => slot.state === "done").length;

  return (
    <div className="space-y-6">
      {/* ---------- 1. category ---------- */}
      <Field
        label={fa ? "دسته‌بندی اصلی محصول" : "Main product category"}
        hint={
          fa
            ? "محصول شما زیر همین دسته در فروشگاه دسته‌بندی می‌شود؛ بعد از ثبت، همین دسته باز می‌شود."
            : "Your product is filed under this category in the shop — it opens right after the upload."
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
                  <span className="ms-auto shrink-0 text-muted">
                    {slot?.state === "done"
                      ? fa
                        ? "ذخیره شد"
                        : "stored"
                      : slot?.state === "uploading"
                        ? `${faNum(slot.percent)}٪`
                        : slot?.state === "error"
                          ? fa
                            ? "خطا"
                            : "error"
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

      {phase === "done" && result?.asset && (
        <div className="rounded-xl border border-success/40 bg-success/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-success">
            <CheckCircle2 className="h-4 w-4" />
            {fa
              ? `${faNum(uploadedFiles)} فایل در ${faNum(queuedColourwayCount(queue))} رنگ ثبت شد و در صف بازبینی است.`
              : `${uploadedFiles} file(s) across ${queuedColourwayCount(queue)} colour(s) uploaded — now in the review queue.`}
          </p>
          <ul className="mt-2 space-y-1 text-caption text-foreground-secondary">
            <li>
              {fa ? "کد اثر" : "Asset"}: <span dir="ltr">{result.asset.id}</span>
            </li>
            {chosenFamily && (
              <li>
                {fa ? "دسته‌بندی" : "Category"}:{" "}
                <span className="font-medium text-foreground">{chosenFamily.name[locale] ?? chosenFamily.name.fa}</span>
              </li>
            )}
            <li>
              {fa ? "فرمت‌های ثبت‌شده: " : "Formats: "}
              {formatsPresent.map((id) => formatLabel(id, locale)).join(" · ")}
            </li>
            <li>
              {fa
                ? "پس از تأیید مدیر، اثر با همین رنگ‌ها و فرمت‌ها در فروشگاه عرضه می‌شود و خریدار همهٔ فایل‌ها را از پنل خود دانلود می‌کند."
                : "Once an admin approves it, the work goes on sale with exactly these colours and formats, and every file is downloadable from the buyer's account."}
            </li>
          </ul>

          {categoryHref && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-success/20 pt-3">
              <Link
                href={categoryHref}
                className="inline-flex items-center gap-1 text-caption font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline"
              >
                {fa ? "مشاهده دسته‌بندی در فروشگاه" : "Open the category in the shop"}
              </Link>
              <span className="text-caption text-foreground-secondary">
                {redirectIn === null
                  ? fa
                    ? "به‌زودی به همین دسته منتقل می‌شوید."
                    : "Taking you to this category in a moment."
                  : fa
                    ? `انتقال خودکار به دسته‌بندی در ${faNum(redirectIn)} ثانیه…`
                    : `Opening the category in ${redirectIn}s…`}
              </span>
            </div>
          )}
        </div>
      )}

      {phase === "error" && (
        <p className="flex items-center gap-2 rounded-xl bg-error/10 p-4 text-caption text-error">
          <AlertTriangle className="h-4 w-4" />
          {status}
        </p>
      )}

      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void uploadAll()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {busy
          ? fa
            ? "در حال بارگذاری امن…"
            : "Uploading securely…"
          : attached.length > 1
            ? fa
              ? `بارگذاری امن ${faNum(attached.length)} فایل و ارسال برای بازبینی`
              : `Upload ${attached.length} files securely & submit for review`
            : fa
              ? "بارگذاری امن و ارسال برای بازبینی"
              : "Upload securely & submit for review"}
      </button>

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
