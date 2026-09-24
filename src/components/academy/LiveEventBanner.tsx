"use client";

import Image from "next/image";
import Link from "next/link";
import { Radio, CalendarClock, Clock, Users, ArrowUpRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, faNum, href, t } from "@/lib/utils";
import type { EnrichedEducation } from "@/lib/data/enrich";

interface Props {
  event: EnrichedEducation;
}

function msUntil(iso: string) {
  return new Date(iso).getTime() - Date.now();
}

function useCountdown(startsAt: string | undefined, active: boolean) {
  const [remaining, setRemaining] = useState(startsAt ? msUntil(startsAt) : 0);
  useEffect(() => {
    if (!active || !startsAt) return;
    const tick = () => setRemaining(msUntil(startsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startsAt, active]);

  if (!startsAt || remaining <= 0) return null;
  const s = Math.floor(remaining / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function LiveEventBanner({ event }: Props) {
  const { locale, dict } = useLocale();
  const isFA = locale === "fa";
  const isLive = event.liveEvent?.status === "live";
  const isScheduled = event.liveEvent?.status === "scheduled";
  const countdown = useCountdown(
    isScheduled ? event.liveEvent?.startsAt : undefined,
    isScheduled
  );

  if (!isLive && !isScheduled) return null;

  const url = href(locale, `/academy/${event.slug}`);
  const title = t(event.title, locale);
  const excerpt = t(event.excerpt, locale);
  const typeLabel = dict.common[event.type];
  const capacity = event.liveEvent?.capacity ?? 0;
  const registered = event.liveEvent?.registeredCount ?? 0;
  const spotsLeft = capacity > 0 ? capacity - registered : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border",
        isLive
          ? "border-red-500/30 bg-gradient-to-br from-red-950/60 via-[#0c1018] to-[#0c1018]"
          : "border-accent/20 bg-gradient-to-br from-accent/10 via-background to-background"
      )}
    >
      {/* Background image */}
      <div className="absolute inset-0 opacity-10">
        <Image
          src={event.image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="relative z-10 grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
        {/* Left: event info */}
        <div className="flex flex-col gap-4">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                <Radio className="h-3 w-3 animate-pulse" />
                {isFA ? "رویداد زنده" : "Live Now"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                <CalendarClock className="h-3 w-3" />
                {isFA ? "رویداد آینده" : "Upcoming Event"}
              </span>
            )}
            <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground-secondary">
              {typeLabel}
            </span>
          </div>

          {/* Title */}
          <div>
            <h2 className="font-display text-h2 text-foreground text-balance leading-tight">
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-body-sm text-foreground-secondary line-clamp-2">
              {excerpt}
            </p>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption text-foreground-secondary">
            {event.liveEvent?.startsAt && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-accent" />
                {new Date(event.liveEvent.startsAt).toLocaleString(
                  isFA ? "fa-IR" : "en-US",
                  { dateStyle: "long", timeStyle: "short" }
                )}
              </span>
            )}
            {event.liveEvent?.durationMin && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {isFA
                  ? `${faNum(event.liveEvent.durationMin)} دقیقه`
                  : `${event.liveEvent.durationMin} min`}
              </span>
            )}
            {capacity > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {isFA
                  ? `${faNum(registered)} / ${faNum(capacity)} ${isFull ? "· تکمیل ظرفیت" : "نفر"}`
                  : `${registered} / ${capacity}${isFull ? " · Full" : " seats"}`}
              </span>
            )}
          </div>
        </div>

        {/* Right: countdown + CTA */}
        <div className="flex flex-col items-start gap-4 md:items-end">
          {/* Countdown */}
          {!isLive && countdown && (
            <div className="flex items-end gap-3">
              {countdown.d > 0 && (
                <div className="flex flex-col items-center">
                  <span className="font-display text-h1 leading-none tabular-nums text-foreground">
                    {isFA ? faNum(countdown.d) : countdown.d}
                  </span>
                  <span className="mt-1 text-[10px] text-muted uppercase">
                    {isFA ? "روز" : "days"}
                  </span>
                </div>
              )}
              {[
                { val: countdown.h, label: isFA ? "ساعت" : "hrs" },
                { val: countdown.m, label: isFA ? "دقیقه" : "min" },
                { val: countdown.s, label: isFA ? "ثانیه" : "sec" },
              ].map(({ val, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="font-display text-h1 leading-none tabular-nums text-foreground">
                    {isFA ? faNum(val) : pad(val)}
                  </span>
                  <span className="mt-1 text-[10px] text-muted uppercase">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* CTA button */}
          <Link
            href={url}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all",
              isLive
                ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30"
                : isFull
                ? "bg-background-secondary text-muted cursor-not-allowed pointer-events-none"
                : "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20"
            )}
          >
            {isLive
              ? isFA
                ? "ورود به رویداد زنده"
                : "Join Live Event"
              : isFull
              ? isFA
                ? "ظرفیت تکمیل است"
                : "Fully Booked"
              : isFA
              ? "ثبت‌نام در رویداد"
              : "Register for Event"}
            {!isFull && <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />}
          </Link>

          {/* Spots left warning */}
          {!isLive && spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10 && (
            <p className="text-caption text-amber-500 font-medium">
              {isFA
                ? `تنها ${faNum(spotsLeft)} جای خالی مانده!`
                : `Only ${spotsLeft} spots left!`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
