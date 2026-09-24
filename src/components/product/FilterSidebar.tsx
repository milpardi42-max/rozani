"use client";

import {
  Check,
  ChevronDown,
  Filter,
  LayoutGrid,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, faNum } from "@/lib/utils";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  swatch?: string;
  image?: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  /** How options render — radio list (default), pill chips or a nested child list */
  appearance?: "list" | "pills" | "swatches" | "nested";
}

interface Props {
  /** Primary category group (always first, unless `lead` groups are given) */
  categories: FilterOption[];
  sorts: FilterOption[];
  extra?: FilterGroup[];
  /**
   * Groups rendered *above* the category group. Used by the shop for the «الگو»
   * family tree (wallpaper, curtain, …) that hangs under the pattern parent.
   */
  lead?: FilterGroup[];
  total: number;
  className?: string;
  /** Optional heading above the sidebar */
  title?: string;
  /** Mobile drawer label */
  mobileLabel?: string;
}

/**
 * Professional catalog filter sidebar (Spoonflower / luxury-commerce style).
 * URL-driven · sticky on desktop · slide-over drawer on mobile.
 */
export function FilterSidebar({
  categories,
  sorts,
  extra = [],
  lead = [],
  total,
  className,
  title,
  mobileLabel,
}: Props) {
  const { dict, locale } = useLocale();
  const fa = locale === "fa";
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
    },
    [sp, router, pathname],
  );

  const clear = useCallback(() => {
    start(() => router.replace(pathname, { scroll: false }));
  }, [router, pathname, start]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (sp.get("category")) n++;
    if (sp.get("sort")) n++;
    for (const g of [...lead, ...extra]) if (sp.get(g.key)) n++;
    if (sp.get("q")) n++;
    return n;
  }, [sp, extra, lead]);

  const hasFilters = activeCount > 0;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [sp]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const groups: FilterGroup[] = useMemo(
    () => [
      ...lead.map((g) => ({ ...g, appearance: g.appearance ?? ("list" as const) })),
      {
        key: "category",
        label: dict.common.category,
        options: categories,
        appearance: "list",
      },
      ...extra.map((g) => ({ ...g, appearance: g.appearance ?? ("list" as const) })),
      {
        key: "sort",
        label: dict.common.sort,
        options: sorts,
        appearance: "list",
      },
    ],
    [categories, extra, lead, sorts, dict],
  );

  const sidebarBody = (
    <aside
      className={cn(
        "flex h-full flex-col bg-surface",
        className,
      )}
      aria-busy={pending}
      aria-label={fa ? "فیلترها" : "Filters"}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background-secondary text-foreground">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                {fa ? "کاتالوگ" : "Catalog"}
              </p>
              <h2 className="font-display text-h4 leading-tight text-foreground">
                {title ?? (fa ? "فیلترها" : "Filters")}
              </h2>
            </div>
          </div>
          <p className="mt-2 text-caption text-foreground-secondary tabular">
            <span className="font-semibold text-foreground">
              {fa ? faNum(total) : total}
            </span>{" "}
            {dict.common.results}
            {hasFilters && (
              <span className="text-muted">
                {" · "}
                {fa ? `${faNum(activeCount)} فعال` : `${activeCount} active`}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-2.5 text-[12px] font-medium text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {dict.common.clear}
            </button>
          )}
          {/* mobile close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
            aria-label={dict.nav.close}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Scrollable groups */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {groups.map((g, gi) => (
          <FilterSection
            key={g.key}
            group={g}
            value={sp.get(g.key) ?? "all"}
            onChange={(v) => set(g.key, v)}
            allLabel={dict.common.all}
            defaultOpen={gi < 2 || Boolean(sp.get(g.key))}
            fa={fa}
          />
        ))}
      </div>

      {/* Footer meta */}
      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-2 text-caption text-muted">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span>
            {fa
              ? "فیلترها در آدرس صفحه ذخیره می‌شوند — قابل اشتراک‌گذاری."
              : "Filters live in the URL — shareable and bookmarkable."}
          </span>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop sticky sidebar ── */}
      <div className={cn("hidden lg:block", className)}>
        <div className="sticky top-[calc(var(--header-h-compact)+1rem)] max-h-[calc(100svh-var(--header-h-compact)-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {sidebarBody}
        </div>
      </div>

      {/* ── Mobile trigger bar ── */}
      <div className="lg:hidden">
        <div className="sticky top-[var(--header-h-compact)] z-30 -mx-4 border-y border-border bg-background/90 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-soft transition-colors hover:border-foreground"
            >
              <Filter className="h-4 w-4" />
              {mobileLabel ?? (fa ? "فیلتر و مرتب‌سازی" : "Filter & sort")}
              {hasFilters && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold tabular text-background">
                  {fa ? faNum(activeCount) : activeCount}
                </span>
              )}
            </button>
            <span className="shrink-0 text-caption tabular text-muted">
              {fa ? faNum(total) : total} {dict.common.results}
            </span>
          </div>

          {/* Active filter chips (mobile) */}
          {hasFilters && (
            <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
              {sp.get("category") && (
                <ActiveChip
                  label={categories.find((c) => c.id === sp.get("category"))?.label ?? sp.get("category")!}
                  onClear={() => set("category", "all")}
                />
              )}
              {[...lead, ...extra].map((g) => {
                const v = sp.get(g.key);
                if (!v) return null;
                const lab = g.options.find((o) => o.id === v)?.label ?? v;
                return <ActiveChip key={g.key} label={lab} onClear={() => set(g.key, "all")} />;
              })}
              {sp.get("sort") && (
                <ActiveChip
                  label={sorts.find((s) => s.id === sp.get("sort"))?.label ?? sp.get("sort")!}
                  onClear={() => set("sort", "all")}
                />
              )}
              <button
                type="button"
                onClick={clear}
                className="shrink-0 rounded-full px-2.5 py-1 text-[12px] text-foreground-secondary underline-offset-2 hover:text-foreground hover:underline"
              >
                {dict.common.clear}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={dict.nav.close}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={cn(
              "absolute inset-y-0 flex w-[min(100%,22rem)] flex-col bg-surface shadow-elevated",
              "anim-fade-up",
              fa ? "start-0" : "start-0",
            )}
            style={{ animationDuration: "280ms" }}
          >
            {sidebarBody}
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function FilterSection({
  group,
  value,
  onChange,
  allLabel,
  defaultOpen,
  fa,
}: {
  group: FilterGroup;
  value: string;
  onChange: (id: string) => void;
  allLabel: string;
  defaultOpen: boolean;
  fa: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const activeLabel =
    value !== "all" ? group.options.find((o) => o.id === value)?.label : null;

  return (
    <div className="border-b border-border/70 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-3.5 text-start transition-colors hover:bg-background-secondary/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="text-[13px] font-semibold tracking-wide text-foreground">
            {group.label}
          </span>
          {activeLabel && (
            <span className="truncate rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background">
              {activeLabel}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-2 pb-3 pt-0.5">
            {group.appearance === "pills" ? (
              <div className="flex flex-wrap gap-1.5 px-1">
                <Pill
                  active={value === "all"}
                  onClick={() => onChange("all")}
                  label={allLabel}
                />
                {group.options.map((o) => (
                  <Pill
                    key={o.id}
                    active={value === o.id}
                    onClick={() => onChange(o.id)}
                    label={o.label}
                    count={o.count}
                    fa={fa}
                  />
                ))}
              </div>
            ) : group.appearance === "nested" ? (
              <ul className="space-y-0.5" role="listbox" aria-label={group.label}>
                <OptionRow
                  active={value === "all"}
                  onClick={() => onChange("all")}
                  label={allLabel}
                  icon={<LayoutGrid className="h-3.5 w-3.5" />}
                />
                <li>
                  <ul className="ms-[1.1rem] space-y-0.5 border-s border-border/70 ps-2">
                    {group.options.map((o) => (
                      <OptionRow
                        key={o.id}
                        nested
                        active={value === o.id}
                        onClick={() => onChange(o.id)}
                        label={o.label}
                        count={o.count}
                        fa={fa}
                      />
                    ))}
                  </ul>
                </li>
              </ul>
            ) : (
              <ul className="space-y-0.5" role="listbox" aria-label={group.label}>
                <OptionRow
                  active={value === "all"}
                  onClick={() => onChange("all")}
                  label={allLabel}
                  icon={<LayoutGrid className="h-3.5 w-3.5" />}
                />
                {group.options.map((o) => (
                  <OptionRow
                    key={o.id}
                    active={value === o.id}
                    onClick={() => onChange(o.id)}
                    label={o.label}
                    count={o.count}
                    swatch={o.swatch}
                    fa={fa}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionRow({
  active,
  onClick,
  label,
  count,
  swatch,
  icon,
  fa,
  nested,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  swatch?: string;
  icon?: React.ReactNode;
  fa?: boolean;
  /** Child row of a nested group — tighter, and the marker becomes a small dot. */
  nested?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={active}
        onClick={onClick}
        className={cn(
          "group flex w-full items-center rounded-lg text-start transition-all duration-200",
          nested ? "gap-2 px-2 py-1.5 text-[12.5px]" : "gap-2.5 px-2.5 py-2 text-[13px]",
          active
            ? "bg-foreground text-background shadow-soft"
            : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border transition-colors",
            nested ? "h-4.5 w-4.5" : "h-5 w-5",
            active
              ? "border-background/30 bg-background/15"
              : "border-border bg-surface group-hover:border-foreground/30",
          )}
        >
          {active ? (
            <Check className="h-3 w-3" strokeWidth={3} />
          ) : swatch ? (
            <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: swatch }} />
          ) : (
            icon ?? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-30" />
          )}
        </span>
        <span className={cn("min-w-0 flex-1 truncate", active && "font-medium")}>{label}</span>
        {typeof count === "number" && (
          <span
            className={cn(
              "tabular text-[11px]",
              active ? "text-background/70" : "text-muted",
            )}
          >
            {fa ? faNum(count) : count}
          </span>
        )}
      </button>
    </li>
  );
}

function Pill({
  active,
  onClick,
  label,
  count,
  fa,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  fa?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-all active:scale-95",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-foreground-secondary hover:border-foreground hover:text-foreground",
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className={cn("tabular text-[10px]", active ? "text-background/70" : "text-muted")}>
          {fa ? faNum(count) : count}
        </span>
      )}
    </button>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-foreground/20 bg-foreground px-2.5 py-1 text-[12px] font-medium text-background"
    >
      {label}
      <X className="h-3 w-3 opacity-80" />
    </button>
  );
}

/** Layout shell: sidebar + main content */
export function CatalogLayout({
  sidebar,
  children,
  toolbar,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-3 xl:col-span-3">{sidebar}</div>
      <div className="min-w-0 lg:col-span-9 xl:col-span-9">
        {toolbar}
        {children}
      </div>
    </div>
  );
}
