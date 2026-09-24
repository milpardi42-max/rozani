"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { SuccessState } from "@/components/ui/States";
import { href } from "@/lib/utils";

interface CreatorSignupFormProps {
  options: string[];
}

export function CreatorSignupForm({ options }: CreatorSignupFormProps) {
  const { locale } = useLocale();
  const { signup, user } = useAuth();
  const router = useRouter();
  const fa = locale === "fa";

  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  // Already logged in as artist
  if (user?.role === "artist" || user?.role === "admin") {
    return (
      <SuccessState
        message={
          fa
            ? `شما قبلاً به عنوان هنرمند ثبت شده‌اید. به داشبورد بروید.`
            : `You're already registered as an artist. Go to your dashboard.`
        }
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    setErrMsg("");
    const fd = new FormData(e.currentTarget);

    const name = String(fd.get("name") || "");
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    const phone = String(fd.get("phone") || "");
    const city = String(fd.get("city") || "");
    const specialty = String(fd.get("type") || "");
    const instagram = String(fd.get("instagram") || "");
    const portfolioUrl = String(fd.get("portfolio") || "");

    if (password !== confirm) {
      setState("idle");
      setErrMsg(fa ? "رمز عبور و تکرار آن یکسان نیستند." : "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setState("idle");
      setErrMsg(fa ? "رمز عبور باید حداقل ۶ کاراکتر باشد." : "Password must be at least 6 characters.");
      return;
    }

    const r = await signup(name, email, password, "artist", {
      phone,
      city,
      specialty,
      instagram,
      portfolioUrl,
    });
    if (!r.ok) {
      setState("error");
      const errorMap: Record<string, string> = {
        email_taken: fa ? "این ایمیل قبلاً ثبت شده است." : "This email is already registered.",
        invalid: fa ? "اطلاعات وارد شده معتبر نیست." : "Please check your details.",
        network: fa ? "خطای شبکه. لطفاً دوباره تلاش کنید." : "Network error. Please try again.",
        server_error: fa ? "خطای سرور. لطفاً بعداً تلاش کنید." : "Server error. Please try again later.",
      };
      setErrMsg(errorMap[r.error ?? ""] ?? (fa ? "خطایی رخ داد." : "An error occurred."));
      return;
    }

    setState("ok");
    setTimeout(() => {
      router.push(href(locale, "/artist"));
    }, 1500);
  };

  if (state === "ok") {
    return (
      <SuccessState
        message={
          fa
            ? "ثبت‌نام شما با موفقیت انجام شد! درخواست شما در انتظار تأیید ادمین است. به‌زودی با شما تماس خواهیم گرفت."
            : "Registration successful! Your application is pending admin review. We'll be in touch soon."
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label={fa ? "نام و نام خانوادگی" : "Full name"} className="sm:col-span-2">
        <Input name="name" required autoComplete="name" />
      </Field>
      <Field label={fa ? "ایمیل" : "Email"}>
        <Input name="email" type="email" required dir="ltr" autoComplete="email" />
      </Field>
      <Field label={fa ? "شماره تماس" : "Phone"}>
        <Input name="phone" type="tel" dir="ltr" autoComplete="tel" />
      </Field>
      <Field label={fa ? "نوع فعالیت" : "Specialty"}>
        <Select name="type">
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Field>
      <Field label={fa ? "شهر" : "City"}>
        <Input name="city" autoComplete="address-level2" />
      </Field>
      <Field label={fa ? "آیدی اینستاگرام (اختیاری)" : "Instagram handle (optional)"} className="sm:col-span-2">
        <Input name="instagram" dir="ltr" placeholder="@username" />
      </Field>
      <Field label={fa ? "لینک پورتفولیو (اختیاری)" : "Portfolio link (optional)"} className="sm:col-span-2">
        <Input name="portfolio" type="url" dir="ltr" placeholder="https://..." />
      </Field>
      <Field label={fa ? "رمز عبور (حداقل ۶ کاراکتر)" : "Password (min 6 chars)"}>
        <Input name="password" type="password" required dir="ltr" minLength={6} autoComplete="new-password" />
      </Field>
      <Field label={fa ? "تکرار رمز عبور" : "Confirm password"}>
        <Input name="confirm" type="password" required dir="ltr" minLength={6} autoComplete="new-password" />
      </Field>

      {state === "error" && errMsg && (
        <div className="sm:col-span-2">
          <p className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">{errMsg}</p>
        </div>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={state === "loading"} className="w-full sm:w-auto">
          {state === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
          {fa ? "ثبت‌نام به عنوان هنرمند" : "Register as an artist"}
        </Button>
        <p className="mt-3 text-caption text-foreground-secondary">
          {fa ? "قبلاً ثبت نام کرده‌اید؟" : "Already have an account?"}{" "}
          <a href={href(locale, "/login")} className="font-medium text-foreground underline-offset-4 hover:underline">
            {fa ? "ورود" : "Sign in"}
          </a>
        </p>
      </div>
    </form>
  );
}
