import type { Metadata } from "next";
import { ShopFiltered, type FamilyOption } from "@/components/product/ShopFiltered";
import { ShopHero } from "@/components/shop/ShopHero";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { FAMILY_PARENT, PRODUCT_FAMILIES } from "@/lib/data/families";
import { enrichProduct, getSite } from "@/lib/data/queries";
import { listShopWorks } from "@/lib/marketplace/shop-works-server";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSite();
  const m = site.seo.find((s) => s.path === "/shop");
  return { title: m ? { absolute: t(m.title, locale) } : dictionaries[locale].nav.products, description: m ? t(m.description, locale) : undefined };
}

export default async function ShopPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const exclusive = site.collections.find((c) => c.slug === "atelier-exclusive");
  const banner = site.banners.find((b) => b.enabled && b.placement === "shop");
  const usedCats = site.categories.filter((c) => site.products.some((p) => p.categoryId === c.id));
  /* Published artist works (digital licences), filed under the family chosen on upload. */
  const works = await listShopWorks(site);

  /* The eight product families every pattern is made for — the «الگو» tree in the sidebar.
     All of them stay listed (even before the first product lands in one) so an artist's
     upload always has a real category to point at. Counts include the artists' works. */
  const families: FamilyOption[] = PRODUCT_FAMILIES.map((family) => {
    const count =
      site.products.filter((p) => p.familyId === family.id).length + works.filter((work) => work.familyId === family.id).length;
    return { id: family.slug, label: family.name[locale] ?? family.name.fa, count: count || undefined };
  });

  /* The hero picks its product tiles from the real catalogue. */
  const products = site.products.slice().sort((a, b) => a.order - b.order).map((p) => enrichProduct(site, p));

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.products },
  ];

  return (
    <>
      {/* Boutique hero — panel · product mosaic · family rail (see ShopHero) */}
      <section className="container-x pt-[calc(var(--header-h)+1.5rem)]">
        <Breadcrumb items={breadcrumb} locale={locale} className="mb-5" />
        <ShopHero
          locale={locale}
          eyebrow={locale === "fa" ? "فروشگاه رزی آتلیه" : "The Rosie Atelier shop"}
          title={exclusive ? t(exclusive.title, locale) : d.nav.products}
          description={exclusive ? t(exclusive.description, locale) : d.home.exclusiveDesc}
          products={products}
          works={works}
          families={families}
          brand={d.brand}
          labels={{
            siteExclusive: d.common.siteExclusive,
            artistProduct: d.common.artistProduct,
            featured: d.common.featured,
            colourways: d.common.colorways,
            browseFamily: locale === "fa" ? "مرور بر اساس خانواده" : "Browse by family",
            allColourways: locale === "fa" ? "همه‌ی رنگ‌بندی‌ها" : "All colourways",
            products: locale === "fa" ? "محصول" : "Products",
            productFamilies: locale === "fa" ? "خانواده‌ی سطح" : "Surface families",
            makers: locale === "fa" ? "طراح همکار" : "Contributing designers",
            studio: locale === "fa" ? "رزی آتلیه" : "Rosie Atelier",
          }}
          banner={banner ? { title: t(banner.title, locale), text: t(banner.text, locale) } : null}
        />
      </section>

      <div className="container-x pb-20 pt-10">
        <ShopFiltered
          site={site}
          locale={locale}
          title={locale === "fa" ? "فروشگاه سطح و دکور" : "Surface & décor shop"}
          families={families}
          familyParent={FAMILY_PARENT[locale]}
          works={works}
          categories={usedCats
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((c) => ({
              id: c.slug,
              label: t(c.name, locale),
              count: site.products.filter((p) => p.categoryId === c.id).length,
            }))}
          sorts={[
            { id: "new", label: d.common.new },
            { id: "best", label: d.common.bestSeller },
            { id: "price-asc", label: locale === "fa" ? "ارزان‌ترین" : "Price: low to high" },
            { id: "price-desc", label: locale === "fa" ? "گران‌ترین" : "Price: high to low" },
          ]}
          extra={[
            {
              key: "owner",
              label: d.common.creator,
              options: [
                {
                  id: "site",
                  label: d.brand,
                  count: site.products.filter((p) => !p.artistId).length + works.filter((work) => !work.artistId).length,
                },
                {
                  id: "artist",
                  label: d.nav.artists,
                  count: site.products.filter((p) => !!p.artistId).length + works.filter((work) => !!work.artistId).length,
                },
              ],
            },
          ]}
        />
      </div>
    </>
  );
}
