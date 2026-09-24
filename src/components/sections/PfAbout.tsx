"use client";

import Image from "next/image";
import { usePortfolioLang } from "@/components/portfolio/PortfolioLangProvider";
import { T } from "@/lib/portfolio-translations";

export function PfAbout() {
  const { lang } = usePortfolioLang();

  return (
    <section id="about" className="bg-pf-cream py-20 md:py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* image column */}
          <div className="reveal lg:col-span-5">
            <div className="relative">
              {/* offset border decoration */}
              <div className="absolute -bottom-4 -end-4 h-full w-full rounded-lg border-2 border-pf-terracotta/30" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                <Image
                  src="/images/hero/hero-back.webp"
                  alt={lang === "fa" ? "پرتره راضیه خیری‌پور" : "Razieh Kheiripour portrait"}
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  quality={90}
                  className="object-cover object-top grayscale transition-all duration-700 hover:grayscale-0"
                />
              </div>
              {/* experience badge */}
              <div className="absolute -bottom-2 end-4 rounded-full bg-pf-terracotta px-4 py-2 text-sm font-medium text-pf-cream shadow-lg">
                {T("experience", lang)}
              </div>
            </div>
          </div>

          {/* text column */}
          <div className="reveal lg:col-span-7 flex flex-col justify-center" style={{ "--reveal-delay": "150ms" } as React.CSSProperties}>
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-pf-terracotta">
              {T("aboutLabel", lang)}
            </p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-pf-charcoal mb-6">
              {T("aboutTitle", lang)}
            </h2>
            <div className="space-y-4 text-pf-charcoal/75 leading-relaxed">
              <p>{T("aboutBio1", lang)}</p>
              <p>{T("aboutBio2", lang)}</p>
              <p>{T("aboutBio3", lang)}</p>
            </div>

            {/* stats */}
            <div className="mt-8 grid grid-cols-3 divide-x divide-pf-terracotta/20 border-t border-pf-terracotta/20 pt-6 rtl:divide-x-reverse">
              {(
                [
                  ["stat1Val", "stat1Label"],
                  ["stat2Val", "stat2Label"],
                  ["stat3Val", "stat3Label"],
                ] as const
              ).map(([val, label]) => (
                <div key={val} className="pe-4 ps-0 first:ps-0 rtl:last:ps-4">
                  <div className="font-display text-2xl text-pf-terracotta">{T(val, lang)}</div>
                  <div className="mt-0.5 text-xs text-pf-charcoal/55">{T(label, lang)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
