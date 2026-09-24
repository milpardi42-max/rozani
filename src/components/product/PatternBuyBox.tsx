"use client";

import { Heart } from "lucide-react";
import { useMemo, useState } from "react";
import { useFavorites, useLocale } from "@/components/providers/AppProviders";
import { cn, formatPrice, href, t } from "@/lib/utils";
import type { PatternCardData } from "@/components/cards/PatternCard";
import { AddToCartButton } from "./Actions";
import { ColorwayDots, resolveColorways } from "./ColorwayDots";
import Image from "next/image";

const LICENSES = [
  { id: "personal", fa: "شخصی", en: "Personal", mult: 1 },
  { id: "commercial", fa: "تجاری", en: "Commercial", mult: 2.4 },
  { id: "extended", fa: "گسترده", en: "Extended", mult: 4 },
];

export function PatternBuyBox({
  pattern,
  colorwayId,
  onColorwayChange,
  hideColorwayPicker = false,
}: {
  pattern: PatternCardData;
  /** Controlled colourway id (from parent PDP). */
  colorwayId?: string;
  onColorwayChange?: (id: string) => void;
  /** When true, colourway UI is rendered by parent (PatternDetailView). */
  hideColorwayPicker?: boolean;
}) {
  const { locale, dict } = useLocale();
  const { has, toggle } = useFavorites();
  const [lic, setLic] = useState(LICENSES[1]);
  const colorways = useMemo(() => resolveColorways(pattern), [pattern]);
  const defaultCw = colorways.find((c) => c.isDefault) ?? colorways[0];
  const [internalCwId, setInternalCwId] = useState(defaultCw?.id ?? "default");
  const cwId = colorwayId ?? internalCwId;
  const setCwId = onColorwayChange ?? setInternalCwId;
  const activeCw = colorways.find((c) => c.id === cwId) ?? defaultCw;
  const price = { fa: Math.round((pattern.price.fa * lic.mult) / 10000) * 10000, en: Math.round(pattern.price.en * lic.mult) };
  const fav = has(pattern.id);
  const image = activeCw?.image || pattern.image;

  return (
    <div className="mt-6">
      {!hideColorwayPicker && colorways.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-label text-muted">
              {locale === "fa" ? "رنگ‌بندی" : "Colourway"}
            </p>
            <span className="text-caption text-foreground-secondary">
              {activeCw ? t(activeCw.name, locale) : ""} · {colorways.length}{" "}
              {locale === "fa" ? "گزینه" : "options"}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <ColorwayDots
              colorways={colorways}
              value={activeCw?.id}
              onChange={setCwId}
              size="lg"
              max={8}
              locale={locale}
              showCount={false}
            />
          </div>
          {activeCw && (
            <div className="mt-4 relative aspect-[16/10] overflow-hidden rounded-lg border border-border bg-background-secondary">
              <Image
                key={image}
                src={image}
                alt={t(activeCw.name, locale)}
                fill
                sizes="(max-width:768px) 100vw, 40vw"
                className="object-cover anim-scale-fade"
              />
            </div>
          )}
        </div>
      )}

      <p className="text-label text-muted">{dict.common.license}</p>
      <div role="radiogroup" className="mt-3 grid grid-cols-3 gap-2">
        {LICENSES.map((l) => (
          <button key={l.id} role="radio" aria-checked={lic.id === l.id} onClick={() => setLic(l)} className={cn("rounded-md border px-3 py-2.5 text-start transition-colors", lic.id === l.id ? "border-foreground bg-background-secondary" : "border-border hover:border-foreground/50")}>
            <span className="block text-sm font-medium">{locale === "fa" ? l.fa : l.en}</span>
            <span className="block text-caption text-foreground-secondary tabular">{formatPrice({ fa: Math.round((pattern.price.fa * l.mult) / 10000) * 10000, en: Math.round(pattern.price.en * l.mult) }, locale)}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className="text-h2 font-semibold tabular">{formatPrice(price, locale)}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <AddToCartButton
          variant="wide"
          line={{
            kind: "pattern",
            id: pattern.id,
            sku: pattern.sku,
            title: `${t(pattern.title, locale)} — ${activeCw ? t(activeCw.name, locale) : ""} · ${locale === "fa" ? lic.fa : lic.en}`,
            image,
            price,
            href: href(locale, `/patterns/${pattern.slug}`),
            colorName: activeCw ? t(activeCw.name, locale) : locale === "fa" ? lic.fa : lic.en,
            colorHex: activeCw?.hex,
          }}
        />
        <button type="button" aria-pressed={fav} aria-label={dict.common.favorite} onClick={() => toggle(pattern.id)} className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-md border transition-colors", fav ? "border-accent text-accent" : "border-border hover:border-foreground")}>
          <Heart className={cn("h-5 w-5", fav && "fill-current")} />
        </button>
      </div>
    </div>
  );
}
