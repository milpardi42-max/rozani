"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Logo } from "@/components/layout/Logo";
import { href } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";
import { AuthForm } from "./AuthForm";
import { useAuth } from "@/components/providers/AppProviders";

interface LoginShellProps {
  locale: Locale;
  image: string;
  dict: { login: string; signup: string; admin: string };
}

export function LoginShell({ locale, image, dict }: LoginShellProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fa = locale === "fa";

  const [prefill, setPrefill] = useState<{ email: string; password: string } | null>(null);
  const [autoPhase, setAutoPhase] = useState<"idle" | "filling" | "submitting" | "done">("idle");

  const runAutoLogin = useCallback(
    async (email: string, password: string) => {
      setAutoPhase("filling");
      await new Promise((r) => setTimeout(r, 600));
      setAutoPhase("submitting");
      const r = await login(email, password);
      if (r.ok) {
        setAutoPhase("done");
        router.push(href(locale, "/account"));
      } else {
        setAutoPhase("idle");
      }
    },
    [login, locale, router],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("_t");
    if (!raw) return;

    // Strip token from URL immediately (no navigation)
    const clean = new URL(window.location.href);
    clean.searchParams.delete("_t");
    window.history.replaceState(null, "", clean.toString());

    try {
      const { e, p } = JSON.parse(atob(decodeURIComponent(raw))) as { e: string; p: string };
      if (e && p) {
        setPrefill({ email: e, password: p });
        runAutoLogin(e, p);
      }
    } catch {
      // malformed token — ignore
    }
  }, [runAutoLogin]);

  const goToSignup = () => {
    if (leaving) return;
    setLeaving(true);
    timerRef.current = setTimeout(() => router.push(href(locale, "/signup")), 650);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const isAutoFlow = autoPhase === "filling" || autoPhase === "submitting" || autoPhase === "done";
  const isSubmitting = autoPhase === "submitting";

  return (
    <section className="auth-shell-page">
      <div
        className={[
          "auth-card",
          leaving ? "auth-card--to-signup" : "",
          isAutoFlow ? "auth-card--auto-login" : "",
        ].filter(Boolean).join(" ")}
        dir="ltr"
      >
        {/* sliding background */}
        <div className="auth-card__bg auth-card__bg--login">
          <Image src={image} alt="" fill sizes="340px" className="object-cover" priority />
          <div className="auth-card__bg-overlay" />
        </div>

        {/* hero panel */}
        <div className="auth-card__hero auth-card__hero--login">
          <Logo className="auth-card__hero-logo" />
          <h2>{fa ? "تازه‌وارد هستید؟" : "New here?"}</h2>
          <p>{fa ? "ثبت‌نام کنید و الگوها را کشف کنید." : "Create an account and start discovering patterns."}</p>
          <button type="button" onClick={goToSignup} className="auth-card__hero-btn" disabled={isAutoFlow}>
            {dict.signup}
          </button>
        </div>

        {/* form panel */}
        <div className="auth-card__form auth-card__form--login" dir={fa ? "rtl" : "ltr"}>
          {isAutoFlow ? (
            <div className="auth-card__auto-login">
              <div className="auth-card__auto-ring-wrap">
                <div className="auth-card__auto-ring" />
                <Logo className="auth-card__auto-logo" />
              </div>
              <p className="auth-card__auto-label">
                {fa
                  ? autoPhase === "filling" ? "اطلاعات شما آماده است…" : "در حال ورود به حساب…"
                  : autoPhase === "filling" ? "Almost there…" : "Signing you in…"}
              </p>
              <p className="auth-card__auto-email">{prefill?.email}</p>
            </div>
          ) : (
            <>
              <Logo className="auth-card__form-logo" />
              <h1 className="auth-card__form-title">{dict.login}</h1>
              <AuthForm
                mode="login"
                prefill={prefill ?? undefined}
                autoSubmitting={isSubmitting}
              />
              <p className="auth-card__admin-link">
                <Link href={href(locale, "/admin")}>
                  {dict.admin}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
