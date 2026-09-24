"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CatalogLayout, FilterSidebar, type FilterGroup, type FilterOption } from "@/components/product/FilterSidebar";
import { ProductGrid } from "@/components/product/Grids";
import { EmptyState, GridSkeleton } from "@/components/ui/States";
import { useLocale } from "@/components/providers/AppProviders";
import { filterProducts } from "@/lib/data/filters";
import { enrichProduct } from "@/lib/data/enrich";
import { FAMILY_OTHER, PRODUCT_FAMILIES } from "@/lib/data/families";
import { cn, faNum } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";
import type { SiteContent } from "@/lib/types";

/** Sidebar entry for one product family (id = family slug, so URLs read `?family=curtain`). */
export type FamilyOption = FilterOption;

interface Props {
  site: SiteContent;
  locale: Locale;
  categories: FilterOption[];
  sorts: FilterOption[];
  extra: FilterGroup[];
  title?: string;
  /**
   * Product families (wallpaper, curtain, …). When given, the grid is split into
   * one labelled section per family — in the canonical order — and the sidebar
   * gains the «الگو» group the families hang under.
   */
  families?: FilterOption[];
  /** Label of the parent group the families sit under («الگو»). */
  familyParent?: string;
}

function FilteredContent({ site, locale, categories, sorts, extra, title, families, familyParent }: Props) {
  const { dict } = useLocale();
  const fa = locale === "fa";
  const sp = useSearchParams();
  const pathname = usePathname();

  const spRecord: Record<string, string | undefined> = {};
  sp.forEach((value, key) => {
    spRecord[key] = value;
  });

  const catMap = Object.fromEntries(site.categories.map((c) => [c.slug, c.id]));
  const familyMap = Object.fromEntries(PRODUCT_FAMILIES.map((family) => [family.slug, family.id]));
  const list = filterProducts(site.products, spRecord, catMap, familyMap).map((p) => enrichProduct(site, p));

  const activeFamily = sp.get("family");
  const grouped = Boolean(families?.length);
  const activeFamilyLabel = families?.find((family) => family.id === activeFamily)?.label ?? null;

  /* One section per family, in the taxonomy order, plus a home for unclassified items. */
  const sections = grouped
    ? [
        ...PRODUCT_FAMILIES.map((family) => ({
          key: family.slug,
          label: family.name[locale] ?? family.name.fa,
          items: list.filter((p) => p.familyId === family.id),
        })),
        {
          key: "other",
          label: FAMILY_OTHER[locale] ?? FAMILY_OTHER.fa,
          items: list.filter((p) => !p.familyId),
        },
      ].filter((section) => section.items.length > 0)
    : [];

  const withParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    return `${pathname}${next.toString() ? `?${next}` : ""}`;
  };

  const lead: FilterGroup[] = families?.length
    ? [{ key: "family", label: familyParent ?? (fa ? "الگو" : "Pattern"), options: families, appearance: "nested" }]
    : [];

  return (
    <CatalogLayout
      sidebar={
        <FilterSidebar
          total={list.length}
          categories={categories}
          sorts={sorts}
          extra={extra}
          lead={lead}
          title={title}
        />
      }
    >
      <div className="mt-2 lg:mt-0">
        {grouped && !list.length ? (
          <EmptyState
            title={
              activeFamilyLabel
                ? fa
                  ? `هنوز اثری در دسته «${activeFamilyLabel}» منتشر نشده`
                  : `Nothing in «${activeFamilyLabel}» yet`
                : undefined
            }
            description={
              activeFamilyLabel
                ? fa
                  ? "این دسته برای آپلود هنرمندان باز است؛ به‌محض انتشار اولین اثر، همین‌جا نمایش داده می‌شود."
                  : "This category is open for artist uploads — the first published work shows up right here."
                : undefined
            }
            action={
              activeFamilyLabel ? (
                <Link
                  href={withParam("family", null)}
                  className="inline-flex rounded-full border border-border px-4 py-2 text-sm hover:border-foreground"
                >
                  {fa ? "نمایش همه دسته‌ها" : "Show all categories"}
                </Link>
              ) : undefined
            }
          />
        ) : grouped ? (
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.key} id={`family-${section.key}`} className="scroll-mt-[calc(var(--header-h)+1rem)]">
                <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-display text-h4 text-foreground">{section.label}</h3>
                    <span className="tabular text-caption text-muted">
                      {fa ? faNum(section.items.length) : section.items.length} {dict.common.results}
                    </span>
                  </div>
                  <Link
                    href={activeFamily === section.key ? withParam("family", null) : withParam("family", section.key)}
                    className="text-caption font-medium text-foreground-secondary underline-offset-4 transition-colors hover:text-accent hover:underline"
                  >
                    {activeFamily === section.key
                      ? fa
                        ? "نمایش همه دسته‌ها"
                        : "Show all categories"
                      : fa
                        ? "فقط این دسته"
                        : "This category only"}
                  </Link>
                </header>
                <div className={cn(sections.length > 1 && "pt-1")}>
                  <ProductGrid products={section.items} />
                </div>
              </section>
            ))}
          </div>
        ) : (
          <ProductGrid products={list} />
        )}
      </div>
    </CatalogLayout>
  );
}

export function ShopFiltered(props: Props) {
  return (
    <Suspense fallback={<GridSkeleton ratio="aspect-square" />}>
      <FilteredContent {...props} />
    </Suspense>
  );
}
