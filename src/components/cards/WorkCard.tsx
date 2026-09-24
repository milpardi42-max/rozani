"use client";

import Image from "next/image";
import Link from "next/link";
import { FileDown, ImageOff } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge } from "@/components/ui/Badge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { familyName } from "@/lib/data/families";
import { formatLabel, isExportFormatId } from "@/lib/marketplace/formats";
import type { ShopWork } from "@/lib/marketplace/shop-works";
import { cn, faNum, formatPrice, href, t } from "@/lib/utils";

/**
 * A published artist work in the shop grid — same footprint as `ProductCard`,
 * but it sells a licensed digital file: it links to the work's licence page
 * (`/marketplace/<slug>`), shows the cheapest licence, the delivered formats and
 * the colourways, and has no stock or physical cart.
 */
export function WorkCard({ work, className, priority }: { work: ShopWork; className?: string; priority?: boolean }) {
  const { locale, dict } = useLocale();
  const fa = locale === "fa";
  const url = href(locale, `/marketplace/${work.slug}`);
  const title = t(work.title, locale);
  const formats = work.formats
    .filter(isExportFormatId)
    .map((id) => formatLabel(id, locale))
    .slice(0, 4);

  return (
    <SpotlightCard as="article" className={cn("group relative flex flex-col rounded-lg", className)}>
      <Link href={url} className="relative block overflow-hidden rounded-lg bg-background-secondary" aria-label={title}>
        <div className="relative aspect-square w-full">
          {work.image ? (
            <Image
              src={work.image}
              alt={title}
              fill
              priority={priority}
              sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
              className="img-zoom object-cover anim-scale-fade"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted">
              <ImageOff className="h-6 w-6" />
            </span>
          )}
        </div>
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          {work.artistId ? (
            <Badge tone="glass" className="text-blue">
              {dict.common.artistProduct}
            </Badge>
          ) : (
            <Badge tone="glass" className="text-accent">
              {dict.common.siteExclusive}
            </Badge>
          )}
          <Badge tone="glass">{fa ? "فایل دیجیتال" : "Digital file"}</Badge>
          {work.isNew && <Badge tone="glass">{dict.common.new}</Badge>}
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full glass px-3 text-[13px] font-medium text-foreground">
            <FileDown className="h-3.5 w-3.5" />
            {fa ? "مشاهده و خرید لایسنس" : "View & license"}
          </span>
        </div>
      </Link>

      <div className="flex flex-col gap-2 px-3 pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={url} className="block truncate text-[15px] font-medium text-foreground transition-colors hover:text-accent">
              {title}
            </Link>
            <p className="mt-0.5 truncate text-caption text-foreground-secondary">
              {work.artistName ? t(work.artistName, locale) : dict.brand}
              {work.familyId && <span className="text-muted"> · {familyName(work.familyId, locale)}</span>}
            </p>
          </div>
          <div className="shrink-0 text-end">
            {work.fromPrice ? (
              <>
                <span className="block text-caption text-muted">{fa ? "از" : "from"}</span>
                <span className="block text-sm font-semibold tabular text-foreground">{formatPrice(work.fromPrice, locale)}</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border pt-2.5">
          <span className="text-caption text-foreground-secondary">{fa ? "فایل دیجیتال · لایسنس" : "Digital file · licence"}</span>
          {formats.length > 0 && (
            <span className="truncate text-caption text-muted" dir="ltr">
              {formats.join(" · ")}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="flex items-center gap-1" aria-label={fa ? "رنگ‌بندی‌ها" : "Colourways"}>
            {work.colourways.slice(0, 6).map((colourway) => (
              <span
                key={`${colourway.hex}-${t(colourway.name, "en")}`}
                title={t(colourway.name, locale)}
                className="h-4 w-4 rounded-full border border-border"
                style={{ background: colourway.hex }}
              />
            ))}
          </span>
          <span className="truncate text-caption text-foreground-secondary">
            {fa ? `${faNum(work.colourways.length)} رنگ` : `${work.colourways.length} colour${work.colourways.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
    </SpotlightCard>
  );
}
