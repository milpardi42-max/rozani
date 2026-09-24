"use client";

import { cn } from "@/lib/utils";
import type { Colorway } from "@/lib/types";
import type { Locale } from "@/lib/i18n/types";
import { t } from "@/lib/utils";

/**
 * Spoonflower-style circular colourway swatches.
 * Click stops propagation so parent card links don't navigate.
 */
export function ColorwayDots({
  colorways,
  value,
  onChange,
  size = "md",
  max = 6,
  locale = "en",
  className,
  showCount = true,
}: {
  colorways: Colorway[];
  value?: string;
  onChange?: (id: string) => void;
  size?: "sm" | "md" | "lg";
  max?: number;
  locale?: Locale;
  className?: string;
  showCount?: boolean;
}) {
  if (!colorways?.length) return null;
  const dim = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  const shown = colorways.slice(0, max);
  const extra = colorways.length - shown.length;
  const interactive = typeof onChange === "function";

  return (
    <div
      role={interactive ? "radiogroup" : "list"}
      aria-label={locale === "fa" ? "رنگ‌بندی‌ها" : "Colourways"}
      className={cn("flex items-center gap-1.5", className)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {shown.map((cw) => {
        const active = value ? cw.id === value : Boolean(cw.isDefault);
        const light = isLight(cw.hex);
        return (
          <button
            key={cw.id}
            type="button"
            role={interactive ? "radio" : undefined}
            aria-checked={interactive ? active : undefined}
            aria-label={t(cw.name, locale)}
            title={t(cw.name, locale)}
            disabled={!interactive}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange?.(cw.id);
            }}
            className={cn(
              "relative shrink-0 rounded-full border transition-[transform,box-shadow] duration-200",
              dim,
              interactive && "hover:scale-110 active:scale-95 cursor-pointer",
              !interactive && "cursor-default",
              active
                ? "ring-2 ring-foreground ring-offset-1 ring-offset-surface scale-105"
                : "ring-1 ring-black/15 dark:ring-white/25",
            )}
            style={{ backgroundColor: cw.hex }}
          >
            {/* subtle inner rim for light colours */}
            {light && <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/10" />}
          </button>
        );
      })}
      {showCount && extra > 0 && (
        <span className="ms-0.5 text-[11px] font-medium tabular text-foreground-secondary">
          +{extra}
        </span>
      )}
    </div>
  );
}

/** Compact read-only row: dots + "N colourways" label */
export function ColorwayMeta({
  colorways,
  locale,
  className,
}: {
  colorways?: Colorway[];
  locale: Locale;
  className?: string;
}) {
  if (!colorways?.length) return null;
  const n = colorways.length;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ColorwayDots colorways={colorways} size="sm" max={5} locale={locale} showCount={false} />
      <span className="text-caption text-muted tabular">
        {locale === "fa" ? `${n} رنگ‌بندی` : `${n} colourway${n === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

function isLight(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

export function resolveColorways(pattern: {
  image: string;
  palette?: string[];
  colorways?: Colorway[];
  title?: { fa: string; en: string };
}): Colorway[] {
  if (pattern.colorways && pattern.colorways.length > 0) return pattern.colorways;
  // Fallback: build soft colourways from palette hexes using the same image
  const palette = pattern.palette ?? [];
  if (!palette.length) {
    return [
      {
        id: "default",
        name: { fa: "اصلی", en: "Default" },
        hex: "#8a8f98",
        image: pattern.image,
        isDefault: true,
      },
    ];
  }
  return palette.map((hex, i) => ({
    id: `pal-${i}`,
    name: { fa: i === 0 ? "اصلی" : `رنگ ${i + 1}`, en: i === 0 ? "Default" : `Colour ${i + 1}` },
    hex,
    image: pattern.image,
    isDefault: i === 0,
  }));
}
