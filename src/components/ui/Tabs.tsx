"use client";

import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({ tabs, value, onChange, className }: { tabs: Tab[]; value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("no-scrollbar flex gap-1 overflow-x-auto border-b border-border", className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 px-4 py-3 text-sm transition-colors",
              active ? "text-foreground font-medium" : "text-foreground-secondary hover:text-foreground",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              {typeof tab.count === "number" && <span className="rounded-xs bg-background-secondary px-1.5 py-0.5 text-caption tabular">{tab.count}</span>}
            </span>
            <span className={cn("absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-foreground transition-transform duration-300 ease-[var(--ease-out)] origin-center", active ? "scale-x-100" : "scale-x-0")} />
          </button>
        );
      })}
    </div>
  );
}

/** Pill filter chips */
export function Chips({ items, value, onChange, allLabel }: { items: { id: string; label: string }[]; value: string; onChange: (id: string) => void; allLabel?: string }) {
  const all = allLabel ? [{ id: "all", label: allLabel }, ...items] : items;
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {all.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-[background-color,color,border-color,transform] duration-200 active:scale-95",
              active ? "border-foreground bg-foreground text-background" : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
