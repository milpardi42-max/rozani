"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import { usePortfolioLang } from "@/components/portfolio/PortfolioLangProvider";
import { T, WORKS, type Work } from "@/lib/portfolio-translations";

type Filter = "all" | Work["category"];

const FILTER_KEYS: { key: Filter; trKey: string }[] = [
  { key: "all", trKey: "filterAll" },
  { key: "pattern", trKey: "filterPattern" },
  { key: "wallpaper", trKey: "filterWallpaper" },
  { key: "textile", trKey: "filterTextile" },
  { key: "drapery", trKey: "filterDrapery" },
];

export function PfPortfolio() {
  const { lang } = usePortfolioLang();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Work | null>(null);

  const visible = filter === "all" ? WORKS : WORKS.filter((w) => w.category === filter);

  return (
    <section id="works" className="bg-pf-ink py-20 md:py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        {/* section header */}
        <div className="reveal mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-pf-gold">
              {T("portfolioLabel", lang)}
            </p>
            <h2 className="font-display text-[clamp(2.5rem,6vw,4rem)] leading-none text-pf-cream">
              {T("portfolioTitle", lang)}
            </h2>
          </div>
          <p className="max-w-xs text-sm text-pf-stone/70">
            {T("portfolioDesc", lang)}
          </p>
        </div>

        {/* filter buttons */}
        <div className="reveal mb-10 flex flex-wrap gap-2">
          {FILTER_KEYS.map(({ key, trKey }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition-colors ${
                filter === key
                  ? "border-pf-gold bg-pf-gold text-pf-ink"
                  : "border-white/20 text-white/60 hover:border-pf-gold/50 hover:text-pf-gold"
              }`}
            >
              {T(trKey, lang)}
            </button>
          ))}
        </div>

        {/* masonry-like grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((work) => (
            <div
              key={work.id}
              className={`group reveal relative cursor-pointer overflow-hidden rounded-xl ${
                work.layout === "tall" ? "sm:row-span-2" : ""
              } ${work.layout === "wide" ? "sm:col-span-2" : ""}`}
              onClick={() => setSelected(work)}
            >
              <div
                className={`relative w-full overflow-hidden ${
                  work.layout === "tall"
                    ? "aspect-[3/5]"
                    : work.layout === "wide"
                      ? "aspect-[4/3]"
                      : "aspect-square"
                }`}
              >
                <Image
                  src={work.image}
                  alt={work.title[lang]}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* hover overlay */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-pf-ink/80 via-pf-ink/20 to-transparent p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="mb-1 block rounded-full bg-pf-gold/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-pf-ink">
                        {T(`filter${work.category.charAt(0).toUpperCase() + work.category.slice(1)}`, lang)}
                      </span>
                      <p className="text-[11px] text-pf-stone/60">{work.year}</p>
                      <h3 className="font-display text-lg text-white">{work.title[lang]}</h3>
                    </div>
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-pf-gold text-pf-ink">
                      <Plus className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/60">
                    {T("viewDetails", lang)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-pf-ink/80 p-4 backdrop-blur-md"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-pf-cream shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute end-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-pf-ink/10 text-pf-charcoal transition-colors hover:bg-pf-ink/20"
              onClick={() => setSelected(null)}
              aria-label={T("close", lang)}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid md:grid-cols-2">
              <div className="relative aspect-square md:aspect-auto">
                <Image
                  src={selected.image}
                  alt={selected.title[lang]}
                  fill
                  sizes="(min-width: 768px) 50vw, 90vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col justify-center p-8">
                <span className="mb-3 inline-block rounded-full bg-pf-terracotta/15 px-3 py-1 text-[11px] uppercase tracking-[0.15em] text-pf-terracotta">
                  {T(`filter${selected.category.charAt(0).toUpperCase() + selected.category.slice(1)}`, lang)}
                </span>
                <h3 className="font-display text-2xl text-pf-charcoal">{selected.title[lang]}</h3>
                <p className="mt-1 text-sm text-pf-terracotta/70">{selected.year}</p>
                <p className="mt-4 text-pf-charcoal/70 leading-relaxed">{selected.description[lang]}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
