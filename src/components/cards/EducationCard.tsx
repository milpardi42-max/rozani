"use client";

import Image from "next/image";
import Link from "next/link";
import { Bookmark, Clock, Layers, Radio, Signal } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/Badge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { cn, faNum, formatDuration, href, t } from "@/lib/utils";
import type { Artist, Category, EducationItem } from "@/lib/types";

export interface EducationCardData extends EducationItem {
  author: Artist | null;
  category: Category | null;
}

export function EducationCard({ item, variant = "default", className, progress }: { item: EducationCardData; variant?: "default" | "large" | "row"; className?: string; progress?: number }) {
  const { locale, dict } = useLocale();
  const [saved, setSaved] = useState(false);
  const url = href(locale, `/academy/${item.slug}`);
  const typeLabel = dict.common[item.type];
  const diff = dict.common[item.difficulty];
  const dur = formatDuration(item.durationMin, locale, dict.common);

  if (variant === "row") {
    return (
      <Link href={url} className={cn("group flex items-center gap-4 border-b border-border py-4 transition-colors hover:bg-background-secondary/60 -mx-3 px-3 rounded-md", className)}>
        <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-background-secondary"><Image src={item.image} alt="" fill sizes="96px" className="img-zoom object-cover" /></span>
        <span className="min-w-0 flex-1">
          <span className="text-caption text-accent">{typeLabel}</span>
          <span className="block truncate font-medium text-foreground">{t(item.title, locale)}</span>
          <span className="block text-caption text-foreground-secondary">{item.author ? t(item.author.name, locale) : dict.brand} · {dur}</span>
        </span>
      </Link>
    );
  }

  const isLive = item.liveEvent?.status === "live";
  const isScheduled = item.liveEvent?.status === "scheduled";
  const isFA = locale === "fa";

  return (
    <SpotlightCard as="article" className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-medium", className)}>
      <Link href={url} className={cn("relative block overflow-hidden bg-background-secondary", variant === "large" ? "aspect-[16/9]" : "aspect-[16/10]")}>
        <Image src={item.image} alt={t(item.title, locale)} fill sizes="(max-width:768px) 100vw, 33vw" className="img-zoom object-cover" />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge tone="glass">{typeLabel}</Badge>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                {isFA ? "زنده" : "LIVE"}
              </span>
            )}
            {isScheduled && !isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                {isFA ? "به‌زودی" : "SOON"}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-pressed={saved}
            aria-label={dict.common.save}
            onClick={(e) => { e.preventDefault(); setSaved((s) => !s); }}
            className={cn("flex h-8 w-8 items-center justify-center rounded-full glass transition-transform active:scale-90", saved ? "text-accent" : "text-foreground")}
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
          </button>
        </div>
        {typeof progress === "number" && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30"><div className="h-full bg-accent" style={{ width: `${progress}%` }} /></div>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 text-caption text-foreground-secondary">
          {item.category && <span>{t(item.category.name, locale)}</span>}
          <span className="text-muted">·</span>
          <span className="inline-flex items-center gap-1"><Signal className="h-3 w-3" />{diff}</span>
        </div>
        <Link href={url} className={cn("mt-2 block font-semibold text-foreground text-balance hover:text-accent transition-colors", variant === "large" ? "text-h3" : "text-h4")}>{t(item.title, locale)}</Link>
        <p className="mt-2 line-clamp-2 text-body-sm text-foreground-secondary">{t(item.excerpt, locale)}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-caption text-foreground-secondary">
          <div className="flex items-center gap-2 min-w-0">
            {item.author && <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full"><Image src={item.author.avatar} alt="" fill sizes="24px" className="object-cover" /></span>}
            <span className="truncate">{item.author ? t(item.author.name, locale) : dict.brand}</span>
          </div>
          <div className="flex items-center gap-3 tabular shrink-0">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{dur}</span>
            {item.lessons > 1 && <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" />{locale === "fa" ? faNum(item.lessons) : item.lessons} {dict.common.lessons}</span>}
          </div>
        </div>
      </div>
    </SpotlightCard>
  );
}
