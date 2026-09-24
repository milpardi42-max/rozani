"use client";

import Link from "next/link";
import { X, Radio, CalendarClock, Megaphone, Tag } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, href, t } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";
import type {
  AnnouncementBarConfig,
  AnnouncementBarDirection,
  AnnouncementBarKind,
  AnnouncementBarMotion,
  AnnouncementBarTransition,
  EducationItem,
} from "@/lib/types";

interface Props {
  event: EducationItem | null;
  configBars?: AnnouncementBarConfig[];
}

function useAnnounceHeight(ref: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!active || !el) {
      root.style.setProperty("--announce-h", "0px");
      return;
    }
    const ro = new ResizeObserver(() => {
      root.style.setProperty("--announce-h", `${el.offsetHeight}px`);
    });
    ro.observe(el);
    root.style.setProperty("--announce-h", `${el.offsetHeight}px`);
    return () => {
      ro.disconnect();
      root.style.setProperty("--announce-h", "0px");
    };
  }, [ref, active]);
}

const KIND_DEFAULTS: Record<AnnouncementBarKind, { bg: string; text: string }> = {
  "live-webinar": { bg: "#dc2626", text: "#ffffff" },
  webinar:        { bg: "#1a1a2e", text: "#ffffff" },
  sale:           { bg: "#b91c1c", text: "#ffffff" },
  custom:         { bg: "#1e2230", text: "#ffffff" },
};

const TRANSITION_CLASS: Record<AnnouncementBarTransition, string> = {
  "slide-down": "ab-transition-slide-down",
  "fade":       "ab-transition-fade",
  "blur-in":    "ab-transition-blur-in",
  "bounce":     "ab-transition-bounce",
};

function animationClasses(
  bar: AnnouncementBarConfig,
  locale: string,
): string {
  const transition = bar.transition && TRANSITION_CLASS[bar.transition]
    ? bar.transition
    : "slide-down";
  const direction: AnnouncementBarDirection = bar.direction ?? (locale === "fa" ? "rtl" : "ltr");
  const motion: AnnouncementBarMotion = bar.motion ?? "animated";
  return cn(
    TRANSITION_CLASS[transition],
    `ab-direction-${direction}`,
    `ab-motion-${motion}`,
  );
}

function marqueeClasses(bar: AnnouncementBarConfig, locale: string): string {
  if ((bar.motion ?? "animated") === "static") return "";
  const direction = bar.direction ?? (locale === "fa" ? "rtl" : "ltr");
  return cn(
    "ab-marquee-track",
    `ab-marquee-${direction}`,
    (bar.motion ?? "animated") === "soft" && "ab-marquee-soft",
  );
}

function KindIcon({ kind, className }: { kind: AnnouncementBarKind; className?: string }) {
  if (kind === "live-webinar" || kind === "webinar") return <Radio className={className} />;
  if (kind === "sale") return <Tag className={className} />;
  return <Megaphone className={className} />;
}

function isBarActive(bar: AnnouncementBarConfig): boolean {
  if (!bar.enabled) return false;
  if (bar.kind !== "live-webinar" && bar.expiresAt && new Date(bar.expiresAt).getTime() < Date.now()) return false;
  return true;
}

/* ── Live-webinar bar — rendered only when a live event exists ── */
function LiveWebinarBar({
  bar,
  event,
  locale,
  onDismiss,
}: {
  bar: AnnouncementBarConfig;
  event: EducationItem;
  locale: string;
  onDismiss: () => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  useAnnounceHeight(barRef, true);

  const isFA    = locale === "fa";
  const bg      = bar.bgColor || KIND_DEFAULTS["live-webinar"].bg;
  const color   = bar.textColor || KIND_DEFAULTS["live-webinar"].text;
  const prefix  = t(bar.message, locale as "fa" | "en");
  const title   = t(event.title, locale as "fa" | "en");
  const cta     = bar.ctaLabel
    ? t(bar.ctaLabel, locale as "fa" | "en")
    : isFA ? "ورود به رویداد" : "Join now";
  const dest    = bar.href || href(locale as Locale, `/academy/${event.slug}`);
  const animCls = animationClasses(bar, locale);

  return (
    <div
      ref={barRef}
      role="banner"
      aria-label={isFA ? "اعلان وبینار زنده" : "Live webinar announcement"}
      className={cn("relative z-50 flex items-center gap-2 px-4 py-2.5 text-sm font-medium", animCls)}
      style={{ backgroundColor: bg, color }}
    >
      {/* نقطه چشمک‌زن */}
      <span className="relative me-1 flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: color }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      </span>

      <Radio className="h-3.5 w-3.5 shrink-0" />

      {/* بج LIVE */}
      <span
        className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ backgroundColor: `${color}25`, color }}
      >
        {isFA ? "🔴 زنده" : "🔴 LIVE"}
      </span>

      {/* پیام پیشوند + عنوان رویداد */}
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className={marqueeClasses(bar, locale)}>
          {prefix && <span className="opacity-75">{prefix} </span>}
          <span className="font-semibold">{title}</span>
        </span>
      </span>

      {/* دکمه CTA */}
      <Link
        href={dest}
        className="ms-2 shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-85"
        style={{ backgroundColor: `${color}25`, color }}
      >
        {cta} →
      </Link>

      {/* بستن */}
      <button
        type="button"
        aria-label={isFA ? "بستن" : "Close"}
        onClick={onDismiss}
        className="ms-1 shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
        style={{ color }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Generic config bar ─────────────────────────────────────── */
function ConfigBar({
  bar,
  locale,
  onDismiss,
}: {
  bar: AnnouncementBarConfig;
  locale: string;
  onDismiss: () => void;
}) {
  const barRef  = useRef<HTMLDivElement>(null);
  useAnnounceHeight(barRef, true);

  const isFA    = locale === "fa";
  const msg     = t(bar.message, locale as "fa" | "en");
  const cta     = bar.ctaLabel
    ? t(bar.ctaLabel, locale as "fa" | "en")
    : isFA ? "بیشتر بدانید" : "Learn more";
  const bg      = bar.bgColor || KIND_DEFAULTS[bar.kind]?.bg || "#1e2230";
  const color   = bar.textColor || KIND_DEFAULTS[bar.kind]?.text || "#ffffff";
  const animCls = animationClasses(bar, locale);

  return (
    <div
      ref={barRef}
      role="banner"
      aria-label={isFA ? "اعلان سایت" : "Site announcement"}
      className={cn("relative z-50 flex items-center gap-2 px-4 py-2.5 text-sm font-medium", animCls)}
      style={{ backgroundColor: bg, color }}
    >
      <span className="relative me-1 flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: color }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      </span>

      <KindIcon kind={bar.kind} className="h-3.5 w-3.5 shrink-0 opacity-80" />

      <span className="min-w-0 flex-1 overflow-hidden">
        <span className={cn("opacity-90", marqueeClasses(bar, locale))}>{msg}</span>
      </span>

      <Link
        href={bar.href || "/"}
        className="ms-2 shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-85"
        style={{ backgroundColor: `${color}25`, color }}
      >
        {cta} →
      </Link>

      <button
        type="button"
        aria-label={isFA ? "بستن" : "Close"}
        onClick={onDismiss}
        className="ms-1 shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
        style={{ color }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────── */
export function AnnouncementBar({ event, configBars = [] }: Props) {
  const { locale } = useLocale();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const dismiss = (id: string) => setDismissedIds((p) => new Set([...p, id]));

  // Find the first enabled, non-dismissed, non-expired bar
  const activeBar = configBars.find((b) => {
    if (!isBarActive(b)) return false;
    if (dismissedIds.has(b.id)) return false;
    // live-webinar: only show if a live event actually exists right now
    if (b.kind === "live-webinar") return !!event && event.liveEvent?.status === "live";
    return true;
  });

  if (!activeBar) return null;

  if (activeBar.kind === "live-webinar" && event && event.liveEvent?.status === "live") {
    return (
      <LiveWebinarBar
        bar={activeBar}
        event={event}
        locale={locale}
        onDismiss={() => dismiss(activeBar.id)}
      />
    );
  }

  return (
    <ConfigBar
      bar={activeBar}
      locale={locale}
      onDismiss={() => dismiss(activeBar.id)}
    />
  );
}
