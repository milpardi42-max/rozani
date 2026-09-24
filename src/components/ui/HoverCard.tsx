"use client";

/**
 * HoverCard — Cinematic 3-D floating preview.
 *
 * Fixes vs previous version:
 *  • Panel uses `position:fixed` + viewport coords so it works regardless of scroll
 *  • Entrance animation runs on a wrapper; tilt runs on an inner div — no conflict
 *  • anchorRect is re-read from the live DOM element (not stale closure value)
 *  • Backdrop is pointer-events-none so it never accidentally swallows hover events
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/components/providers/AppProviders";
import { Badge, Sku } from "@/components/ui/Badge";
import { ColorSwatches } from "@/components/product/ColorSwatches";
import { ColorwayDots, resolveColorways } from "@/components/product/ColorwayDots";
import { AddToCartButton } from "@/components/product/Actions";
import { useProductColor } from "@/components/cards/ProductCard";
import { cn, formatPrice, href, t } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import type { PatternCardData } from "@/components/cards/PatternCard";
import type { ProductCardData } from "@/components/cards/ProductCard";

/* ─────────────────────────── constants ─────────────────────────── */
const SHOW_DELAY  = 1800;  // 2-second dwell triggers the panel
const HIDE_DELAY  = 320;   // generous — mouse needs time to travel from card → panel
const PANEL_W     = 360;
const PANEL_GAP   = 12;
const TILT_MAX    = 7;
const PARALLAX_PX = 12;

/* ─────────────────────────── types ─────────────────────────── */
type HoverItem =
  | { kind: "product"; product: ProductCardData }
  | { kind: "pattern"; pattern: PatternCardData };

interface HoverState {
  item: HoverItem;
  /** live reference to the anchor element so we can re-read its rect */
  anchor: HTMLElement;
}

/* ════════════════════════════════════════════════════════════════
   PANEL
════════════════════════════════════════════════════════════════ */
function Panel({
  item,
  anchor,
  hideTimer,
  onClose,
}: {
  item: HoverItem;
  anchor: HTMLElement;
  hideTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  onClose: () => void;
}) {
  /* outer wrapper: fixed-positioned, runs entrance animation only */
  const wrapRef  = useRef<HTMLDivElement>(null);
  /* inner card: runs live tilt transform */
  const cardRef  = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const rafRef   = useRef<number | null>(null);

  /* ── compute fixed (viewport) position ─────────────────────── */
  function getPos() {
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceRight = vw - r.right;
    const spaceLeft  = r.left;
    const goRight = spaceRight >= PANEL_W + PANEL_GAP;
    const goLeft  = spaceLeft  >= PANEL_W + PANEL_GAP;
    // prefer right; fall back left; if neither fits, overlap on the side with more space
    const x = (goRight || (!goLeft && spaceRight >= spaceLeft))
      ? r.right + PANEL_GAP
      : r.left  - PANEL_W - PANEL_GAP;
    const rawY  = r.top;
    const maxY  = vh - 580;
    const y     = Math.max(8, Math.min(rawY, maxY));
    return { x, y };
  }

  /* set initial fixed position before first paint */
  const [pos] = useState(getPos);

  /* ── 3-D tilt on mouse-move over the inner card ─────────────── */
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const card = cardRef.current;
      const img  = imageRef.current;
      if (!card) return;
      const r  = card.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width  - 0.5;
      const cy = (e.clientY - r.top)  / r.height - 0.5;
      const rx = (-cy * TILT_MAX * 2).toFixed(2);
      const ry = ( cx * TILT_MAX * 2).toFixed(2);
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (img) img.style.transform = `translate(${(cx * PARALLAX_PX).toFixed(2)}px, ${(cy * PARALLAX_PX).toFixed(2)}px) scale(1.06)`;
    });
  }, []);

  const resetTilt = useCallback(() => {
    if (cardRef.current)  cardRef.current.style.transform  = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    if (imageRef.current) imageRef.current.style.transform = "translate(0,0) scale(1)";
  }, []);

  /* ── mouse events on the WRAPPER (larger hit area) ──────────── */
  const onWrapLeave = useCallback(() => {
    resetTilt();
    // use the SHARED timer so the card's onMouseLeave can cancel it
    hideTimer.current = setTimeout(onClose, HIDE_DELAY);
  }, [resetTilt, hideTimer, onClose]);

  const onWrapEnter = useCallback(() => {
    // cancel any pending hide started by the card's onMouseLeave
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, [hideTimer]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener("mousemove",  onMouseMove);
    el.addEventListener("mouseleave", onWrapLeave);
    el.addEventListener("mouseenter", onWrapEnter);
    const timerRef = hideTimer;
    return () => {
      el.removeEventListener("mousemove",  onMouseMove);
      el.removeEventListener("mouseleave", onWrapLeave);
      el.removeEventListener("mouseenter", onWrapEnter);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current)   cancelAnimationFrame(rafRef.current);
    };
  }, [onMouseMove, onWrapLeave, onWrapEnter, hideTimer]);

  const { locale, dict } = useLocale();

  return createPortal(
    <>
      {/* ── soft backdrop: pointer-events-none so it never blocks card hover ── */}
      <div
        className="fixed inset-0 z-[84] pointer-events-none bg-foreground/15 backdrop-blur-[2px]"
        style={{ animation: "ra-hc-backdrop 260ms var(--ease-out) both" }}
      />

      {/* ── entrance wrapper (fixed position + entrance animation only) ── */}
      <div
        ref={wrapRef}
        style={{
          position: "fixed",
          left: pos.x,
          top:  pos.y,
          width: PANEL_W,
          zIndex: 85,
          animation: "ra-hc-panel 320ms var(--ease-out) both",
        }}
      >
        {/* glow ring — behind the card */}
        <div
          className="pointer-events-none absolute -inset-3 rounded-3xl"
          style={{
            background: "linear-gradient(135deg, var(--accent) 0%, var(--blue) 100%)",
            opacity: 0.35,
            filter: "blur(22px)",
          }}
        />

        {/* tilt card — separate element so animation ≠ transform conflict */}
        <div
          ref={cardRef}
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 60ms linear",
            willChange: "transform",
          }}
          className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.22),0_6px_18px_rgba(0,0,0,0.14)]"
        >
          {/* close */}
          <button
            onClick={onClose}
            aria-label="close"
            className="absolute top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full glass text-foreground hover:bg-surface transition-colors inset-inline-end-3"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {item.kind === "product"
            ? <ProductPanel p={item.product} dict={dict} locale={locale} imageRef={imageRef} />
            : <PatternPanel p={item.pattern} dict={dict} locale={locale} imageRef={imageRef} />}
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ════════════════════════════════════════════════════════════════
   PRODUCT inner panel
════════════════════════════════════════════════════════════════ */
function ProductPanel({
  p, dict, locale, imageRef,
}: {
  p: ProductCardData;
  dict: Dictionary;
  locale: Locale;
  imageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { colorId, setColorId, color } = useProductColor(p);
  const url = href(locale, `/shop/${p.slug}`);
  const out = color.stock <= 0;

  return (
    <>
      {/* hero image — click goes to product page */}
      <Link href={url} className="relative block aspect-[3/2] w-full overflow-hidden bg-background-secondary group/img">
        <div
          ref={imageRef}
          className="absolute inset-[-6%] transition-transform duration-[60ms] ease-linear"
          style={{ willChange: "transform" }}
        >
          <Image
            key={color.image}
            src={color.image}
            alt={t(p.title, locale)}
            fill
            sizes={`${PANEL_W + 72}px`}
            className="object-cover"
            style={{ animation: "ra-hc-image 480ms 100ms var(--ease-out) both" }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/10 to-transparent" />
        {/* subtle "click to view" hint on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 bg-foreground/10">
          <span className="flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-caption font-medium text-foreground shadow-md backdrop-blur-sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {dict.common.viewProduct}
          </span>
        </div>

        {/* colour thumbnails */}
        {p.colors.length > 1 && (
          <div
            className="absolute bottom-3 inset-inline-start-3 flex gap-1.5"
            style={{ animation: "ra-hc-stagger 380ms 280ms var(--ease-out) both" }}
          >
            {p.colors.slice(0, 5).map((c) => (
              <button
                key={c.id}
                onClick={(e) => { e.stopPropagation(); setColorId(c.id); }}
                title={t(c.name, locale)}
                className={cn(
                  "relative h-9 w-9 overflow-hidden rounded-md ring-offset-1 ring-offset-surface transition-all duration-200 hover:scale-110",
                  c.id === colorId ? "ring-2 ring-white scale-110 shadow-md" : "ring-1 ring-white/40 hover:ring-white/80",
                )}
              >
                <Image src={c.image} alt={t(c.name, locale)} fill sizes="36px" className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* badges */}
        <div
          className="absolute top-3 inset-inline-start-3 flex flex-wrap gap-1"
          style={{ animation: "ra-hc-stagger 380ms 60ms var(--ease-out) both" }}
        >
          {!p.artistId ? <Badge tone="accent">{dict.common.siteExclusive}</Badge> : <Badge tone="blue">{dict.common.artistProduct}</Badge>}
          {p.isNew      && <Badge tone="glass">{dict.common.new}</Badge>}
          {p.bestSeller && <Badge tone="glass">{dict.common.bestSeller}</Badge>}
        </div>
      </Link>

      {/* info body */}
      <div
        className="p-5"
        style={{ animation: "ra-hc-stagger 380ms 160ms var(--ease-out) both" }}
      >
        {/* title + price */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Sku value={p.sku} />
            <h3 className="mt-1 font-display text-[18px] font-semibold leading-tight text-foreground">
              {t(p.title, locale)}
            </h3>
            {p.artist && (
              <p className="mt-0.5 text-caption text-foreground-secondary">{t(p.artist.name, locale)}</p>
            )}
          </div>
          <div className="shrink-0 text-end">
            <span className="block text-h4 font-bold tabular text-foreground">{formatPrice(p.price, locale)}</span>
            {p.compareAt && (
              <span className="block text-caption tabular text-muted line-through">{formatPrice(p.compareAt, locale)}</span>
            )}
          </div>
        </div>

        <p className="mt-2.5 line-clamp-2 text-body-sm text-foreground-secondary">{t(p.description, locale)}</p>

        {/* swatches */}
        <div className="mt-3.5 flex items-center gap-2.5">
          <ColorSwatches
            options={p.colors.map((c) => ({ id: c.id, name: t(c.name, locale), hex: c.hex, stock: c.stock }))}
            value={colorId}
            onChange={setColorId}
            size="md"
            label={dict.common.color}
          />
          <span className="text-caption text-foreground-secondary">{t(color.name, locale)}</span>
        </div>

        {/* specs */}
        {p.specs.length > 0 && (
          <dl className="mt-4 grid grid-cols-3 gap-x-2 gap-y-2 rounded-lg bg-background-secondary px-3 py-2.5">
            {p.specs.slice(0, 3).map((s) => (
              <div key={t(s.label, "en")}>
                <dt className="text-[10px] uppercase tracking-wider text-muted">{t(s.label, locale)}</dt>
                <dd className="mt-0.5 text-caption font-medium text-foreground">{t(s.value, locale)}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* stock */}
        <div className="mt-3 flex items-center gap-1.5">
          <span className={cn("h-1.5 w-1.5 rounded-full", out ? "bg-error" : color.stock <= 4 ? "bg-warning" : "bg-success")} />
          <span className={cn("text-caption", out ? "text-error" : color.stock <= 4 ? "text-warning" : "text-muted")}>
            {out ? dict.common.outOfStock : color.stock <= 4 ? dict.common.lowStock : dict.common.inStock}
          </span>
        </div>

        {/* CTA */}
        <div className="mt-4 flex items-center gap-2.5">
          <AddToCartButton
            disabled={out}
            className="h-10 flex-1 text-sm"
            line={{ kind: "product", id: p.id, sku: p.sku, title: t(p.title, locale), image: color.image, price: p.price, colorName: t(color.name, locale), colorHex: color.hex, href: url }}
          />
          <Link href={url} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-foreground hover:bg-surface">
            <ArrowUpRight className="h-4 w-4 rtl-flip" />
          </Link>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   PATTERN inner panel
════════════════════════════════════════════════════════════════ */
function PatternPanel({
  p, dict, locale, imageRef,
}: {
  p: PatternCardData;
  dict: Dictionary;
  locale: Locale;
  imageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const url = href(locale, `/patterns/${p.slug}`);
  const colorways = useMemo(() => resolveColorways(p), [p]);
  const defaultCw = colorways.find((c) => c.isDefault) ?? colorways[0];
  const [cwId, setCwId] = useState(defaultCw?.id ?? "default");
  const activeCw = colorways.find((c) => c.id === cwId) ?? defaultCw;
  const image = activeCw?.image || p.image;

  return (
    <>
      <Link href={url} className="relative block aspect-[3/2] w-full overflow-hidden bg-background-secondary group/img">
        <div
          ref={imageRef}
          className="absolute inset-[-6%] transition-transform duration-[60ms] ease-linear"
          style={{ willChange: "transform" }}
        >
          <Image
            key={image}
            src={image}
            alt={t(p.title, locale)}
            fill
            sizes={`${PANEL_W + 72}px`}
            className="object-cover"
            style={{ animation: "ra-hc-image 480ms 100ms var(--ease-out) both" }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 bg-foreground/10">
          <span className="flex items-center gap-1.5 rounded-full bg-surface/90 px-3 py-1.5 text-caption font-medium text-foreground shadow-md backdrop-blur-sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {dict.common.viewPattern}
          </span>
        </div>

        {/* colourway mini-previews like Spoonflower */}
        {colorways.length > 1 && (
          <div
            className="absolute bottom-3 inset-inline-start-3 flex gap-1.5"
            style={{ animation: "ra-hc-stagger 380ms 280ms var(--ease-out) both" }}
            onClick={(e) => e.preventDefault()}
          >
            {colorways.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCwId(c.id); }}
                title={t(c.name, locale)}
                className={cn(
                  "relative h-9 w-9 overflow-hidden rounded-md ring-offset-1 ring-offset-surface transition-all duration-200 hover:scale-110",
                  c.id === activeCw?.id ? "ring-2 ring-white scale-110 shadow-md" : "ring-1 ring-white/40 hover:ring-white/80",
                )}
              >
                <Image src={c.image} alt={t(c.name, locale)} fill sizes="36px" className="object-cover" />
              </button>
            ))}
            {colorways.length > 5 && (
              <span className="flex h-9 items-center rounded-md bg-black/40 px-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
                +{colorways.length - 5}
              </span>
            )}
          </div>
        )}

        <div
          className="absolute top-3 inset-inline-start-3 flex flex-wrap gap-1"
          style={{ animation: "ra-hc-stagger 380ms 60ms var(--ease-out) both" }}
        >
          {p.isNew      && <Badge tone="glass">{dict.common.new}</Badge>}
          {p.trending   && <Badge tone="glass">{dict.common.trending}</Badge>}
          {p.bestSeller && !p.trending && <Badge tone="glass">{dict.common.bestSeller}</Badge>}
          {!p.artistId  && <Badge tone="accent">{dict.common.sitePattern}</Badge>}
        </div>
      </Link>

      <div
        className="p-5"
        style={{ animation: "ra-hc-stagger 380ms 160ms var(--ease-out) both" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Sku value={p.sku} />
              {p.category && <Badge>{t(p.category.name, locale)}</Badge>}
            </div>
            <h3 className="mt-1 font-display text-[18px] font-semibold leading-tight text-foreground">
              {t(p.title, locale)}
            </h3>
            {p.artist && (
              <p className="mt-0.5 text-caption text-foreground-secondary">{t(p.artist.name, locale)}</p>
            )}
          </div>
          <span className="shrink-0 text-h4 font-bold tabular text-foreground">{formatPrice(p.price, locale)}</span>
        </div>

        <p className="mt-2.5 line-clamp-2 text-body-sm text-foreground-secondary">{t(p.description, locale)}</p>

        {/* colourway dots */}
        {colorways.length > 0 && (
          <div className="mt-3.5 flex items-center gap-2.5">
            <ColorwayDots colorways={colorways} value={activeCw?.id} onChange={setCwId} size="md" max={6} locale={locale} />
            <span className="text-caption text-foreground-secondary">{activeCw ? t(activeCw.name, locale) : ""}</span>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-background-secondary px-3 py-2.5 text-sm">
          <div><dt className="text-caption text-muted">{dict.common.repeat}</dt><dd className="mt-0.5 font-medium text-foreground">{t(p.specs.repeat, locale)}</dd></div>
          <div><dt className="text-caption text-muted">{dict.common.dpi}</dt><dd className="mt-0.5 font-medium text-foreground">{p.specs.dpi}</dd></div>
          <div><dt className="text-caption text-muted">{dict.common.formats}</dt><dd className="mt-0.5 font-medium text-foreground">{p.specs.formats}</dd></div>
          <div><dt className="text-caption text-muted">{locale === "fa" ? "رنگ‌بندی" : "Colourways"}</dt><dd className="mt-0.5 font-medium text-foreground">{colorways.length || p.specs.colors}</dd></div>
        </dl>

        <div className="mt-4 flex items-center gap-2.5">
          <AddToCartButton
            className="h-10 flex-1 text-sm"
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
          />
          <Link href={url} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground transition-colors hover:border-foreground hover:bg-surface">
            <ArrowUpRight className="h-4 w-4 rtl-flip" />
          </Link>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   PUBLIC HOOK
════════════════════════════════════════════════════════════════ */
export function useHoverCard(item: HoverItem) {
  const [state, setState] = useState<HoverState | null>(null);
  const anchorRef         = useRef<HTMLElement | null>(null);
  const showTimer         = useRef<ReturnType<typeof setTimeout> | null>(null);
  // shared with Panel so panel's mouseenter can cancel a hide started by card's mouseleave
  const sharedHideTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelShow = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
  }, []);

  const cancelHide = useCallback(() => {
    if (sharedHideTimer.current) clearTimeout(sharedHideTimer.current);
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    sharedHideTimer.current = setTimeout(() => setState(null), HIDE_DELAY);
  }, [cancelHide]);

  /** open immediately — used by click */
  const open = useCallback(
    (el: HTMLElement) => {
      cancelShow();
      cancelHide();
      anchorRef.current = el;
      setState({ item, anchor: el });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item],
  );

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      cancelShow();
      cancelHide();
      const el = e.currentTarget;
      anchorRef.current = el;
      // show after SHOW_DELAY (2 s dwell)
      showTimer.current = setTimeout(() => {
        if (anchorRef.current) setState({ item, anchor: anchorRef.current });
      }, SHOW_DELAY);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [item],
  );

  const onMouseLeave = useCallback(() => {
    cancelShow();           // cancel pending dwell timer
    scheduleHide();         // start hide grace period (only matters if panel is open)
  }, [cancelShow, scheduleHide]);

  /** click: open the panel; if it's already open let all inner clicks pass through normally */
  const onClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      // if a real interactive element (link, button) was clicked, don't intercept
      const target = e.target as HTMLElement;
      if (target.closest("a, button")) return;
      // panel already open — do nothing extra
      if (state) return;
      e.preventDefault();
      open(e.currentTarget);
    },
    [state, open],
  );

  const close = useCallback(() => {
    cancelShow();
    cancelHide();
    setState(null);
  }, [cancelShow, cancelHide]);

  const portal = state
    ? <Panel item={state.item} anchor={state.anchor} hideTimer={sharedHideTimer} onClose={close} />
    : null;

  return { onMouseEnter, onMouseLeave, onClick, portal };
}
