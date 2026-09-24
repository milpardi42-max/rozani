"use client";

import Link from "next/link";
import { Lock, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, faNum, href, t } from "@/lib/utils";
import type { CourseVideoFile } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";

export interface AcademyVideoEntry {
  video: CourseVideoFile;
  courseSlug: string;
  courseTitle: CourseVideoFile["title"];
  /** Video of the featured course the hero already plays — not repeated here. */
  skip?: boolean;
}

/**
 * Every lesson video the admin uploaded, played for real.
 *
 * Free videos (the ones flagged as preview in the panel) stream inline; paid ones
 * stay behind the course page, which is where access is granted.
 */
export function VideoGrid({ entries, poster }: { entries: AcademyVideoEntry[]; poster?: string }) {
  const { locale } = useLocale();
  const fa = locale === "fa";
  const [active, setActive] = useState<string | null>(entries[0]?.video.id ?? null);
  const current = entries.find((entry) => entry.video.id === active) ?? entries[0];

  if (!entries.length) return null;
  const playable = entries.filter((entry) => entry.video.free !== false);
  if (!playable.length) return null;

  const meta = (entry: AcademyVideoEntry) =>
    [entry.video.durationSec ? duration(entry.video.durationSec, locale) : null, sizeLabel(entry.video.sizeBytes, locale)]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        {current && (
          <div className="overflow-hidden rounded-2xl border border-border bg-[#0c1018]">
            <video
              key={current.video.url}
              src={current.video.url}
              poster={poster}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full bg-black"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t(current.video.title, locale)}</p>
                <p className="text-caption text-white/55">
                  {t(current.courseTitle, locale)} · {meta(current)}
                </p>
              </div>
              <Link
                href={href(locale, `/academy/${current.courseSlug}`)}
                className="shrink-0 rounded-full border border-white/25 px-3 py-1.5 text-caption hover:border-white/60"
              >
                {fa ? "صفحه دوره" : "Course page"}
              </Link>
            </div>
          </div>
        )}
      </div>
      <div className="lg:col-span-5">
        <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto pe-1">
          {entries.map((entry) => {
            const locked = entry.video.free === false;
            const isActive = current?.video.id === entry.video.id;
            return (
              <li key={entry.video.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setActive(entry.video.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start transition-colors",
                    isActive ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/60",
                    locked && "cursor-not-allowed opacity-70",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background-secondary text-accent">
                    {locked ? <Lock className="h-4 w-4" /> : <PlayCircle className="h-4.5 w-4.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{t(entry.video.title, locale)}</span>
                    <span className="block truncate text-caption text-foreground-secondary">
                      {t(entry.courseTitle, locale)}
                      {locked ? (fa ? " — نیازمند ثبت‌نام" : " — requires enrollment") : ""}
                    </span>
                  </span>
                  {entry.video.durationSec ? (
                    <span className="shrink-0 text-caption text-muted tabular">{duration(entry.video.durationSec, locale)}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-caption text-muted">
          {fa
            ? `${faNum(playable.length)} پیش‌نمایش رایگان از ویدیوهای آپلودشده در پنل آکادمی.`
            : `${playable.length} free previews from the videos uploaded in the academy panel.`}
        </p>
      </div>
    </div>
  );
}

function duration(seconds: number, locale: Locale): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return locale === "fa" ? "کمتر از ۱ دقیقه" : "< 1 min";
  return locale === "fa" ? `${faNum(minutes)} دقیقه` : `${minutes} min`;
}

function sizeLabel(bytes: number | undefined, locale: Locale): string {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  const value = mb >= 1024 ? mb / 1024 : mb;
  const unit = mb >= 1024 ? "GB" : "MB";
  return locale === "fa"
    ? `${faNum(Math.round(value * 10) / 10)} مگابایت`.replace("مگابایت", unit === "GB" ? "گیگابایت" : "مگابایت")
    : `${Math.round(value * 10) / 10} ${unit}`;
}
