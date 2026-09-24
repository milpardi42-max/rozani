"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { href } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "signup";
  /** Role pre-selected for signup (e.g. "artist" from /creators/join) */
  defaultRole?: "user" | "artist";
  /** Called with credentials right after a successful signup, before navigation */
  onSignupSuccess?: (email: string, password: string) => void;
  /** Pre-filled values (used when arriving from signup → login transition) */
  prefill?: { email?: string; password?: string };
  /** When true the submit button shows a loading-like state */
  autoSubmitting?: boolean;
}

const ERROR_MESSAGES: Record<string, { fa: string; en: string }> = {
  invalid: { fa: "اطلاعات وارد شده معتبر نیست.", en: "Please check your details." },
  invalid_credentials: { fa: "ایمیل یا رمز عبور اشتباه است.", en: "Incorrect email or password." },
  email_taken: { fa: "این ایمیل قبلاً ثبت شده است.", en: "This email is already registered." },
  password_too_short: { fa: "رمز عبور باید حداقل ۶ کاراکتر باشد.", en: "Password must be at least 6 characters." },
  password_mismatch: { fa: "رمز عبور و تکرار آن یکسان نیستند.", en: "Passwords do not match." },
  admin_not_configured: { fa: "حساب مدیر روی سرور پیکربندی نشده است.", en: "Admin account is not configured on the server." },
  too_many_attempts: { fa: "تعداد تلاش‌های زیاد. لطفاً کمی صبر کنید.", en: "Too many attempts. Please wait a moment." },
  network: { fa: "خطای شبکه. لطفاً دوباره تلاش کنید.", en: "Network error. Please try again." },
  server_error: { fa: "خطای سرور. لطفاً بعداً دوباره تلاش کنید.", en: "Server error. Please try again later." },
};

export function AuthForm({ mode, defaultRole, onSignupSuccess, prefill, autoSubmitting }: AuthFormProps) {
  const { locale, dict } = useLocale();
  const { login, signup } = useAuth();
  const router = useRouter();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"user" | "artist">(defaultRole ?? "user");
  const fa = locale === "fa";

  function getError(code: string): string {
    const msg = ERROR_MESSAGES[code];
    if (msg) return fa ? msg.fa : msg.en;
    return fa ? "خطایی رخ داد." : "An error occurred.";
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));

    if (mode === "signup") {
      const confirm = String(fd.get("confirm") || "");
      if (password !== confirm) {
        setBusy(false);
        return setErr(getError("password_mismatch"));
      }
    }

    if (mode === "login") {
      const r = await login(email, password);
      setBusy(false);
      if (!r.ok) return setErr(getError(r.error ?? "invalid"));
      // Redirect based on role
      router.push(href(locale, "/account"));
      return;
    }

    // signup
    const name = String(fd.get("name") || "");
    const r = await signup(name, email, password, role);
    setBusy(false);
    if (!r.ok) return setErr(getError(r.error ?? "invalid"));
    if (onSignupSuccess) {
      onSignupSuccess(email, password);
      return;
    }
    router.push(href(locale, "/account"));
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {mode === "signup" && (
        <Field label={dict.common.name}>
          <Input name="name" required autoComplete="name" />
        </Field>
      )}
      <Field label={dict.common.email}>
        <Input
          name="email"
          type="email"
          required
          dir="ltr"
          autoComplete="email"
          defaultValue={prefill?.email}
        />
      </Field>
      <Field label={dict.common.password}>
        <Input
          name="password"
          type="password"
          required
          dir="ltr"
          minLength={mode === "signup" ? 6 : 4}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          defaultValue={prefill?.password}
        />
      </Field>

      {mode === "signup" && (
        <Field label={fa ? "تکرار رمز عبور" : "Confirm password"}>
          <Input
            name="confirm"
            type="password"
            required
            dir="ltr"
            minLength={6}
            autoComplete="new-password"
          />
        </Field>
      )}

      {/* Role selector — only on signup */}
      {mode === "signup" && (
        <Field label={fa ? "نوع حساب" : "Account type"}>
          <div className="flex gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="account_role"
                value="user"
                checked={role === "user"}
                onChange={() => setRole("user")}
              />
              {fa ? "خریدار" : "Buyer"}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="account_role"
                value="artist"
                checked={role === "artist"}
                onChange={() => setRole("artist")}
              />
              {fa ? "هنرمند / طراح" : "Artist / Designer"}
            </label>
          </div>
        </Field>
      )}

      {err && (
        <p role="alert" className="text-sm text-error">
          {err}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={busy || autoSubmitting}
      >
        {mode === "login" ? dict.nav.login : dict.nav.signup}
      </Button>

      <p className="text-center text-sm text-foreground-secondary">
        {mode === "login" ? (
          <>
            {fa ? "حساب ندارید؟" : "No account?"}{" "}
            <Link
              href={href(locale, "/signup")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {dict.nav.signup}
            </Link>
          </>
        ) : (
          <>
            {fa ? "حساب دارید؟" : "Already have an account?"}{" "}
            <Link
              href={href(locale, "/login")}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {dict.nav.login}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
