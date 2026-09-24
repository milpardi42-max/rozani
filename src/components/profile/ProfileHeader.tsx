"use client";

import Image from "next/image";
import { Check, Globe, MapPin, Star, UserPlus, Camera, Share2 } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { cn, faNum, formatNumber, t } from "@/lib/utils";
import type { Artist } from "@/lib/types";

export function ProfileHeader({ artist, counts, children }: { artist: Artist; counts: { patterns: number; products: number; projects: number }; children?: React.ReactNode }) {
  const { locale, dict } = useLocale();
  const [following, setFollowing] = useState(false);
  const n = (v: number) => (locale === "fa" ? faNum(v) : String(v));

  return (
    <header className="relative">
      {/* Cover */}
      <div className="relative h-[42svh] min-h-[300px] w-full overflow-hidden bg-[#0d1117]">
        <Image src={artist.cover} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-[#0a0d13]/40" />
        {children && (
          <div className="absolute inset-x-0 bottom-6 container-x">{children}</div>
        )}
      </div>
      <div className="container-x">
        <div className="-mt-16 flex flex-col gap-6 md:-mt-20 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-5">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-background shadow-medium md:h-40 md:w-40">
              <Image src={artist.avatar} alt={t(artist.name, locale)} fill sizes="160px" className="object-cover" />
            </div>
            <div className="pb-1">
              <p className="text-label text-accent">{t(artist.profession, locale)}</p>
              <h1 className="mt-1 font-display text-h1">{t(artist.name, locale)}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-foreground-secondary">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{t(artist.location, locale)}</span>
                <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-accent text-accent" />{n(artist.rating)} · {n(artist.reviewsCount)} {dict.common.reviews}</span>
              </div>
              {artist.tags && artist.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {artist.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-border bg-background-secondary px-2.5 py-0.5 text-[11px] text-foreground-secondary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pb-1">
            {artist.social.instagram && <a href={`https://instagram.com/${artist.social.instagram}`} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-foreground"><Camera className="h-4 w-4" /></a>}
            {artist.social.website && <a href={`https://${artist.social.website}`} target="_blank" rel="noreferrer" aria-label="Website" className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-foreground"><Globe className="h-4 w-4" /></a>}
            <button type="button" aria-label="Share" onClick={() => navigator.share?.({ url: window.location.href }).catch(() => {})} className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-foreground"><Share2 className="h-4 w-4" /></button>
            <Button variant={following ? "outline" : "primary"} onClick={() => setFollowing((f) => !f)} aria-pressed={following} className={cn("min-w-32")}>
              {following ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {following ? dict.common.following : dict.common.follow}
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <p className="prose-ra lg:col-span-8">{t(artist.bio, locale)}</p>
          <dl className="grid grid-cols-4 gap-4 lg:col-span-4">
            {[[counts.patterns, dict.common.patterns], [counts.products, dict.common.products], [counts.projects, dict.common.projects], [formatNumber(artist.followers, locale), dict.common.followers]].map(([v, l]) => (
              <div key={String(l)} className="rounded-lg border border-border p-3 text-center">
                <dd className="font-display text-h3 tabular">{typeof v === "number" ? n(v) : v}</dd>
                <dt className="text-[11px] text-foreground-secondary">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </header>
  );
}
