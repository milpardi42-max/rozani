import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.stories };
}
export default async function StoriesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  return (
    <>
      <PageHero eyebrow={d.nav.stories} title={d.home.storiesTitle} description={d.home.storiesDesc} />
      <div className="container-x space-y-16 pb-20">
        {site.stories.map((s, i) => {
          const a = site.artists.find((x) => x.id === s.artistId);
          return (
            <Reveal key={s.id}>
              <Link href={href(locale, `/stories/${s.slug}`)} className={`group grid items-center gap-8 lg:grid-cols-12 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg lg:col-span-7"><Image src={s.image} alt="" fill sizes="(max-width:1024px) 100vw, 60vw" className="img-zoom object-cover" /></div>
                <div className="lg:col-span-5">
                  {a && <p className="text-label text-accent">{t(a.name, locale)} · {t(a.profession, locale)}</p>}
                  <h2 className="mt-3 font-display text-h2 text-balance group-hover:text-accent transition-colors">{t(s.title, locale)}</h2>
                  <p className="mt-4 text-body text-foreground-secondary">{t(s.excerpt, locale)}</p>
                  <p className="mt-6 font-display text-h3 italic text-foreground-secondary">{t(s.body, locale)}</p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </>
  );
}
