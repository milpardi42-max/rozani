"use client";

/**
 * Client wrapper for pattern PDP: keeps Gallery + BuyBox colourway selection in sync
 * (Spoonflower-style — pick a colourway circle, main image updates).
 */
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, FileDown, Shield } from "lucide-react";
import { Gallery } from "@/components/product/Gallery";
import { PatternBuyBox } from "@/components/product/PatternBuyBox";
import { ColorwayDots, resolveColorways } from "@/components/product/ColorwayDots";
import { Badge, Sku } from "@/components/ui/Badge";
import { useLocale } from "@/components/providers/AppProviders";
import { faNum, href, t } from "@/lib/utils";
import type { PatternCardData } from "@/components/cards/PatternCard";
import type { Artist, Space } from "@/lib/types";

export function PatternDetailView({
  pattern,
  artist,
  spaces,
}: {
  pattern: PatternCardData;
  artist: Artist | null;
  spaces: Space[];
}) {
  const { locale, dict } = useLocale();
  const colorways = useMemo(() => resolveColorways(pattern), [pattern]);
  const defaultCw = colorways.find((c) => c.isDefault) ?? colorways[0];
  const [cwId, setCwId] = useState(defaultCw?.id ?? "default");
  const activeCw = colorways.find((c) => c.id === cwId) ?? defaultCw;

  const galleryImages = useMemo(() => {
    const fromCw = colorways.map((c) => c.image).filter(Boolean);
    const base = pattern.gallery?.length ? pattern.gallery : [pattern.image];
    // colourway images first (unique), then remaining gallery frames
    const seen = new Set<string>();
    const out: string[] = [];
    for (const src of [...fromCw, ...base, pattern.image]) {
      if (src && !seen.has(src)) {
        seen.add(src);
        out.push(src);
      }
    }
    return out;
  }, [colorways, pattern.gallery, pattern.image]);

  const activeImage = activeCw?.image || pattern.image;

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-7">
        <Gallery images={galleryImages} alt={t(pattern.title, locale)} active={activeImage} />
      </div>

      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-[calc(var(--header-h-compact)+1.5rem)]">
          <div className="flex flex-wrap items-center gap-2">
            <Sku value={pattern.sku} />
            {pattern.category && <Badge>{t(pattern.category.name, locale)}</Badge>}
            {pattern.isNew && <Badge tone="accent">{dict.common.new}</Badge>}
            {pattern.trending && <Badge tone="blue">{dict.common.trending}</Badge>}
            {!pattern.artistId && <Badge tone="accent">{dict.common.sitePattern}</Badge>}
          </div>
          <h1 className="mt-4 font-display text-h1 text-balance">{t(pattern.title, locale)}</h1>

          {artist ? (
            <Link href={href(locale, `/artists/${artist.slug}`)} className="mt-4 inline-flex items-center gap-3 group">
              <span className="relative h-10 w-10 overflow-hidden rounded-full">
                <Image src={artist.avatar} alt="" fill sizes="40px" className="object-cover" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground group-hover:text-accent">{t(artist.name, locale)}</span>
                <span className="block text-caption text-foreground-secondary">{t(artist.profession, locale)}</span>
              </span>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-foreground-secondary">{dict.brand}</p>
          )}

          <p className="mt-6 text-body text-foreground-secondary">{t(pattern.description, locale)}</p>

          {/* Colourways block — always visible on PDP */}
          {colorways.length > 0 && (
            <div className="mt-8 rounded-xl border border-border bg-background-secondary/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label text-muted">
                  {locale === "fa" ? "رنگ‌بندی‌ها" : "Colourways"}
                </p>
                <span className="text-caption text-foreground-secondary tabular">
                  {colorways.length}{" "}
                  {locale === "fa" ? "گزینه" : colorways.length === 1 ? "option" : "options"}
                  {activeCw ? ` · ${t(activeCw.name, locale)}` : ""}
                </span>
              </div>
              <div className="mt-3">
                <ColorwayDots
                  colorways={colorways}
                  value={activeCw?.id}
                  onChange={setCwId}
                  size="lg"
                  max={10}
                  locale={locale}
                  showCount={false}
                />
              </div>
              {/* mini preview strip like Spoonflower */}
              {colorways.length > 1 && (
                <div className="mt-4 no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {colorways.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCwId(c.id)}
                      title={t(c.name, locale)}
                      className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-md ring-offset-2 ring-offset-background transition-all ${
                        c.id === activeCw?.id ? "ring-2 ring-foreground scale-105" : "opacity-75 hover:opacity-100 ring-1 ring-border"
                      }`}
                    >
                      <Image src={c.image} alt={t(c.name, locale)} fill sizes="56px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-6 text-sm">
            <Spec k={dict.common.repeat} v={t(pattern.specs.repeat, locale)} />
            <Spec k={dict.common.dpi} v={pattern.specs.dpi} />
            <Spec k={dict.common.formats} v={pattern.specs.formats} />
            <Spec
              k={locale === "fa" ? "رنگ‌بندی‌ها" : "Colourways"}
              v={String(colorways.length || pattern.specs.colors)}
            />
            <Spec k={locale === "fa" ? "مقیاس" : "Scale"} v={t(pattern.specs.scale, locale)} />
            {spaces.length > 0 && (
              <div>
                <dt className="text-caption text-muted">{dict.nav.spaces}</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {spaces.map((s) => t(s.name, locale)).join(" · ")}
                </dd>
              </div>
            )}
            {pattern.palette.length > 0 && (
              <div className="col-span-2">
                <dt className="text-caption text-muted">{locale === "fa" ? "پالت" : "Palette"}</dt>
                <dd className="mt-1.5 flex gap-1.5">
                  {pattern.palette.map((c) => (
                    <span key={c} className="h-5 w-5 rounded-full ring-1 ring-border" style={{ background: c }} title={c} />
                  ))}
                </dd>
              </div>
            )}
          </dl>

          {/* Buy box without duplicate colourway UI — pass controlled selection */}
          <PatternBuyBox pattern={pattern} colorwayId={cwId} onColorwayChange={setCwId} hideColorwayPicker />

          <ul className="mt-8 space-y-3 text-sm text-foreground-secondary">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {locale === "fa"
                ? "لایسنس تجاری برای کاغذدیواری، پارچه، پرده و دکور."
                : "Commercial license for wallpaper, fabric, curtains and décor."}
            </li>
            <li className="flex gap-2">
              <FileDown className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {locale === "fa" ? "دانلود فوری پس از خرید · AI / PDF / TIFF" : "Instant download after purchase · AI / PDF / TIFF"}
            </li>
            <li className="flex gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {locale === "fa" ? "پشتیبانی از چند رنگ‌بندی (colorways)" : "Multiple colourways supported"}
            </li>
            {pattern.likes > 0 && (
              <li className="text-caption text-muted">
                {locale === "fa" ? `${faNum(pattern.likes)} پسند` : `${pattern.likes} likes`}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-caption text-muted">{k}</dt>
      <dd className="mt-1 font-medium text-foreground" dir="auto">
        {v}
      </dd>
    </div>
  );
}
