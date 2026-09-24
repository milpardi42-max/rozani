"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Layers, Plus, Search, ShoppingBag, Sparkles, X } from "lucide-react";
import { useMarketplaceCart } from "@/components/marketplace/MarketplaceCart";
import { Badge } from "@/components/ui/Badge";
import { formatPrice, href, t } from "@/lib/utils";
import { formatLabel } from "@/lib/marketplace/formats";
import type { Locale } from "@/lib/i18n/types";
import type { AssetKind, LicenseTier, PricePair } from "@/lib/marketplace/types";

/** Public projection returned by `/api/marketplace/assets` (no master key). */
export interface CatalogAsset {
  id: string;
  slug: string;
  title: { fa: string; en: string };
  kind: AssetKind;
  tags: string[];
  status: string;
  soldExclusive?: boolean;
  artistId: string | null;
  createdAt: string;
  stats: { views: number; sales: number };
  fromPrice: PricePair | null;
  tiers: LicenseTier[];
  media: { preview: string | null; tile: string | null; thumbs: string[]; mockups: { key: string; kind: string; variant?: string }[] };
  seamless: { verdict: string; score: number; tileable: boolean };
  /** Delivered formats (PNG, PSD, AI…) and the colour versions of the work. */
  formats?: string[];
  colourways?: { hex: string; name: { fa: string; en: string } }[];
}

/**
 * Catalogue grid.
 *
 * The server ships the first page (so the storefront renders without JS) and the
 * client refines it through `/api/marketplace/assets`. Each card can add any
 * enabled tier to the digital cart without a page change.
 */

const KINDS: { id: AssetKind; fa: string; en: string }[] = [
  { id: "pattern", fa: "الگو", en: "Pattern" },
  { id: "illustration", fa: "تصویرسازی", en: "Illustration" },
  { id: "photo", fa: "عکس", en: "Photo" },
  { id: "vector", fa: "وکتور", en: "Vector" },
  { id: "template", fa: "قالب", en: "Template" },
  { id: "font", fa: "فونت", en: "Font" },
];

interface Props {
  locale: Locale;
  initial: CatalogAsset[];
}

export function MarketplaceCatalog({ locale, initial }: Props) {
  const fa = locale === "fa";
  const { lines, add, remove, has, subtotal, captureReferral } = useMarketplaceCart();
  /* Affiliate landing (`?ref=CODE`) — remembered so the discount survives the
     trip through the catalogue, the asset page and the cart. */
  const referral = useSearchParams().get("ref");
  useEffect(() => {
    if (referral) captureReferral(referral);
  }, [referral, captureReferral]);
  const [assets, setAssets] = useState<CatalogAsset[]>(initial);
  const [kinds, setKinds] = useState<AssetKind[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "price" | "popular">("recent");
  const [loading, setLoading] = useState(false);
  const [openTiers, setOpenTiers] = useState<string | null>(null);

  async function refresh(next: { kinds?: AssetKind[]; query?: string; sort?: typeof sort } = {}) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      for (const kind of next.kinds ?? kinds) params.append("kind", kind);
      const q = next.query ?? query;
      if (q) params.set("q", q);
      params.set("sort", next.sort ?? sort);
      params.set("limit", "48");
      const response = await fetch(`/api/marketplace/assets?${params.toString()}`);
      const data = (await response.json()) as { assets?: CatalogAsset[] };
      if (data.assets) setAssets(data.assets);
    } finally {
      setLoading(false);
    }
  }

  const toggleKind = (kind: AssetKind) => {
    const next = kinds.includes(kind) ? kinds.filter((item) => item !== kind) : [...kinds, kind];
    setKinds(next);
    void refresh({ kinds: next });
  };

  const empty = !assets.length;
  const cartTotal = useMemo(() => formatPrice(subtotal, locale), [subtotal, locale]);

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-h2">{fa ? "آثار موجود" : "Available works"}</h2>
          <p className="mt-1 text-caption text-foreground-secondary">
            {fa
              ? "روی «افزودن به سبد» بزنید تا لایسنس مورد نظر را انتخاب کنید."
              : "Press “Add” and pick the license you need."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-full border border-border px-3 py-2">
            <Search className="h-4 w-4 text-foreground-secondary" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void refresh({ query });
              }}
              placeholder={fa ? "جستجوی اثر…" : "Search works…"}
              className="w-40 bg-transparent text-sm outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  void refresh({ query: "" });
                }}
                aria-label={fa ? "پاک کردن" : "Clear"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>

          <select
            value={sort}
            onChange={(event) => {
              const next = event.target.value as typeof sort;
              setSort(next);
              void refresh({ sort: next });
            }}
            className="rounded-full border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="recent">{fa ? "جدیدترین" : "Newest"}</option>
            <option value="popular">{fa ? "پرفروش‌ترین" : "Best selling"}</option>
            <option value="price">{fa ? "ارزان‌ترین" : "Lowest price"}</option>
          </select>

          {lines.length > 0 && (
            <Link
              href={href(locale, "/marketplace/cart")}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm text-background"
            >
              <ShoppingBag className="h-4 w-4" />
              {fa ? "سبد خرید" : "Cart"} · {cartTotal}
            </Link>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {KINDS.map((kind) => {
          const active = kinds.includes(kind.id);
          return (
            <button
              key={kind.id}
              type="button"
              onClick={() => toggleKind(kind.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
              }`}
            >
              {fa ? kind.fa : kind.en}
            </button>
          );
        })}
        {loading && <span className="self-center text-caption text-foreground-secondary">{fa ? "به‌روزرسانی…" : "Updating…"}</span>}
      </div>

      {empty ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-accent" />
          <p className="mt-3 font-medium">{fa ? "هنوز اثری منتشر نشده است" : "No works published yet"}</p>
          <p className="mt-1 text-caption text-foreground-secondary">
            {fa
              ? "هنرمندان می‌توانند فایل مادر خود را از پنل هنرمند ارسال کنند؛ آثار منتشرشده همین‌جا و در دسته‌ی خودشان در فروشگاه نمایش داده می‌شوند."
              : "Artists can submit a master file from the artist studio; published works appear here and in their shop category."}
          </p>
          <Link href={href(locale, "/artist/marketplace")} className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm">
            {fa ? "میز کار هنرمند" : "Artist studio"}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <article key={asset.id} className="group overflow-hidden rounded-xl border border-border bg-background">
              <Link href={href(locale, `/marketplace/${asset.slug}`)} className="relative block aspect-4/3 overflow-hidden bg-background-secondary">
                {asset.media?.preview ? (
                  <Image
                    src={`/api/marketplace/media?key=${encodeURIComponent(asset.media.preview)}`}
                    alt={t(asset.title, locale)}
                    fill
                    sizes="(max-width:768px) 100vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="grid h-full place-items-center text-caption text-foreground-secondary">
                    {fa ? "پیش‌نمایش در دسترس نیست" : "Preview unavailable"}
                  </span>
                )}
                <span className="absolute start-3 top-3 flex gap-1">
                  {asset.seamless?.verdict === "seamless" && (
                    <Badge tone="success">
                      <Layers className="me-1 h-3 w-3" />
                      {fa ? "بی‌درز" : "Seamless"}
                    </Badge>
                  )}
                  {asset.status === "sold_exclusive" && <Badge tone="error">{fa ? "فروخته‌شده (انحصاری)" : "Sold (exclusive)"}</Badge>}
                </span>
              </Link>

              <div className="p-4">
                <Link href={href(locale, `/marketplace/${asset.slug}`)} className="font-medium hover:text-accent">
                  {t(asset.title, locale)}
                </Link>
                <p className="mt-1 text-caption text-foreground-secondary">
                  {asset.stats.sales > 0 && (fa ? `${asset.stats.sales} فروش` : `${asset.stats.sales} sales`)}
                  {asset.stats.sales > 0 && asset.fromPrice ? " · " : ""}
                  {asset.fromPrice ? (fa ? `از ${formatPrice(asset.fromPrice, locale)}` : `from ${formatPrice(asset.fromPrice, locale)}`) : ""}
                </p>

                {((asset.formats?.length ?? 0) > 0 || (asset.colourways?.length ?? 0) > 1) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {asset.colourways && asset.colourways.length > 1 && (
                      <span className="flex items-center gap-1" title={fa ? "رنگ‌بندی‌ها" : "Colourways"}>
                        {asset.colourways.slice(0, 6).map((colourway) => (
                          <span
                            key={colourway.hex + colourway.name.en}
                            className="h-3.5 w-3.5 rounded-full border border-border"
                            style={{ background: colourway.hex }}
                            aria-label={colourway.name[locale] ?? colourway.name.fa}
                          />
                        ))}
                        {asset.colourways.length > 6 && (
                          <span className="text-[10px] text-muted" dir="ltr">
                            +{asset.colourways.length - 6}
                          </span>
                        )}
                      </span>
                    )}
                    {asset.formats && asset.formats.length > 0 && (
                      <span className="truncate text-[11px] text-foreground-secondary" dir="ltr">
                        {asset.formats.map((id) => formatLabel(id, locale)).join(" · ")}
                      </span>
                    )}
                  </div>
                )}

                {asset.status === "sold_exclusive" ? (
                  <p className="mt-3 rounded-lg bg-background-secondary px-3 py-2 text-caption text-foreground-secondary">
                    {fa ? "این اثر برای همیشه از فروش خارج شده است." : "This work has been permanently delisted."}
                  </p>
                ) : (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setOpenTiers(openTiers === asset.id ? null : asset.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-foreground"
                    >
                      {has(asset.id) ? <Check className="h-4 w-4 text-accent" /> : <Plus className="h-4 w-4" />}
                      {has(asset.id) ? (fa ? "در سبد — تغییر لایسنس" : "In cart — change license") : fa ? "افزودن به سبد" : "Add to cart"}
                    </button>

                    {openTiers === asset.id && (
                      <ul className="mt-2 space-y-1.5">
                        {(asset.tiers ?? [])
                          .filter((tier) => tier.enabled)
                          .map((tier) => (
                            <li key={tier.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2">
                              <span className="min-w-0">
                                <span className="block truncate text-sm">{t(tier.title, locale)}</span>
                                <span className="block text-caption text-foreground-secondary">{formatPrice(tier.price, locale)}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  add({
                                    assetId: asset.id,
                                    tierId: tier.id,
                                    slug: asset.slug,
                                    titleFa: asset.title.fa,
                                    titleEn: asset.title.en,
                                    tierTitleFa: tier.title.fa,
                                    tierTitleEn: tier.title.en,
                                    licenseKind: tier.kind,
                                    price: tier.price,
                                    preview: asset.media?.preview ?? null,
                                    artistFa: "",
                                    artistEn: "",
                                  })
                                }
                                className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs text-background"
                              >
                                {lines.some((line) => line.assetId === asset.id && line.tierId === tier.id) ? (
                                  <span className="inline-flex items-center gap-1">
                                    {fa ? "حذف" : "Remove"}
                                    <X
                                      className="h-3 w-3"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        remove(asset.id, tier.id);
                                      }}
                                    />
                                  </span>
                                ) : fa ? (
                                  "انتخاب"
                                ) : (
                                  "Select"
                                )}
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export type { LicenseTier };
