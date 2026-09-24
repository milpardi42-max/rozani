"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { cn, href, t } from "@/lib/utils";
import type { NavData } from "./nav-data";

type Group = "patterns" | "products" | "artists" | "portfolio" | "education" | "collections" | "categories";

export function MegaMenu({ nav, onNavigate }: { nav: NavData; onNavigate: () => void }) {
  const { locale, dict } = useLocale();
  const groups: { id: Group; label: string; href: string; preview: string; desc: string }[] = [
    { id: "patterns", label: dict.nav.patterns, href: "/patterns", preview: nav.patterns[0]?.image ?? "", desc: locale === "fa" ? "کتابخانه‌ی الگوهای اورجینال" : "The original pattern library" },
    { id: "categories", label: dict.nav.styles, href: "/styles", preview: nav.categories[1]?.image ?? "", desc: locale === "fa" ? "کاوش بر اساس سبک" : "Browse by style" },
    { id: "collections", label: dict.nav.collections, href: "/collections", preview: nav.collections[0]?.cover ?? "", desc: locale === "fa" ? "گزیده‌های ویراسته" : "Curated selections" },
    { id: "artists", label: dict.nav.artists, href: "/artists", preview: nav.artists[0]?.avatar ?? "", desc: locale === "fa" ? "آدم‌های پشت الگوها" : "The people behind the patterns" },
    { id: "portfolio", label: dict.nav.portfolio, href: "/portfolio", preview: nav.portfolios[0]?.cover ?? "", desc: locale === "fa" ? "گالری پروژه‌ها" : "Project gallery" },
    { id: "education", label: dict.nav.education, href: "/academy", preview: nav.education[0]?.image ?? "", desc: locale === "fa" ? "یادگیری طراحی الگو" : "Learn pattern design" },
    { id: "products", label: dict.nav.products, href: "/shop", preview: nav.storeProducts[0]?.colors[0]?.image ?? "", desc: locale === "fa" ? "کالکشن اختصاصی و محصولات" : "Exclusive collection & products" },
  ];
  const [hover, setHover] = useState<Group>("patterns");
  const active = groups.find((g) => g.id === hover) ?? groups[0];

  const secondary: Record<Group, { label: string; href: string; image?: string }[]> = {
    patterns: nav.categories.slice(0, 6).map((c) => ({ label: t(c.name, locale), href: `/patterns?category=${c.slug}`, image: c.image })),
    categories: nav.categories.slice(0, 6).map((c) => ({ label: t(c.name, locale), href: `/styles/${c.slug}`, image: c.image })),
    collections: nav.collections.map((c) => ({ label: t(c.title, locale), href: `/collections/${c.slug}`, image: c.cover })),
    artists: nav.artists.map((a) => ({ label: t(a.name, locale), href: `/artists/${a.slug}`, image: a.avatar })),
    portfolio: nav.portfolios.slice(0, 6).map((p) => ({ label: t(p.title, locale), href: `/portfolio/${p.slug}`, image: p.cover })),
    education: nav.education.slice(0, 6).map((e) => ({ label: t(e.title, locale), href: `/academy/${e.slug}`, image: e.image })),
    products: nav.storeProducts.slice(0, 6).map((p) => ({ label: t(p.title, locale), href: `/shop/${p.slug}`, image: p.colors[0]?.image })),
  };

  return (
    <div className="glass border-t border-border/60 shadow-elevated">
      <div className="container-x grid grid-cols-12 gap-8 py-8">
        {/* primary list */}
        <ul className="col-span-3 flex flex-col border-e border-border pe-6">
          {groups.map((g, i) => (
            <li key={g.id} className="anim-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
              <Link
                href={href(locale, g.href)}
                onMouseEnter={() => setHover(g.id)}
                onFocus={() => setHover(g.id)}
                onClick={onNavigate}
                className={cn("group flex items-center justify-between rounded-md px-3 py-2.5 font-display text-[26px] leading-none transition-colors", hover === g.id ? "text-foreground bg-background-secondary" : "text-foreground-secondary hover:text-foreground")}
              >
                {g.label}
                <ArrowUpRight className={cn("h-4 w-4 rtl-flip transition-[opacity,transform] duration-200", hover === g.id ? "opacity-100" : "opacity-0 -translate-x-1")} />
              </Link>
            </li>
          ))}
        </ul>

        {/* secondary grid */}
        <div className="col-span-6">
          <p className="text-label text-muted mb-4">{active.label}</p>
          <ul key={active.id} className="grid grid-cols-3 gap-3">
            {secondary[active.id].map((it, i) => (
              <li key={it.href} className="anim-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                <Link href={href(locale, it.href)} onClick={onNavigate} className="group flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-background-secondary">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-background-secondary">{it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}</span>
                  <span className="truncate text-sm font-medium text-foreground">{it.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* preview */}
        <Link href={href(locale, active.href)} onClick={onNavigate} className="group col-span-3 relative overflow-hidden rounded-lg bg-background-secondary anim-scale-fade" key={`prev-${active.id}`}>
          {active.preview && <Image src={active.preview} alt="" fill sizes="320px" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
          <div className="absolute inset-0 vignette" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-caption text-white/70">{active.desc}</p>
            <p className="mt-1 flex items-center gap-2 font-display text-h3">{active.label}<ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" /></p>
          </div>
        </Link>
      </div>
    </div>
  );
}
