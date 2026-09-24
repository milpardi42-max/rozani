import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { artistStats, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.artists };
}

export default async function ArtistsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const artists = site.artists.map((a) => {
    const s = artistStats(site, a.id);
    return { ...a, featuredPattern: s.patterns[0] ?? null, portfolioPreview: [] as string[], counts: { patterns: s.patterns.length, projects: 0 } };
  });

  const heroImage = site.artists[0]?.cover ?? site.hero.image;

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.artists },
  ];

  return (
    <>
      <PageHero
        eyebrow={d.nav.artists}
        title={d.home.artistsTitle}
        description={d.home.artistsDesc}
        image={heroImage}
        breadcrumb={breadcrumb}
        locale={locale}
        zoomDirection="in"
      >
        <Button href={href(locale, "/creators/join")} variant="outline">{d.nav.becomeCreator}</Button>
      </PageHero>
      <div className="container-x pb-20">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {artists.map((a, i) => <Reveal key={a.id} delay={(i % 3) * 70}><ArtistCard artist={a} variant="large" /></Reveal>)}
        </div>
      </div>
    </>
  );
}
