"use client";

import { Check, Heart, ShoppingBag } from "lucide-react";
import { useCart, useFavorites, useLocale, type CartLine } from "@/components/providers/AppProviders";
import { cn } from "@/lib/utils";

export function FavoriteButton({ id, className, size = "md" }: { id: string; className?: string; size?: "sm" | "md" }) {
  const { has, toggle } = useFavorites();
  const { dict } = useLocale();
  const active = has(id);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={dict.common.favorite}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      className={cn(
        "flex items-center justify-center rounded-full glass transition-[transform,color,background-color] duration-200 active:scale-90 hover:scale-105",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        active ? "text-accent" : "text-foreground",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform duration-300", active && "fill-current scale-110")} />
    </button>
  );
}

export function AddToCartButton({
  line,
  className,
  variant = "default",
  label,
  disabled,
}: {
  line: Omit<CartLine, "qty" | "key"> & { qty?: number };
  className?: string;
  variant?: "default" | "icon" | "wide";
  label?: string;
  disabled?: boolean;
}) {
  const { add, lastAdded } = useCart();
  const { dict } = useLocale();
  const key = `${line.kind}:${line.id}:${line.colorName ?? ""}`;
  const justAdded = lastAdded === key;
  const text = justAdded ? dict.common.added : label ?? dict.common.addToCart;

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={dict.common.addToCart}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          add(line);
        }}
        className={cn("flex h-9 w-9 items-center justify-center rounded-full glass text-foreground transition-transform duration-200 hover:scale-105 active:scale-90 disabled:opacity-40", justAdded && "bg-success text-white", className)}
      >
        {justAdded ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(line);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-[background-color,transform,color] duration-200 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        variant === "wide" ? "h-12 w-full bg-primary text-primary-foreground hover:bg-primary-hover" : "h-10 px-4 bg-foreground text-background hover:bg-primary",
        justAdded && "bg-success! text-white!",
        className,
      )}
    >
      {justAdded ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
      {text}
    </button>
  );
}
