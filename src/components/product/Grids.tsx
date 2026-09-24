"use client";

import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { WorkCard } from "@/components/cards/WorkCard";
import type { ShopWork } from "@/lib/marketplace/shop-works";
import { Reveal } from "@/components/ui/Reveal";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/lib/utils";

/** Editorial pattern grid: every 7th item becomes a wide feature — controlled variation. */
export function PatternGrid({ patterns, className }: { patterns: PatternCardData[]; className?: string }) {
  if (!patterns.length) return <EmptyState />;
  return (
    <div className={cn("grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4", className)}>
      {patterns.map((p, i) => {
        const feature = i % 7 === 0 && patterns.length > 3;
        return (
          <Reveal key={p.id} delay={(i % 4) * 50} className={cn(feature && "col-span-2")}>
            <PatternCard pattern={p} variant={feature ? "wide" : "default"} priority={i < 4} />
          </Reveal>
        );
      })}
    </div>
  );
}

export function ProductGrid({ products, className }: { products: ProductCardData[]; className?: string }) {
  if (!products.length) return <EmptyState />;
  return (
    <div className={cn("grid grid-cols-1 gap-x-4 gap-y-8 xs:grid-cols-2 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <Reveal key={p.id} delay={(i % 4) * 50}>
          <ProductCard product={p} priority={i < 4} />
        </Reveal>
      ))}
    </div>
  );
}

/** One tile of the shop: a physical product, or a published artist work (digital licence). */
export type ShopGridItem = { kind: "product"; key: string; product: ProductCardData } | { kind: "work"; key: string; work: ShopWork };

/** The shop grid — products and artist works side by side, same rhythm as `ProductGrid`. */
export function ShopItemGrid({ items, className }: { items: ShopGridItem[]; className?: string }) {
  if (!items.length) return <EmptyState />;
  return (
    <div className={cn("grid grid-cols-1 gap-x-4 gap-y-8 xs:grid-cols-2 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4", className)}>
      {items.map((item, i) => (
        <Reveal key={item.key} delay={(i % 4) * 50}>
          {item.kind === "product" ? <ProductCard product={item.product} priority={i < 4} /> : <WorkCard work={item.work} priority={i < 4} />}
        </Reveal>
      ))}
    </div>
  );
}
