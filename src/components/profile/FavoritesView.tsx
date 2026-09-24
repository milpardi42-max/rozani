"use client";

import { useFavorites, useLocale } from "@/components/providers/AppProviders";
import { PatternCard, type PatternCardData } from "@/components/cards/PatternCard";
import { ProductCard, type ProductCardData } from "@/components/cards/ProductCard";
import { EmptyState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { href } from "@/lib/utils";

export function FavoritesView({ patterns, products }: { patterns: PatternCardData[]; products: ProductCardData[] }) {
  const { ids } = useFavorites();
  const { locale, dict } = useLocale();
  const ps = patterns.filter((p) => ids.has(p.id));
  const prs = products.filter((p) => ids.has(p.id));
  if (!ps.length && !prs.length) return <EmptyState action={<Button href={href(locale, "/patterns")} size="sm" variant="outline">{dict.nav.startExploring}</Button>} />;
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4">
      {ps.map((p) => <PatternCard key={p.id} pattern={p} />)}
      {prs.map((p) => <ProductCard key={p.id} product={p} />)}
    </div>
  );
}
