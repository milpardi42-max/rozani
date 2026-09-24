"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useLocale } from "@/components/providers/AppProviders";
import { Modal } from "@/components/ui/Modal";
import { Badge, Sku } from "@/components/ui/Badge";
import { formatPrice, href, t } from "@/lib/utils";
import type { PatternCardData } from "@/components/cards/PatternCard";
import type { ProductCardData } from "@/components/cards/ProductCard";
import { useProductColor } from "@/components/cards/ProductCard";
import { useMemo, useState } from "react";
import { AddToCartButton } from "./Actions";
import { ColorSwatches } from "./ColorSwatches";
import { ColorwayDots, resolveColorways } from "./ColorwayDots";

type Item = { kind: "pattern"; pattern: PatternCardData } | { kind: "product"; product: ProductCardData };

export function QuickView({ open, onClose, item }: { open: boolean; onClose: () => void; item: Item }) {
  const { dict } = useLocale();
  return (
    <Modal open={open} onClose={onClose} label={dict.common.quickView}>
      {item.kind === "pattern" ? <PatternQuick p={item.pattern} /> : <ProductQuick p={item.product} />}
    </Modal>
  );
}

function PatternQuick({ p }: { p: PatternCardData }) {
  const { locale, dict } = useLocale();
  const url = href(locale, `/patterns/${p.slug}`);
  const colorways = useMemo(() => resolveColorways(p), [p]);
  const defaultCw = colorways.find((c) => c.isDefault) ?? colorways[0];
  const [cwId, setCwId] = useState(defaultCw?.id ?? "default");
  const activeCw = colorways.find((c) => c.id === cwId) ?? defaultCw;
  const image = activeCw?.image || p.image;
  return (
    <div className="grid md:grid-cols-2">
      <div className="relative aspect-square bg-background-secondary md:aspect-auto md:min-h-[520px]">
        <Image key={image} src={image} alt={t(p.title, locale)} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover anim-scale-fade" />
      </div>
      <div className="flex flex-col p-6 md:p-8">
        <div className="flex items-center gap-2"><Sku value={p.sku} />{p.category && <Badge>{t(p.category.name, locale)}</Badge>}</div>
        <h3 className="mt-4 font-display text-h2">{t(p.title, locale)}</h3>
        <p className="mt-1 text-sm text-foreground-secondary">{p.artist ? t(p.artist.name, locale) : dict.brand}</p>
        <p className="mt-5 text-body text-foreground-secondary">{t(p.description, locale)}</p>
        {colorways.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 text-caption text-foreground-secondary">
              {locale === "fa" ? "رنگ‌بندی" : "Colourway"}:{" "}
              <span className="font-medium text-foreground">{activeCw ? t(activeCw.name, locale) : ""}</span>
              <span className="text-muted"> · {colorways.length} {locale === "fa" ? "گزینه" : "options"}</span>
            </p>
            <ColorwayDots colorways={colorways} value={activeCw?.id} onChange={setCwId} size="lg" max={8} locale={locale} showCount={false} />
          </div>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
          <Row k={dict.common.repeat} v={t(p.specs.repeat, locale)} />
          <Row k={dict.common.dpi} v={p.specs.dpi} />
          <Row k={dict.common.formats} v={p.specs.formats} />
          <Row k={locale === "fa" ? "رنگ‌بندی‌ها" : "Colourways"} v={String(colorways.length || p.specs.colors)} />
        </dl>
        <div className="mt-auto flex items-center justify-between gap-4 pt-8">
          <span className="text-h3 font-semibold tabular">{formatPrice(p.price, locale)}</span>
          <div className="flex items-center gap-2">
            <Link href={url} className="inline-flex h-11 items-center gap-1 rounded-md border border-border px-4 text-sm hover:border-foreground">{dict.common.viewPattern}<ArrowUpRight className="h-4 w-4 rtl-flip" /></Link>
            <AddToCartButton
              line={{
                kind: "pattern",
                id: p.id,
                sku: p.sku,
                title: `${t(p.title, locale)}${activeCw ? ` — ${t(activeCw.name, locale)}` : ""}`,
                image,
                price: p.price,
                href: url,
                colorName: activeCw ? t(activeCw.name, locale) : undefined,
                colorHex: activeCw?.hex,
              }}
              className="h-11"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductQuick({ p }: { p: ProductCardData }) {
  const { locale, dict } = useLocale();
  const { colorId, setColorId, color } = useProductColor(p);
  const url = href(locale, `/shop/${p.slug}`);
  return (
    <div className="grid md:grid-cols-2">
      <div className="relative aspect-square bg-background-secondary md:aspect-auto md:min-h-[520px]">
        <Image key={color.image} src={color.image} alt={t(p.title, locale)} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover anim-scale-fade" />
      </div>
      <div className="flex flex-col p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-2"><Sku value={p.sku} />{!p.artistId ? <Badge tone="accent">{dict.common.siteExclusive}</Badge> : <Badge tone="blue">{dict.common.artistProduct}</Badge>}</div>
        <h3 className="mt-4 font-display text-h2">{t(p.title, locale)}</h3>
        <p className="mt-3 text-body text-foreground-secondary">{t(p.description, locale)}</p>
        <div className="mt-6">
          <p className="mb-2 text-caption text-foreground-secondary">{dict.common.color}: <span className="font-medium text-foreground">{t(color.name, locale)}</span></p>
          <ColorSwatches options={p.colors.map((c) => ({ id: c.id, name: t(c.name, locale), hex: c.hex, stock: c.stock }))} value={colorId} onChange={setColorId} size="lg" label={dict.common.color} />
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-5 text-sm">
          {p.specs.map((s) => <Row key={t(s.label, "en")} k={t(s.label, locale)} v={t(s.value, locale)} />)}
        </dl>
        <div className="mt-auto flex items-center justify-between gap-4 pt-8">
          <span className="text-h3 font-semibold tabular">{formatPrice(p.price, locale)}</span>
          <div className="flex items-center gap-2">
            <Link href={url} className="inline-flex h-11 items-center gap-1 rounded-md border border-border px-4 text-sm hover:border-foreground">{dict.common.viewProduct}<ArrowUpRight className="h-4 w-4 rtl-flip" /></Link>
            <AddToCartButton disabled={color.stock <= 0} className="h-11" line={{ kind: "product", id: p.id, sku: p.sku, title: t(p.title, locale), image: color.image, price: p.price, colorName: t(color.name, locale), colorHex: color.hex, href: url }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-caption text-muted">{k}</dt>
      <dd className="mt-0.5 font-medium text-foreground" dir="auto">{v}</dd>
    </div>
  );
}
