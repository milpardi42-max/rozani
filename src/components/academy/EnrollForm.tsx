"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, href } from "@/lib/utils";
import type { EducationItem } from "@/lib/types";

interface EnrollResult {
  id: string;
  status: string;
  startsAt: string;
  paymentDue: boolean;
}

/**
 * Real registration form.
 *
 * Posts to `/api/academy/enroll`, which stores the registration in the same
 * reservations store the admin panel reads — so an enrollment made here shows up
 * in the dashboard for real, with the seat count and the e-mail on file.
 */
export function EnrollForm({
  item,
  onDone,
  className,
  compact,
}: {
  item: Pick<EducationItem, "slug" | "title" | "type" | "price"> & { paymentLabel?: string };
  onDone?: () => void;
  className?: string;
  compact?: boolean;
}) {
  const { locale, dict } = useLocale();
  const fa = locale === "fa";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EnrollResult | null>(null);

  const isEvent = item.type === "workshop" || item.type === "webinar";
  const isPaid = Boolean(item.price && (item.price.fa > 0 || item.price.en > 0));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/academy/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug, name: name.trim(), email: email.trim().toLowerCase() }),
      });
      const data = (await res.json()) as { ok: boolean; enrollment?: EnrollResult; error?: string };
      if (!res.ok || !data.ok || !data.enrollment) {
        setError(
          data.error === "event_full"
            ? fa
              ? "ظرفیت این رویداد تکمیل شده است."
              : "This event is full."
            : data.error === "event_closed"
              ? fa
                ? "این رویداد به پایان رسیده است."
                : "This event has ended."
              : fa
                ? "ثبت‌نام انجام نشد؛ لطفاً دوباره تلاش کنید."
                : "Registration failed — please try again.",
        );
        return;
      }
      setResult(data.enrollment);
      onDone?.();
    } catch {
      setError(fa ? "خطای شبکه. دوباره تلاش کنید." : "Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (result) {
    return (
      <div className={cn("rounded-xl border border-success/30 bg-success/5 p-5 text-center", className)}>
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
        <p className="font-display text-h4 text-foreground">{fa ? "ثبت‌نام شما ثبت شد" : "You're registered"}</p>
        <p className="mt-1 text-body-sm text-foreground-secondary">
          {isEvent
            ? fa
              ? "صندلی شما رزرو شد؛ لینک ورود به رویداد را برایتان می‌فرستیم."
              : "Your seat is reserved — we'll e-mail the event link."
            : fa
              ? "دسترسی شما فعال شد؛ می‌توانید از همین صفحه دوره را شروع کنید."
              : "Your access is active — start the course from this page."}
        </p>
        {result.paymentDue && (
          <p className="mt-2 text-caption text-warning">
            {fa
              ? "این دوره پرداخت دارد؛ همکاران آکادمی برای هماهنگی پرداخت با شما تماس می‌گیرند."
              : "This course is paid — the academy will contact you to arrange payment."}
          </p>
        )}
        <p className="mt-3 text-caption text-muted" dir="ltr">
          {result.id}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {isEvent && item.type !== "course" && (
            <Link
              href={href(locale, `/academy/${item.slug}/live`)}
              onClick={onDone}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
            >
              {fa ? "ورود به رویداد" : "Enter the event"}
            </Link>
          )}
          <Link
            href={href(locale, `/academy/${item.slug}`)}
            onClick={onDone}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
          >
            {fa ? "صفحه دوره" : "Course page"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("space-y-3", className)}>
      <div>
        <label className="mb-1.5 block text-caption text-foreground-secondary" htmlFor={`enroll-name-${item.slug}`}>
          {dict.common.name}
        </label>
        <input
          id={`enroll-name-${item.slug}`}
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={fa ? "نام و نام خانوادگی" : "Full name"}
          className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-caption text-foreground-secondary" htmlFor={`enroll-email-${item.slug}`}>
          {dict.common.email}
        </label>
        <input
          id={`enroll-email-${item.slug}`}
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={fa ? "ایمیل شما" : "Your e-mail"}
          dir="ltr"
          className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>
      {isPaid && (
        <p className="rounded-lg bg-background-secondary px-3 py-2 text-caption text-foreground-secondary">
          {fa
            ? `هزینه این ${item.type === "course" ? "دوره" : "رویداد"}: ${item.paymentLabel ?? ""} — پس از ثبت‌نام، هماهنگی پرداخت انجام می‌شود.`
            : `Fee: ${item.paymentLabel ?? ""} — we'll arrange payment after you register.`}
        </p>
      )}
      <button
        type="submit"
        disabled={sending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
      >
        {sending && <Loader2 className="h-4 w-4 animate-spin" />}
        {item.type === "course"
          ? isPaid
            ? fa
              ? "ثبت‌نام در دوره"
              : "Enroll in course"
            : fa
              ? "شروع رایگان دوره"
              : "Start free"
          : fa
            ? "رزرو صندلی"
            : "Reserve a seat"}
      </button>
      {error && (
        <p className="text-caption text-error" role="alert">
          {error}
        </p>
      )}
      {!compact && (
        <p className="text-caption text-muted">
          {fa
            ? "ثبت‌نام شما در پنل آکادمی ثبت و ذخیره می‌شود؛ ایمیل شما فقط برای اطلاع‌رسانی همین رویداد استفاده می‌شود."
            : "Your registration is stored in the academy panel; your e-mail is only used for this course's updates."}
        </p>
      )}
    </form>
  );
}
