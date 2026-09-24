import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Layers, Sparkles, Truck } from "lucide-react";
import { Badge, Sku } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { familyName } from "@/lib/data/families";
import type { Locale } from "@/lib/i18n/types";
import type { EnrichedProduct } from "@/lib/data/queries";
import type { ShopWork } from "@/lib/marketplace/shop-works";
import { faNum, formatPrice, href, t } from "@/lib/utils";

export interface ShopFamilyChip {
  /** family slug — `?family=<id>` */
  id: string;
  label: string;
  count?: number;
}

interface Props {
  locale: Locale;
  eyebrow: string;
  title: string;
  description: string;
  /** every product of the shop — the hero picks its tiles from them */
  products: EnrichedProduct[];
  /** published artist works listed in the shop — counted in the live numbers */
  works?: ShopWork[];
  families: ShopFamilyChip[];
  brand: string;
  labels: {
    siteExclusive: string;
    artistProduct: string;
    featured: string;
    colourways: string;
    browseFamily: string;
    allColourways: string;
    products: string;
    productFamilies: string;
    makers: string;
    studio: string;
  };
  banner?: { title: string; text: string } | null;
}

/**
 * The shop's hero — one section, four movements:
 *
 *   1. a dark boutique panel: the collection's name, one line of copy, the two
 *      doors into the catalogue (site-exclusive / artist pieces);
 *   2. live numbers straight from the catalogue (products · families ·
 *      colourways · makers);
 *   3. a mosaic of real products — a lead piece, a second piece and the lead's
 *      colourways — instead of a single flat image;
 *   4. a rail that browses the eight families (`?family=<slug>`) beside the
 *      service note.
 *
 * Only the hero changes; the shop itself (filters, sorting, sections) is
 * rendered by `ShopFiltered` exactly as before.
 */
export function ShopHero({ locale, eyebrow, title, description, products, works = [], families, brand, labels, banner }: Props) {
  const fa = locale === "fa";
  const num = (n: number) => (fa ? faNum(n) : String(n));

  const lead = products.find((p) => !p.artistId && p.featured) ?? products[0];
  const second = products.find((p) => p.id !== lead?.id && !p.artistId && p.isNew) ?? products.find((p) => p.id !== lead?.id);

  const familiesInUse = families.filter((f) => (f.count ?? 0) > 0).length;
  const colourways =
    products.reduce((total, p) => total + p.colors.length, 0) + works.reduce((total, work) => total + work.colourways.length, 0);
  const makers = new Set([...products.map((p) => p.artistId), ...works.map((work) => work.artistId)].filter(Boolean)).size;

  const stats = [
    { value: num(products.length + works.length), label: labels.products },
    { value: `${num(familiesInUse)}/${num(families.length)}`, label: labels.productFamilies },
    { value: num(colourways), label: labels.colourways },
    { value: num(makers), label: labels.makers },
  ];

  const leadColours = lead?.colors ?? [];
  const makerOf = (p: EnrichedProduct) => (p.artist ? t(p.artist.name, locale) : brand);

  return (
    <div className="grid gap-3 lg:grid-cols-12 lg:gap-4">
      {/* ── 1 · the boutique panel ─────────────────────────────────────────── */}
      <article className="relative isolate flex flex-col overflow-hidden rounded-xl bg-[#0d1117] p-8 text-white md:p-10 lg:col-span-5">
        <span aria-hidden className="pointer-events-none absolute -end-20 -top-24 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
        <span aria-hidden className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

        <p className="anim-blur-in text-label flex items-center gap-2 text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          {eyebrow}
        </p>
        <h1 className="anim-blur-in mt-4 font-display text-h1 text-balance" style={{ animationDelay: "80ms" }}>{title}</h1>
        <p className="anim-blur-in mt-4 max-w-md text-body-lg text-white/70" style={{ animationDelay: "160ms" }}>{description}</p>

        <div className="anim-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "220ms" }}>
          <Button href={href(locale, "/shop?owner=site")} variant="accent" size="md">
            {labels.siteExclusive}
          </Button>
          <Button
            href={href(locale, "/shop?owner=artist")}
            variant="outline"
            size="md"
            className="border-white/25 text-white hover:border-white hover:text-white"
          >
            {labels.artistProduct}
          </Button>
        </div>

        {/* live numbers from the catalogue — anchored to the panel's foot */}
        <div className="mt-10 flex flex-1 flex-col justify-end">
          <div
            className="anim-fade-up grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/15 pt-6 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4"
            style={{ animationDelay: "280ms" }}
          >
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-h3 tabular leading-none text-white">{stat.value}</p>
                <p className="mt-1.5 text-caption text-white/55">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* ── 2 · the product mosaic ─────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 sm:grid-rows-2 lg:col-span-7 lg:gap-4">
        {lead && (
          <Link
            href={href(locale, `/shop/${lead.slug}`)}
            className="group relative row-span-2 min-h-[320px] overflow-hidden rounded-xl bg-background-secondary sm:min-h-[440px]"
          >
            <Image
              src={lead.colors[0].image}
              alt={t(lead.title, locale)}
              fill
              priority
              quality={90}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
              className="img-zoom object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
              <Badge tone="dark" className="rounded-full bg-white/90 text-black">{labels.featured}</Badge>
              {lead.isNew && <Badge tone="dark" className="rounded-full bg-accent text-accent-foreground">{fa ? "جدید" : "New"}</Badge>}
              <span className="ms-auto flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-white/90 text-black opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4 rtl-flip" />
              </span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <p className="text-caption text-white/70">
                {familyName(lead.familyId, locale) || labels.studio} · {makerOf(lead)}
              </p>
              <p className="mt-1 font-display text-h3">{t(lead.title, locale)}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Sku value={lead.sku} className="border-white/20 bg-white/10 text-white/80" />
                <span className="text-sm font-semibold tabular">{formatPrice(lead.price, locale)}</span>
              </div>
            </div>
          </Link>
        )}

        {second && (
          <Link
            href={href(locale, `/shop/${second.slug}`)}
            className="group relative min-h-[200px] overflow-hidden rounded-xl bg-background-secondary"
          >
            <Image
              src={second.colors[0].image}
              alt={t(second.title, locale)}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 26vw"
              className="img-zoom object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
              <div className="min-w-0">
                <p className="truncate text-caption text-white/70">{familyName(second.familyId, locale) || labels.studio}</p>
                <p className="mt-0.5 truncate font-display text-h4">{t(second.title, locale)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular">{formatPrice(second.price, locale)}</span>
            </div>
          </Link>
        )}

        {/* the lead piece's colourways — the shop's colour story, at a glance */}
        {lead && leadColours.length > 1 && (
          <div className="flex flex-col rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label flex items-center gap-2 text-accent">
                <Layers className="h-3.5 w-3.5" />
                {labels.colourways}
              </p>
              <span className="text-caption text-muted tabular">{num(leadColours.length)}</span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {leadColours.slice(0, 4).map((colour) => (
                <span key={colour.id} className="relative aspect-square overflow-hidden rounded-md border border-border bg-background-secondary">
                  <Image src={colour.image} alt={t(colour.name, locale)} fill sizes="120px" className="object-cover" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/45 px-1 py-1">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/60" style={{ background: colour.hex }} />
                    <span className="truncate text-[10px] leading-none text-white/85">{t(colour.name, locale)}</span>
                  </span>
                </span>
              ))}
            </div>

            <Link
              href={href(locale, `/shop/${lead.slug}`)}
              className="mt-auto inline-flex items-center gap-1 pt-5 text-caption text-foreground-secondary transition-colors hover:text-foreground"
            >
              {labels.allColourways}
              <ArrowUpRight className="h-3.5 w-3.5 rtl-flip" />
            </Link>
          </div>
        )}
      </div>

      {/* ── 3 · the family rail + the service note ─────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-background-secondary px-5 py-4 lg:col-span-12 lg:flex-row lg:items-center lg:justify-between">
        <ul className="flex flex-wrap items-center gap-2">
          <li className="me-1 text-caption text-muted">{labels.browseFamily}</li>
          {families.map((family) => (
            <li key={family.id}>
              <Link
                href={`${href(locale, "/shop")}?family=${family.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-caption text-foreground-secondary transition-colors hover:border-foreground hover:text-foreground"
              >
                {family.label}
                {family.count ? <span className="tabular text-muted">{num(family.count)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>

        {banner && (
          <p className="flex items-center gap-2 text-caption text-foreground-secondary lg:shrink-0">
            <Truck className="h-4 w-4 shrink-0 text-accent" />
            <strong className="font-medium text-foreground">{banner.title}</strong>
            <span className="hidden sm:inline">· {banner.text}</span>
          </p>
        )}
      </div>
    </div>
  );
}
