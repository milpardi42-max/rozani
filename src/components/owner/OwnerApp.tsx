"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, GalleryHorizontalEnd } from "lucide-react";
import { PortfoliosManager } from "@/components/admin/PortfoliosManager";
import { AcademyManager } from "@/components/admin/AcademyManager";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { cn, href } from "@/lib/utils";
import type { SiteContent } from "@/lib/types";

type Section = "portfolio" | "academy";

class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
  }
}

async function ownerFetch<T>(init?: RequestInit): Promise<T> {
  const r = await fetch("/api/admin/content", { ...SESSION_FETCH, ...init });
  if (r.status === 401) throw new UnauthorizedError();
  if (!r.ok) throw new Error(`content → ${r.status}`);
  return (await r.json()) as T;
}

export function OwnerApp({ defaultSection }: { defaultSection: Section }) {
  const { user, ready } = useAuth();
  const { locale } = useLocale();
  const [data, setData] = useState<SiteContent | null>(null);
  const [section, setSection] = useState<Section>(defaultSection);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [loadError, setLoadError] = useState<"unauthorized" | "error" | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoadError(null);
    try {
      setData(await ownerFetch<SiteContent>({ signal }));
    } catch (e) {
      if (signal?.aborted) return;
      setLoadError(e instanceof UnauthorizedError ? "unauthorized" : "error");
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const update = useCallback(
    (patch: Partial<SiteContent>) => {
      setData((prev) => (prev ? { ...prev, ...patch } : prev));
      setStatus("idle");
    },
    [],
  );

  const save = useCallback(async () => {
    if (!data) return;
    setStatus("saving");
    try {
      const r = await fetch("/api/admin/content", {
        ...SESSION_FETCH,
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      setStatus(r.ok ? "ok" : "error");
      if (r.ok) setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }, [data]);

  /* ── Loading / error states ── */
  if (!ready || (!data && !loadError)) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-10">
        <Skeleton className="h-72 w-full max-w-lg rounded-xl" />
      </div>
    );
  }

  if (loadError === "unauthorized") {
    return (
      <div className="min-h-dvh flex items-center justify-center p-10">
        <ErrorState message="دسترسی ندارید — وارد حساب کاربری مالک سایت شوید." />
      </div>
    );
  }

  if (loadError === "error" || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-10">
        <ErrorState message="خطا در بارگذاری" onRetry={() => void load()} />
      </div>
    );
  }

  const navItems: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: "portfolio", label: "پورتفولیو", icon: <GalleryHorizontalEnd className="h-4 w-4" /> },
    { id: "academy", label: "آکادمی", icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-dvh bg-[#f0f2f5] flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground">پنل مالک · راضیه خیری‌پور</span>
          <span className="text-caption text-foreground-secondary hidden sm:inline">
            {user?.email}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={status === "saving"}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              status === "saving" && "bg-accent/60 text-white cursor-wait",
              status === "ok" && "bg-emerald-500 text-white",
              status === "error" && "bg-red-500 text-white",
              status === "idle" && "bg-accent text-white hover:bg-accent/90",
            )}
          >
            {status === "saving" ? "ذخیره…" : status === "ok" ? "✓ ذخیره شد" : status === "error" ? "خطا!" : "ذخیره تغییرات"}
          </button>
          <Link
            href={href(locale, "/")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-foreground-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
            بازگشت
          </Link>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="flex gap-1 border-b border-border bg-background px-4">
        {navItems.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              section === id
                ? "border-accent text-accent"
                : "border-transparent text-foreground-secondary hover:text-foreground",
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-6">
        {section === "portfolio" && (
          <PortfoliosManager data={data} update={update} locale={locale} />
        )}
        {section === "academy" && (
          <AcademyManager data={data} update={update} locale={locale} />
        )}
      </main>
    </div>
  );
}
