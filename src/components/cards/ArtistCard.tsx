"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Star, UserPlus, Check } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { cn, formatNumber, href, t } from "@/lib/utils";
import type { Artist, Pattern } from "@/lib/types";

export interface ArtistCardData extends Artist {
  featuredPattern: Pattern | null;
  portfolioPreview: string[];
  counts: { patterns: number; projects: number };
}

export function ArtistCard({ artist, variant = "default", className }: { artist: ArtistCardData; variant?: "default" | "large"; className?: string }) {
  const { locale, dict } = useLocale();
  const [following, setFollowing] = useState(false);
  const url = href(locale, `/artists/${artist.slug}`);

  return (
    <SpotlightCard as="article" className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-medium", className)}>
      {/* cover / featured pattern strip */}
      <Link href={url} className={cn("relative block overflow-hidden bg-background-secondary", variant === "large" ? "aspect-[16/9]" : "aspect-[16/10]")}>
        <Image
          src={artist.cover || artist.featuredPattern?.image || artist.avatar}
          alt=""
          fill
          sizes="(max-width:768px) 100vw, 33vw"
          className="img-zoom object-cover"
        />
        <div className="absolute inset-0 vignette opacity-70" />
        {/* Rating badge — top right */}
        {artist.rating > 0 && (
          <div className="absolute inset-inline-end-3 top-3 flex items-center gap-1 rounded-full glass px-2.5 py-1 text-[12px] font-semibold text-white">
            <Star className="h-3 w-3 fill-white text-white" />
            {locale === "fa"
              ? String(artist.rating).replace(".", "٫")
              : artist.rating.toFixed(1)}
          </div>
        )}
        <div className="absolute bottom-3 inset-inline-start-3 flex gap-1.5">
          {(artist.portfolioPreview.length ? artist.portfolioPreview : [artist.featuredPattern?.image].filter(Boolean) as string[]).slice(0, 3).map((src) => (
            <span key={src} className="relative h-10 w-10 overflow-hidden rounded-sm ring-1 ring-white/50 sm:h-12 sm:w-12">
              <Image src={src} alt="" fill sizes="48px" className="object-cover" />
            </span>
          ))}
        </div>
      </Link>
      <div className="relative flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-8 flex items-end justify-between gap-3">
          <Link href={url} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-soft ring-1 ring-black/5">
            <Image src={artist.avatar} alt={t(artist.name, locale)} fill sizes="64px" className="object-cover object-top" />
          </Link>
          <button
            type="button"
            aria-pressed={following}
            onClick={() => setFollowing((f) => !f)}
            className={cn("mb-1 inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-caption font-medium transition-all duration-200 active:scale-95", following ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground")}
          >
            {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {following ? dict.common.following : dict.common.follow}
          </button>
        </div>
        <Link href={url} className="mt-3 block text-h4 font-semibold text-foreground hover:text-accent transition-colors">{t(artist.name, locale)}</Link>
        <p className="text-caption text-accent">{t(artist.profession, locale)}</p>
        <p className="mt-2.5 line-clamp-2 text-body-sm text-foreground-secondary">{t(artist.bio, locale)}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3.5 text-caption text-foreground-secondary">
          <div className="flex gap-4 tabular">
            <span><strong className="font-semibold text-foreground">{artist.counts.patterns}</strong> {dict.common.patterns}</span>
            <span><strong className="font-semibold text-foreground">{artist.counts.projects}</strong> {dict.common.projects}</span>
            <span><strong className="font-semibold text-foreground">{formatNumber(artist.followers, locale)}</strong> {dict.common.followers}</span>
          </div>
          <Link href={url} aria-label={dict.common.viewProfile} className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground">
            <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
          </Link>
        </div>
      </div>
    </SpotlightCard>
  );
}
