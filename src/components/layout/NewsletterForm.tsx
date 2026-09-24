"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";
import { SuccessState } from "@/components/ui/States";

export function NewsletterForm({ compact, className }: { compact?: boolean; className?: string }) {
  const { dict } = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      const r = await fetch("/api/newsletter", { method: "POST", body: JSON.stringify({ email }), headers: { "content-type": "application/json" } });
      setState(r.ok ? "ok" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "ok") return <div className={className}><SuccessState message={dict.common.newsletterOk} /></div>;

  return (
    <form onSubmit={submit} className={cn("flex items-center gap-2", className)} noValidate>
      <label className="sr-only" htmlFor={compact ? "nl-compact" : "nl"}>{dict.common.email}</label>
      <input
        id={compact ? "nl-compact" : "nl"}
        type="email"
        dir="ltr"
        required
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
        placeholder="you@example.com"
        aria-invalid={state === "error"}
        className={cn("h-11 w-full rounded-full border bg-surface px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/10", state === "error" ? "border-error" : "border-border focus:border-foreground", compact ? "" : "h-13")}
      />
      <button type="submit" disabled={state === "loading"} aria-label={dict.common.newsletterCta} className={cn("flex shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-50", compact ? "h-11 w-11" : "h-13 gap-2 px-6 text-sm font-medium")}>
        {!compact && dict.common.newsletterCta}
        <ArrowRight className="h-4 w-4 rtl-flip" />
      </button>
    </form>
  );
}
