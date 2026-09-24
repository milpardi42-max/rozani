"use client";

import { useState, useCallback } from "react";
import { Link2, Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  locale: "fa" | "en";
}

/** Copy-link + native share / social share buttons for portfolio detail. */
export function ShareButtons({ title, locale }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback: execCommand (legacy browsers)
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch { /* silent */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const nativeShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or not supported — fall back to copy
      }
    }
    await copy();
  }, [title, copy]);

  const shareX = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "noopener,noreferrer");
  };

  const shareWhatsApp = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    window.open(`https://wa.me/?text=${text}%20${url}`, "_blank", "noopener,noreferrer");
  };

  const label = locale === "fa" ? "اشتراک‌گذاری" : "Share";
  const copyLabel = locale === "fa" ? (copied ? "کپی شد" : "کپی لینک") : (copied ? "Copied!" : "Copy link");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption text-muted">{label}:</span>
      {/* Native share (mobile) — shown when API is available; falls back to copy */}
      <button
        type="button"
        onClick={nativeShare}
        aria-label={label}
        className="flex h-8 items-center justify-center rounded-full border border-border px-2.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground md:hidden"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
      {/* Copy link */}
      <button
        type="button"
        onClick={copy}
        className={cn(
          "hidden md:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-all duration-200",
          copied ? "border-success text-success" : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground",
        )}
      >
        {copied ? <Check className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
        {copyLabel}
      </button>
      {/* Social buttons — desktop only */}
      <button type="button" onClick={shareX} aria-label="Share on X / Twitter" className="hidden md:flex h-8 items-center justify-center rounded-full border border-border px-2.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground">
        𝕏
      </button>
      <button type="button" onClick={shareLinkedIn} aria-label="Share on LinkedIn" className="hidden md:flex h-8 items-center justify-center rounded-full border border-border px-2.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground">
        in
      </button>
      <button type="button" onClick={shareWhatsApp} aria-label="Share on WhatsApp" className="hidden md:flex h-8 items-center justify-center rounded-full border border-border px-2.5 text-[11px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground">
        WA
      </button>
    </div>
  );
}
