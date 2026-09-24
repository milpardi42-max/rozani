"use client";

import { Heart, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useFavorites, useLocale } from "@/components/providers/AppProviders";
import { Gallery } from "./Gallery";
import { ColorSwatches } from "./ColorSwatches";
import { AddToCartButton } from "./Actions";
import { cn, formatPrice, href, t } from "@/lib/utils";
import type { ProductCardData } from "@/components/cards/ProductCard";

/** Client island: gallery + color/size/qty selection kept in sync. */
export function ProductBuyBox({ product, children }: { product: ProductCardData; children: React.ReactNode }) {
  const { locale, dict } = useLocale();
  const { has, toggle } = useFavorites();
  const [colorId, setColorId] = useState(product.colors[0].id);
  const [size, setSize] = useState(0);
  const [qty, setQty] = useState(1);
  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0];
  const out = color.stock <= 0;
  const fav = has(product.id);
  const gallery = [color.image, ...product.colors.filter((c) => c.id !== color.id).map((c) => c.image)];
  const sizeLabel = t(product.sizes[size], locale);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-7"><Gallery key={color.id} images={gallery} alt={`${t(product.title, locale)} — ${t(color.name, locale)}`} ratio="aspect-square md:aspect-[4/5]" /></div>
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-[calc(var(--header-h-compact)+1.5rem)]">
          {children}

          <div className="mt-8 space-y-6 border-t border-border pt-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-label text-muted">{dict.common.color}</p>
                <p className="text-sm">{t(color.name, locale)} <span className={cn("text-caption", out ? "text-error" : color.stock <= 4 ? "text-warning" : "text-success")}>· {out ? dict.common.outOfStock : color.stock <= 4 ? dict.common.lowStock : dict.common.inStock}</span></p>
              </div>
              <ColorSwatches className="mt-3" size="lg" label={dict.common.color} options={product.colors.map((c) => ({ id: c.id, name: t(c.name, locale), hex: c.hex, stock: c.stock }))} value={colorId} onChange={setColorId} />
            </div>
            {product.sizes.length > 0 && (
              <div>
                <p className="text-label text-muted">{dict.common.size}</p>
                <div role="radiogroup" className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map((s, i) => (
                    <button key={i} role="radio" aria-checked={size === i} onClick={() => setSize(i)} className={cn("rounded-md border px-4 py-2 text-sm tabular transition-colors", size === i ? "border-foreground bg-background-secondary" : "border-border hover:border-foreground/50")} dir="auto">{t(s, locale)}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-label text-muted">{dict.common.price}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-h2 font-semibold tabular">{formatPrice(product.price, locale)}</span>
                  {product.compareAt && <span className="text-body-sm tabular text-muted line-through">{formatPrice(product.compareAt, locale)}</span>}
                </div>
              </div>
              <div className="inline-flex items-center rounded-md border border-border">
                <button aria-label="-" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center hover:text-accent"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-sm tabular">{qty}</span>
                <button aria-label="+" onClick={() => setQty((q) => Math.min(color.stock || 1, q + 1))} className="flex h-11 w-11 items-center justify-center hover:text-accent"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AddToCartButton variant="wide" disabled={out} line={{ kind: "product", id: product.id, sku: product.sku, title: `${t(product.title, locale)}${sizeLabel ? ` · ${sizeLabel}` : ""}`, image: color.image, price: product.price, colorName: t(color.name, locale), colorHex: color.hex, href: href(locale, `/shop/${product.slug}`), qty }} />
              <button type="button" aria-pressed={fav} aria-label={dict.common.favorite} onClick={() => toggle(product.id)} className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-md border transition-colors", fav ? "border-accent text-accent" : "border-border hover:border-foreground")}>
                <Heart className={cn("h-5 w-5", fav && "fill-current")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
