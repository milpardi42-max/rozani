"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge, Sku } from "@/components/ui/Badge";
import { AddToCartButton } from "@/components/product/Actions";
import { ColorSwatches } from "@/components/product/ColorSwatches";
import { cn, formatPrice, href, t } from "@/lib/utils";
import type { NavData } from "./nav-data";

const PAGE = 3;

/** Store dropdown: exactly 3 products per view, paginated, with interactive color selection. */
export function StoreDropdown({ nav, onNavigate, compact }: { nav: NavData; onNavigate?: () => void; compact?: boolean }) {
  const { locale, dict } = useLocale();
  const items = nav.storeProducts;
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const [page, setPage] = useState(0);
  const visible = useMemo(() => items.slice(page * PAGE, page * PAGE + PAGE), [items, page]);
  const [colorSel, setColorSel] = useState<Record<string, string>>({});

  return (
    <div className={cn(!compact && "glass border-t border-border/60 shadow-elevated")}>
      <div className={cn(!compact && "container-x py-7")}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-label text-accent">{dict.common.siteExclusive}</p>
            <h3 className="mt-1 font-display text-h3">{dict.nav.products}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-caption text-muted tabular">{page + 1} / {pages}</span>
            <button type="button" aria-label="previous" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground disabled:opacity-30">
              <ChevronLeft className="h-4 w-4 rtl-flip" />
            </button>
            <button type="button" aria-label="next" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground disabled:opacity-30">
              <ChevronRight className="h-4 w-4 rtl-flip" />
            </button>
            <Link href={href(locale, "/shop")} onClick={onNavigate} className="ms-2 hidden items-center gap-1 text-sm font-medium text-foreground hover:text-accent sm:inline-flex">{dict.nav.viewAll}<ArrowUpRight className="h-4 w-4 rtl-flip" /></Link>
          </div>
        </div>

        <ul key={page} className={cn("grid gap-4", compact ? "grid-cols-1" : "grid-cols-3")}>
          {visible.map((p, i) => {
            const colorId = colorSel[p.slug] ?? p.colors[0]?.id;
            const color = p.colors.find((c) => c.id === colorId) ?? p.colors[0];
            const url = href(locale, `/shop/${p.slug}`);
            return (
              <li key={p.slug} className="anim-fade-up rounded-lg border border-border bg-surface p-3 transition-shadow hover:shadow-medium" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex gap-3">
                  <Link href={url} onClick={onNavigate} className="relative h-28 w-24 shrink-0 overflow-hidden rounded-md bg-background-secondary">
                    <Image key={color.image} src={color.image} alt={`${t(p.title, locale)} — ${t(color.name, locale)}`} fill sizes="96px" className="object-cover anim-scale-fade" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={url} onClick={onNavigate} className="line-clamp-2 text-sm font-medium text-foreground hover:text-accent">{t(p.title, locale)}</Link>
                      <span className="shrink-0 text-sm font-semibold tabular">{formatPrice(p.price, locale)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Sku value={p.sku} />
                      {p.siteOwned ? <Badge tone="accent">{dict.common.siteExclusive}</Badge> : <Badge tone="blue">{dict.common.artistProduct}</Badge>}
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
                      {p.specs.slice(0, 2).map((s) => (
                        <div key={t(s.label, "en")} className="flex gap-1 text-[11px] leading-snug">
                          <dt className="text-muted">{t(s.label, locale)}:</dt>
                          <dd className="truncate text-foreground-secondary">{t(s.value, locale)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <ColorSwatches size="sm" label={dict.common.color} options={p.colors.map((c) => ({ id: c.id, name: t(c.name, locale), hex: c.hex, stock: c.stock }))} value={colorId} onChange={(id) => setColorSel((s) => ({ ...s, [p.slug]: id }))} />
                    <span className="truncate text-caption text-foreground-secondary">{t(color.name, locale)}</span>
                  </div>
                  <AddToCartButton variant="icon" disabled={color.stock <= 0} line={{ kind: "product", id: p.id, sku: p.sku, title: t(p.title, locale), image: color.image, price: p.price, colorName: t(color.name, locale), colorHex: color.hex, href: url }} />
                </div>
              </li>
            );
          })}
        </ul>

        {/* Quick entries that used to sit in the top row — one click from the shop button. */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          {[
            { label: dict.nav.patterns, url: "/patterns" },
            { label: dict.nav.styles, url: "/styles" },
            { label: dict.nav.collections, url: "/collections" },
            { label: locale === "fa" ? "فایل دیجیتال و لایسنس" : "Digital files & licensing", url: "/marketplace" },
            { label: locale === "fa" ? "اشتراک دانلود" : "Download passes", url: "/marketplace/subscriptions" },
          ].map((entry) => (
            <Link
              key={entry.url}
              href={href(locale, entry.url)}
              onClick={onNavigate}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-caption text-foreground-secondary transition-colors hover:border-accent hover:text-accent"
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
