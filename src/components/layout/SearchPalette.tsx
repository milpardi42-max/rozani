"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useSearch } from "@/components/providers/AppProviders";
import { Modal } from "@/components/ui/Modal";
import type { Localized } from "@/lib/i18n/types";
import { cn, href, t } from "@/lib/utils";

type Kind = "pattern" | "product" | "artist" | "portfolio" | "education" | "category";
interface Result { kind: Kind; title: string; sub?: string; image?: string; href: string }

/** Raw shape of /api/search-index — fetched lazily so the full catalog does not ride in every page payload. */
interface SearchDoc { slug: string; title?: Localized; name?: Localized; profession?: Localized; sku?: string; type?: string; image?: string; cover?: string; avatar?: string }
interface SearchIndexPayload {
  patterns: SearchDoc[];
  products: SearchDoc[];
  artists: SearchDoc[];
  portfolios: SearchDoc[];
  education: SearchDoc[];
  categories: SearchDoc[];
}

let prefetched: SearchIndexPayload | null = null;

export function SearchPalette() {
  const { isOpen, close } = useSearch();
  const { locale, dict } = useLocale();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [nav, setNav] = useState<SearchIndexPayload | null>(prefetched);
  const inputRef = useRef<HTMLInputElement>(null);

  /* load the index on first open (or reuse the idle prefetch) */
  useEffect(() => {
    if (nav || prefetched) return;
    let active = true;
    fetch("/api/search-index", { cache: "default" })
      .then((r) => (r.ok ? (r.json() as Promise<SearchIndexPayload>) : Promise.reject(new Error(`search-index ${r.status}`))))
      .then((d) => {
        prefetched = d;
        if (active) setNav(d);
      })
      .catch(() => {
        if (active) setNav({ patterns: [], products: [], artists: [], portfolios: [], education: [], categories: [] });
      });
    return () => {
      active = false;
    };
  }, [nav, isOpen]);

  /* warm the cache while the browser is idle, so opening the palette feels instant */
  useEffect(() => {
    if (prefetched) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const run = () => {
      fetch("/api/search-index", { cache: "default" })
        .then((r) => (r.ok ? (r.json() as Promise<SearchIndexPayload>) : Promise.reject(null)))
        .then((d) => {
          prefetched = d;
        })
        .catch(() => undefined);
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 4000 });
      return () => void id;
    }
    const tId = window.setTimeout(run, 3000);
    return () => window.clearTimeout(tId);
  }, []);

  const index = useMemo<Result[]>(() => {
    if (!nav) return [];
    const p = (path: string) => href(locale, path);
    return [
      ...nav.patterns.map((x) => ({ kind: "pattern" as Kind, title: t(x.title, locale), sub: x.sku, image: x.image, href: p(`/patterns/${x.slug}`) })),
      ...nav.products.map((x) => ({ kind: "product" as Kind, title: t(x.title, locale), sub: x.sku, image: x.image, href: p(`/shop/${x.slug}`) })),
      ...nav.artists.map((x) => ({ kind: "artist" as Kind, title: t(x.name, locale), sub: t(x.profession, locale), image: x.avatar, href: p(`/artists/${x.slug}`) })),
      ...nav.portfolios.map((x) => ({ kind: "portfolio" as Kind, title: t(x.title, locale), image: x.cover, href: p(`/portfolio/${x.slug}`) })),
      ...nav.education.map((x) => ({ kind: "education" as Kind, title: t(x.title, locale), sub: x.type, image: x.image, href: p(`/academy/${x.slug}`) })),
      ...nav.categories.map((x) => ({ kind: "category" as Kind, title: t(x.name, locale), image: x.image, href: p(`/styles/${x.slug}`) })),
    ];
  }, [nav, locale]);


  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return index.filter((_, i) => i % 3 === 0).slice(0, 8);
    return index.filter((r) => r.title.toLowerCase().includes(s) || r.sub?.toLowerCase().includes(s)).slice(0, 12);
  }, [q, index]);

  useEffect(() => {
    if (isOpen) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);
  useEffect(() => setIdx(0), [q]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter" && results[idx]) { window.location.href = results[idx].href; close(); }
  };

  return (
    <Modal open={isOpen} onClose={close} label={dict.nav.search} className="max-w-2xl top-[12vh] translate-y-0 p-0">
      <div className="flex items-center gap-3 border-b border-border px-5">
        <Search className="h-5 w-5 text-muted" />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={dict.search.placeholder} className="h-14 w-full bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none" aria-label={dict.nav.search} />
        <kbd className="hidden rounded-xs border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">ESC</kbd>
      </div>
      <div className="max-h-[60vh] overflow-y-auto p-2">
        <p className="px-3 pb-1 pt-2 text-label text-muted">{q ? `${results.length} ${dict.common.results}` : dict.search.recent}</p>
        {results.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-foreground-secondary">{dict.search.noResults}</p>
        ) : (
          <ul role="listbox">
            {results.map((r, i) => (
              <li key={r.href} role="option" aria-selected={i === idx}>
                <Link href={r.href} onClick={close} onMouseEnter={() => setIdx(i)} className={cn("group flex items-center gap-3 rounded-md px-3 py-2 transition-colors", i === idx ? "bg-background-secondary" : "hover:bg-background-secondary/60")}>
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-background-secondary">{r.image && <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{r.title}</span>
                    {r.sub && <span className="block truncate text-caption text-foreground-secondary" dir="auto">{r.sub}</span>}
                  </span>
                  <span className="rounded-xs bg-surface border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted">{dict.search.types[r.kind]}</span>
                  <ArrowUpRight className="h-4 w-4 rtl-flip text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-border px-5 py-2.5 text-caption text-muted">{dict.search.hint}</div>
    </Modal>
  );
}
