"use client";

import { Quote } from "lucide-react";
import { usePortfolioLang } from "@/components/portfolio/PortfolioLangProvider";
import { T } from "@/lib/portfolio-translations";

export function PfPhilosophy() {
  const { lang } = usePortfolioLang();

  return (
    <section className="relative overflow-hidden bg-pf-terracotta py-24 md:py-36">
      {/* noise texture */}
      <div className="absolute inset-0 pf-bg-noise opacity-25" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        {/* quote icon */}
        <div className="reveal mb-8 flex justify-center">
          <Quote className="h-10 w-10 text-pf-cream/40" />
        </div>

        {/* quote text */}
        <blockquote className="reveal font-display text-[clamp(1.5rem,4vw,2.75rem)] leading-snug text-pf-cream" style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
          {T("quote", lang)}
        </blockquote>

        {/* attribution */}
        <div className="reveal mt-10 flex items-center justify-center gap-4" style={{ "--reveal-delay": "200ms" } as React.CSSProperties}>
          <span className="h-px w-16 bg-pf-cream/40" />
          <cite className="not-italic text-sm tracking-[0.18em] text-pf-cream/70">
            {lang === "fa" ? "راضیه خیری‌پور" : "Razieh Kheiripour"}
          </cite>
          <span className="h-px w-16 bg-pf-cream/40" />
        </div>
      </div>
    </section>
  );
}
