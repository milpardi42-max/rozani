"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge, Sku } from "@/components/ui/Badge";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { AddToCartButton, FavoriteButton } from "@/components/product/Actions";
import { ColorSwatches } from "@/components/product/ColorSwatches";
import { QuickView } from "@/components/product/QuickView";
import { useHoverCard } from "@/components/ui/HoverCard";
import { cn, formatPrice, href, t } from "@/lib/utils";
import type { Artist, Category, Pattern, Product } from "@/lib/types";

export interface ProductCardData extends Product {
  artist: Artist | null;
  category: Category | null;
  pattern?: Pattern | null;
}

export function useProductColor(product: Product) {
  const [colorId, setColorId] = useState(product.colors[0]?.id);
  const color = useMemo(() => product.colors.find((c) => c.id === colorId) ?? product.colors[0], [product, colorId]);
  return { colorId, setColorId, color };
}

export function ProductCard({ product, variant = "default", className, priority }: { product: ProductCardData; variant?: "default" | "large" | "row" | "compact"; className?: string; priority?: boolean }) {
  const { locale, dict } = useLocale();
  const { colorId, setColorId, color } = useProductColor(product);
  const [quick, setQuick] = useState(false);
  const { onMouseEnter, onMouseLeave, onClick, portal } = useHoverCard({ kind: "product", product });
  const url = href(locale, `/shop/${product.slug}`);
  const siteOwned = !product.artistId;
  const out = color.stock <= 0;
  const swatches = product.colors.map((c) => ({ id: c.id, name: t(c.name, locale), hex: c.hex, stock: c.stock }));

  if (variant === "row") {
    return (
      <>
        <SpotlightCard as="article" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} className={cn("group flex gap-4 rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-medium cursor-pointer", className)}>
          <Link href={url} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-background-secondary">
            <Image key={color.image} src={color.image} alt={t(product.title, locale)} fill sizes="96px" className="img-zoom object-cover anim-scale-fade" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={url} className="block truncate text-[15px] font-medium text-foreground hover:text-accent">{t(product.title, locale)}</Link>
                <div className="mt-1 flex items-center gap-2"><Sku value={product.sku} />{siteOwned ? <Badge tone="accent">{dict.common.siteExclusive}</Badge> : <Badge tone="blue">{dict.common.artistProduct}</Badge>}</div>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular">{formatPrice(product.price, locale)}</span>
            </div>
            <p className="mt-1.5 line-clamp-1 text-caption text-foreground-secondary">{product.specs.map((s) => `${t(s.label, locale)}: ${t(s.value, locale)}`).join(" · ")}</p>
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <ColorSwatches options={swatches} value={colorId} onChange={setColorId} size="sm" label={dict.common.color} />
                <span className="text-caption text-muted">{t(color.name, locale)}</span>
              </div>
              <AddToCartButton variant="icon" disabled={out} line={{ kind: "product", id: product.id, sku: product.sku, title: t(product.title, locale), image: color.image, price: product.price, colorName: t(color.name, locale), colorHex: color.hex, href: url }} />
            </div>
          </div>
        </SpotlightCard>
        {portal}
      </>
    );
  }

  return (
    <>
      <SpotlightCard as="article" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick} className={cn("group relative flex flex-col rounded-lg", className)}>
        <Link href={url} className="relative block overflow-hidden rounded-lg bg-background-secondary" aria-label={t(product.title, locale)}>
          <div className={cn("relative w-full", variant === "large" ? "aspect-[4/5]" : variant === "compact" ? "aspect-[2/1]" : "aspect-square")}>
            <Image
              key={color.image}
              src={color.image}
              alt={`${t(product.title, locale)} — ${t(color.name, locale)}`}
              fill
              priority={priority}
              sizes={variant === "large" ? "(max-width:768px) 100vw, 50vw" : "(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"}
              className="img-zoom object-cover anim-scale-fade"
            />
          </div>
          <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {siteOwned ? <Badge tone="glass" className="text-accent">{dict.common.siteExclusive}</Badge> : <Badge tone="glass" className="text-blue">{dict.common.artistProduct}</Badge>}
              {product.isNew && <Badge tone="glass">{dict.common.new}</Badge>}
              {product.bestSeller && <Badge tone="glass">{dict.common.bestSeller}</Badge>}
            </div>
            <FavoriteButton id={product.id} size="sm" />
          </div>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-between gap-2 opacity-0 transition-[opacity,transform] duration-300 ease-[var(--ease-out)] group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
            <button type="button" onClick={(e) => { e.preventDefault(); setQuick(true); }} className="inline-flex h-9 items-center gap-1.5 rounded-full glass px-3 text-[13px] font-medium text-foreground hover:bg-surface">
              <Eye className="h-3.5 w-3.5" />
              {dict.common.quickView}
            </button>
            <AddToCartButton variant="icon" disabled={out} line={{ kind: "product", id: product.id, sku: product.sku, title: t(product.title, locale), image: color.image, price: product.price, colorName: t(color.name, locale), colorHex: color.hex, href: url }} />
          </div>
        </Link>

        <div className="flex flex-col gap-2 px-3 pt-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={url} className={cn("block truncate font-medium text-foreground transition-colors hover:text-accent", variant === "large" ? "text-h4" : "text-[15px]")}>{t(product.title, locale)}</Link>
              <p className="mt-0.5 truncate text-caption text-foreground-secondary">
                {product.artist ? t(product.artist.name, locale) : dict.brand}
                {product.category && <span className="text-muted"> · {t(product.category.name, locale)}</span>}
              </p>
            </div>
            <div className="shrink-0 text-end">
              <span className="block text-sm font-semibold tabular text-foreground">{formatPrice(product.price, locale)}</span>
              {product.compareAt && <span className="block text-caption tabular text-muted line-through">{formatPrice(product.compareAt, locale)}</span>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Sku value={product.sku} />
            <span className={cn("text-caption", out ? "text-error" : color.stock <= 4 ? "text-warning" : "text-muted")}>{out ? dict.common.outOfStock : color.stock <= 4 ? dict.common.lowStock : dict.common.inStock}</span>
          </div>
          <dl className="grid grid-cols-3 gap-x-2 border-t border-border pt-2.5">
            {product.specs.slice(0, 3).map((s) => (
              <div key={t(s.label, "en")} className="min-w-0">
                <dt className="truncate text-[10px] uppercase tracking-wider text-muted">{t(s.label, locale)}</dt>
                <dd className="truncate text-caption text-foreground-secondary">{t(s.value, locale)}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <ColorSwatches options={swatches} value={colorId} onChange={setColorId} size="sm" label={dict.common.color} />
            <span className="truncate text-caption text-foreground-secondary">{t(color.name, locale)}</span>
          </div>
        </div>
      </SpotlightCard>
      {portal}
      {quick && <QuickView open={quick} onClose={() => setQuick(false)} item={{ kind: "product", product }} />}
    </>
  );
}
