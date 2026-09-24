"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Frame, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/providers/AppProviders";

export default function AdminLoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { user, ready, login } = useAuth();
  const router = useRouter();

  const [locale, setLocale] = useState("fa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setLocale(p.locale ?? "fa"));
  }, [params]);

  // اگر ادمین وارد شده، به پنل هدایت شود
  useEffect(() => {
    if (ready && user?.role === "admin") {
      router.replace(`/admin/${locale}`);
    }
  }, [ready, user, router, locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(
        result.error === "invalid_credentials" || result.error === "invalid"
          ? "ایمیل یا رمز عبور اشتباه است."
          : result.error === "too_many_attempts"
          ? "تعداد تلاش‌های بیش از حد. کمی صبر کنید."
          : "خطایی رخ داد. دوباره تلاش کنید.",
      );
      return;
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* لوگو */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1e2230] text-white shadow-medium">
            <Frame className="h-7 w-7" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-foreground">رزی آتلیه</h1>
            <p className="text-sm text-muted">ورود به پنل مدیریت</p>
          </div>
        </div>

        {/* فرم */}
        <div className="rounded-2xl border border-border bg-white p-6 shadow-medium">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* ایمیل */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                ایمیل
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pr-10 pl-3 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            {/* رمز عبور */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                رمز عبور
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="رمز عبور"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pr-10 pl-10 text-sm text-foreground placeholder:text-muted outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* خطا */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2.5 text-sm text-error">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* دکمه ورود */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e2230] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2a3045] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  در حال ورود…
                </>
              ) : (
                "ورود به پنل"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          پنل مدیریت اختصاصی · فقط برای ادمین
        </p>
      </div>
    </div>
  );
}
