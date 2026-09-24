"use client";

/**
 * WebinarJoinGate — Beautiful entry screen before the live room.
 * Works for logged-in users (prefills name/email) and guests alike.
 * On submit: stores guest identity in sessionStorage + calls onJoin.
 */

import Image from "next/image";
import { useState, useEffect } from "react";
import { Radio, Users, Clock, CalendarClock, ShieldCheck, Wifi, ArrowLeft } from "lucide-react";
import { cn, faNum } from "@/lib/utils";

export interface JoinIdentity {
  name: string;
  email: string;
  viewerId: string;
}

interface Props {
  slug: string;
  title: string;
  image: string;
  hostName?: string;
  startsAt?: string;
  durationMin?: number;
  capacity?: number;
  registeredCount?: number;
  status: "scheduled" | "live" | "ended" | "cancelled";
  /** If user is already logged in, prefill name/email */
  prefillName?: string;
  prefillEmail?: string;
  onJoin: (identity: JoinIdentity) => void;
  locale?: "fa" | "en";
}

const STORAGE_KEY = "webinar-guest-identity";

function genViewerId() {
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function WebinarJoinGate({
  slug,
  title,
  image,
  hostName,
  startsAt,
  durationMin,
  capacity,
  registeredCount = 0,
  status,
  prefillName = "",
  prefillEmail = "",
  onJoin,
  locale = "fa",
}: Props) {
  const isFA = locale === "fa";
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Try to restore guest identity from session
  useEffect(() => {
    if (prefillName && prefillEmail) return; // logged-in user — skip
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved) as { name: string; email: string };
        if (!name && p.name) setName(p.name);
        if (!email && p.email) setEmail(p.email);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spotsLeft = capacity && capacity > 0 ? capacity - registeredCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimName = name.trim();
    const trimEmail = email.trim().toLowerCase();
    if (!trimName) {
      setError(isFA ? "لطفاً نام خود را وارد کنید." : "Please enter your name.");
      return;
    }
    if (!trimEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail)) {
      setError(isFA ? "آدرس ایمیل معتبر وارد کنید." : "Please enter a valid email.");
      return;
    }

    setLoading(true);

    // Build a stable viewerId tied to email (so same person gets same ID on reload)
    const viewerId = `v-${btoa(trimEmail).replace(/[^a-z0-9]/gi, "").slice(0, 12)}-${slug.slice(0, 6)}`;

    // Persist for convenience
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ name: trimName, email: trimEmail }));
    } catch { /* ignore */ }

    // Register attendee in the signal server
    try {
      await fetch(`/api/webinar/${slug}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "register", viewerId, name: trimName, email: trimEmail }),
      });
    } catch { /* best-effort */ }

    setLoading(false);
    onJoin({ name: trimName, email: trimEmail, viewerId });
  };

  const formattedDate = startsAt
    ? new Date(startsAt).toLocaleString(isFA ? "fa-IR" : "en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : null;

  return (
    <div className="min-h-screen bg-[#0a0d13] text-white flex flex-col" dir={isFA ? "rtl" : "ltr"}>
      {/* Ambient gradient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-rose-900/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-blue-900/15 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">

            {/* ── Left: event info ── */}
            <div className="space-y-6">
              {/* Status badge */}
              <div>
                {status === "live" ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-white">
                    <Radio className="h-3.5 w-3.5 animate-pulse" />
                    {isFA ? "در حال پخش" : "Live Now"}
                  </span>
                ) : status === "scheduled" ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm">
                    <CalendarClock className="h-3.5 w-3.5 text-accent" />
                    {isFA ? "رویداد آینده" : "Upcoming Event"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/40">
                    {isFA ? "پایان یافته" : "Ended"}
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="font-display text-4xl leading-tight text-white text-balance lg:text-5xl">
                {title}
              </h1>

              {/* Cover image */}
              {image && (
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10">
                  <Image src={image} alt={title} fill sizes="(max-width:1024px) 100vw, 55vw" className="object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/60 to-transparent" />
                  {status === "live" && (
                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                      <span className="h-2 w-2 rounded-full bg-white animate-ping absolute" />
                      <span className="h-2 w-2 rounded-full bg-white relative" />
                      LIVE
                    </div>
                  )}
                </div>
              )}

              {/* Meta info */}
              <div className="flex flex-wrap gap-4 text-sm text-white/60">
                {hostName && (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    {isFA ? "مدرس" : "Host"}: <span className="text-white/90 font-medium">{hostName}</span>
                  </span>
                )}
                {formattedDate && (
                  <span className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-accent" />
                    {formattedDate}
                  </span>
                )}
                {durationMin && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {isFA ? `${faNum(durationMin)} دقیقه` : `${durationMin} min`}
                  </span>
                )}
                {capacity && capacity > 0 && (
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {isFA
                      ? `${faNum(registeredCount)} از ${faNum(capacity)} نفر ثبت‌نام کرده‌اند`
                      : `${registeredCount} / ${capacity} registered`}
                  </span>
                )}
              </div>

              {/* Trust chips */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Wifi, text: isFA ? "بدون نیاز به دانلود" : "No download needed" },
                  { icon: ShieldCheck, text: isFA ? "ورود رایگان" : "Free to join" },
                  { icon: Users, text: isFA ? "چت زنده با شرکت‌کنندگان" : "Live chat" },
                ].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                    <Icon className="h-3 w-3 text-accent" />
                    {text}
                  </span>
                ))}
              </div>
            </div>

            {/* ── Right: join form card ── */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md lg:sticky lg:top-8">
              <h2 className="mb-1 text-xl font-semibold text-white">
                {status === "live"
                  ? (isFA ? "همین الان بپیوندید" : "Join Right Now")
                  : (isFA ? "رزرو جایگاه" : "Reserve Your Spot")}
              </h2>
              <p className="mb-6 text-sm text-white/50">
                {isFA
                  ? "برای ورود به اتاق وبینار، اطلاعات خود را وارد کنید."
                  : "Enter your details to join the webinar room."}
              </p>

              {isFull ? (
                <div className="rounded-xl bg-red-900/30 border border-red-500/30 p-5 text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <p className="font-semibold text-white">{isFA ? "ظرفیت تکمیل است" : "Fully Booked"}</p>
                  <p className="mt-1 text-sm text-white/50">{isFA ? "متأسفانه جایگاهی باقی نمانده." : "No spots remaining."}</p>
                </div>
              ) : status === "ended" || status === "cancelled" ? (
                <div className="rounded-xl bg-zinc-800/60 border border-white/10 p-5 text-center">
                  <p className="font-semibold text-white/60">{isFA ? "این رویداد پایان یافته است." : "This event has ended."}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/60">
                      {isFA ? "نام و نام خانوادگی" : "Full Name"} *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isFA ? "مثال: علی رضایی" : "e.g. John Smith"}
                      dir={isFA ? "rtl" : "ltr"}
                      className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-accent focus:bg-white/10"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/60">
                      {isFA ? "آدرس ایمیل" : "Email Address"} *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      dir="ltr"
                      className="w-full rounded-xl border border-white/15 bg-white/8 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-accent focus:bg-white/10"
                    />
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-900/30 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                      {error}
                    </p>
                  )}

                  {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 10 && (
                    <p className="text-xs text-amber-400 font-medium">
                      ⚠ {isFA ? `تنها ${faNum(spotsLeft)} جای خالی باقی مانده!` : `Only ${spotsLeft} spots left!`}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all",
                      status === "live"
                        ? "bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                        : "bg-accent text-white hover:bg-accent/90 disabled:opacity-60"
                    )}
                  >
                    {loading ? (
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : status === "live" ? (
                      <>
                        <Radio className="h-4 w-4" />
                        {isFA ? "ورود به وبینار زنده" : "Enter Live Webinar"}
                      </>
                    ) : (
                      <>
                        {isFA ? "رزرو و ورود" : "Reserve & Enter"}
                        <ArrowLeft className={cn("h-4 w-4", isFA && "rotate-180")} />
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-white/30">
                    {isFA
                      ? "ورود به وبینار مستقل از حساب کاربری سایت است."
                      : "Joining is independent from your site account."}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
