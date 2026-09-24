"use client";

import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
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
