"use client";

import { usePortfolioLang } from "./PortfolioLangProvider";

export function LangToggle() {
  const { lang, toggle } = usePortfolioLang();
  return (
    <button
      onClick={toggle}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 text-[11px] uppercase tracking-[0.2em] text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
      aria-label="Switch language"
    >
      <span className={lang === "fa" ? "text-white" : "text-white/40"}>FA</span>
      <span className="text-white/30">/</span>
      <span className={lang === "en" ? "text-white" : "text-white/40"}>EN</span>
    </button>
  );
}
