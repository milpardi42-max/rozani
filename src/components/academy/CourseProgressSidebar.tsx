"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Lock, PlayCircle } from "lucide-react";
import { cn, faNum, formatDuration, t } from "@/lib/utils";
import type { LessonItem } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";

interface Props {
  courseId: string;
  lessons: LessonItem[];
  totalMin: number;
  locale: Locale;
  dict: { progress: string; lessons: string; minutes: string; hours: string; free: string };
}

const STORAGE_PREFIX = "ra-progress:";

export function CourseProgressSidebar({ courseId, lessons, totalMin, locale, dict }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const storageKey = `${STORAGE_PREFIX}${courseId}`;

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]));
    } catch { /* silent */ }
  }, [storageKey]);

  const toggle = useCallback((id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* silent */ }
      return next;
    });
  }, [storageKey]);

  const pct = lessons.length > 0 ? Math.round((completed.size / lessons.length) * 100) : 0;
  const completedMin = lessons.filter((l) => completed.has(l.id)).reduce((s, l) => s + l.durationMin, 0);
  const freeLabel = locale === "fa" ? "رایگان" : "Free";

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-caption">
          <span className="font-medium text-foreground">{dict.progress}</span>
          <span className="tabular text-accent font-semibold">
            {locale === "fa" ? faNum(pct) : pct}%
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-foreground-secondary tabular">
          {locale === "fa"
            ? `${faNum(completed.size)} از ${faNum(lessons.length)} درس — ${faNum(completedMin)} دقیقه`
            : `${completed.size} / ${lessons.length} lessons — ${completedMin} min`}
        </p>
      </div>

      {/* Lesson list */}
      <ol className="space-y-1">
        {lessons.map((lesson, i) => {
          const done = completed.has(lesson.id);
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => toggle(lesson.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-start transition-colors",
                  done
                    ? "border-accent/30 bg-accent/5 text-foreground"
                    : "border-border hover:border-foreground/40 text-foreground-secondary hover:text-foreground",
                )}
              >
                {/* Status icon */}
                <span className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular",
                  done ? "bg-accent text-white" : "bg-background-secondary text-muted",
                )}>
                  {done
                    ? <Check className="h-3.5 w-3.5" />
                    : lesson.free
                      ? <PlayCircle className="h-3.5 w-3.5 text-accent" />
                      : <span>{locale === "fa" ? faNum(i + 1) : i + 1}</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium leading-snug">
                    {t(lesson.title, locale)}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-[11px]">
                    <span className="tabular">{formatDuration(lesson.durationMin, locale, { minutes: dict.minutes, hours: dict.hours })}</span>
                    {lesson.free && (
                      <span className="rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">{freeLabel}</span>
                    )}
                  </span>
                </span>
                {!lesson.free && !done && <Lock className="h-3.5 w-3.5 shrink-0 text-muted" />}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Total duration */}
      <p className="border-t border-border pt-3 text-caption text-foreground-secondary tabular">
        {locale === "fa"
          ? `مجموع: ${faNum(Math.round(totalMin / 60))} ساعت ${faNum(totalMin % 60)} دقیقه`
          : `Total: ${Math.floor(totalMin / 60)}h ${totalMin % 60}m`}
      </p>
    </div>
  );
}
