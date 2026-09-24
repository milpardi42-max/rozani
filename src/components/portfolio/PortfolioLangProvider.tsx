"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Lang } from "@/lib/portfolio-translations";

interface PortfolioLangCtx {
  lang: Lang;
  toggle: () => void;
}

const Ctx = createContext<PortfolioLangCtx>({ lang: "fa", toggle: () => {} });

export function usePortfolioLang() {
  return useContext(Ctx);
}

export function PortfolioLangProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);

  /* Sync with <html> dir/lang attributes */
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", lang);
    html.setAttribute("dir", lang === "fa" ? "rtl" : "ltr");
  }, [lang]);

  /* Persist preference */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pf-lang") as Lang | null;
      if (saved === "fa" || saved === "en") {
        setLang(saved);
      }
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === "fa" ? "en" : "fa";
      try {
        localStorage.setItem("pf-lang", next);
      } catch {}
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ lang, toggle }}>{children}</Ctx.Provider>;
}
