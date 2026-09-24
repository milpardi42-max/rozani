"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Reveal } from "@/components/ui/Reveal";
import { cn, faNum, href, t } from "@/lib/utils";
import type { EnrichedPortfolio } from "@/lib/data/queries";
import type { Category } from "@/lib/types";

interface Props {
  items: EnrichedPortfolio[];
  categories: Category[];
}

export function PortfolioGrid({ items, categories }: Props) {
  const { locale, dict } = useLocale();
  const [active, setActive] = useState<string>("all");

  const sorted = active === "all" ? items : items.filter((c) => c.categoryId === active);

  return (
    <>
      {/* filter bar */}
      <div className="container-x mt-8 flex flex-wrap gap-2">
        {[{ id: "all", label: dict.common.all }, ...categories.map((category) => ({ id: category.id, label: t(category.name, locale) }))].map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActive(filter.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              active === filter.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* masonry grid */}
      {sorted.length === 0 ? (
        <p className="container-x mt-20 text-center text-body text-muted">{dict.common.empty}</p>
      ) : (
        <div className="container-x mt-10 columns-1 gap-4 pb-24 sm:columns-2 lg:columns-3" style={{ columnFill: "balance" }}>
          {sorted.map((c, i) => (
            <Reveal key={c.id} delay={i * 50} className="mb-4 break-inside-avoid">
              <Link
                href={href(locale, `/portfolio/${c.slug}`)}
                className="group relative block overflow-hidden rounded-lg bg-background-secondary"
              >
                <div
                  className={cn(
                    "relative w-full overflow-hidden",
                    i % 5 === 0 ? "aspect-[3/4]" :
                    i % 5 === 1 ? "aspect-[4/3]" :
                    i % 5 === 2 ? "aspect-square" :
                    i % 5 === 3 ? "aspect-[3/4]" : "aspect-[16/10]"
                  )}
                >
                  <Image
                    src={c.cover}
                    alt={t(c.title, locale)}
                    fill
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                  <div
                    className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ backgroundColor: "var(--accent)" }}
                  />
                </div>

                <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-label text-white/60">
                        {t(c.client, locale)} · {locale === "fa" ? faNum(c.year) : c.year}
                      </p>
                      <h3 className="mt-1.5 font-display text-h3 leading-tight text-balance">
                        {t(c.title, locale)}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-caption text-white/70 opacity-0 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                        {t(c.subtitle, locale)}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition-all duration-300 group-hover:border-white/70 group-hover:bg-white/10">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </>
  );
}
