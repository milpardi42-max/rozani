"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SwatchOption {
  id: string;
  name: string;
  hex: string;
  stock: number;
}

export function ColorSwatches({
  options,
  value,
  onChange,
  size = "md",
  className,
  label,
  max = 6,
  showCount = true,
}: {
  options: SwatchOption[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
  /** Max dots shown before +N (Spoonflower-style). */
  max?: number;
  showCount?: boolean;
}) {
  const dim = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const shown = options.slice(0, max);
  const extra = options.length - shown.length;
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex items-center gap-1.5", className)}>
      {shown.map((o) => {
        const active = o.id === value;
        const out = o.stock <= 0;
        const light = isLight(o.hex);
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.name}
            title={o.name}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(o.id);
            }}
            className={cn(
              "relative flex items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-[transform,box-shadow] duration-200 hover:scale-110 active:scale-95",
              dim,
              active ? "ring-2 ring-foreground scale-105" : "ring-1 ring-border hover:ring-foreground/50",
              out && "opacity-45",
            )}
            style={{ backgroundColor: o.hex }}
          >
            {active && <Check className={cn("h-3 w-3", light ? "text-foreground" : "text-white")} strokeWidth={3} />}
            {out && <span className="absolute inset-0 m-auto h-px w-[130%] rotate-45 bg-foreground/60" />}
          </button>
        );
      })}
      {showCount && extra > 0 && (
        <span className="ms-0.5 text-[11px] font-medium tabular text-foreground-secondary">+{extra}</span>
      )}
    </div>
  );
}

function isLight(hex: string) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}
