import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatternCard } from "@/components/cards/PatternCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { enrichPattern, getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const site = await getSite();
  return LOCALES.flatMap((locale) => site.stories.map((story) => ({ locale, slug: story.slug })));
}
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const site = await getSite();
  const s = site.stories.find((x) => x.slug === slug);
  return s ? { title: t(s.title, locale), description: t(s.excerpt, locale) } : {};
}
export default async function StoryPage({ params }: Props) {
  const { locale, slug } = await params;
  const site = await getSite();
  const s = site.stories.find((x) => x.slug === slug);
  if (!s) notFound();
  const d = dictionaries[locale];
  const a = site.artists.find((x) => x.id === s.artistId);
  const patterns = site.patterns.filter((p) => p.artistId === s.artistId).map((p) => enrichPattern(site, p));
  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.stories, href: href(locale, "/stories") },
    { label: t(s.title, locale) },
  ];
  return (
    <article>
      <section className="relative isolate h-[80svh] min-h-[520px] overflow-hidden bg-[#0d1117] text-white">
        <Image src={s.image} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/95 via-[#0a0d13]/40 to-[#0a0d13]/30" />
        <div className="container-x relative flex h-full flex-col justify-end pb-12 pt-[calc(var(--announce-h,0px)+var(--header-h))]">
          <Breadcrumb items={breadcrumb} locale={locale} className="mb-6 text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_.text-foreground]:text-white [&_.text-foreground-secondary]:text-white/60 [&_.text-border]:text-white/25" />
          <p className="anim-blur-in text-label text-white/70">{d.nav.stories}</p>
          <h1 className="anim-blur-in mt-4 max-w-4xl font-display text-display text-balance" style={{ animationDelay: "100ms" }}>{t(s.title, locale)}</h1>
          {a && <Link href={href(locale, `/artists/${a.slug}`)} className="anim-fade-up mt-6 inline-flex items-center gap-3" style={{ animationDelay: "200ms" }}><span className="relative h-10 w-10 overflow-hidden rounded-full"><Image src={a.avatar} alt="" fill sizes="40px" className="object-cover" /></span><span><span className="block text-sm font-medium">{t(a.name, locale)}</span><span className="block text-caption text-white/70">{t(a.profession, locale)}</span></span></Link>}
        </div>
      </section>
      <section className="container-x section-y">
        <p className="mx-auto max-w-3xl font-display text-h2 leading-snug text-balance">{t(s.excerpt, locale)}</p>
        <blockquote className="mx-auto mt-14 max-w-3xl border-s-2 border-accent ps-6 font-display text-h1 italic text-balance">{t(s.body, locale)}</blockquote>
        <div className="prose-ra mx-auto mt-14">
          <p>{a ? t(a.bio, locale) : ""}</p>
          <p>{locale === "fa" ? "این گفتگو بخشی از مجموعه «روایت هنرمندان» رزی آتلیه است؛ جایی که مسیر، الهام و فرآیند طراحان مستقل را دنبال می‌کنیم." : "This conversation is part of Rosie Atelier's Artist Stories — where we follow the path, inspiration and process of independent designers."}</p>
        </div>
      </section>
      {patterns.length > 0 && (
        <section className="bg-background-secondary"><div className="container-x section-y">
          <SectionHeader eyebrow={d.nav.patterns} title={locale === "fa" ? "الگوهای این هنرمند" : "Patterns by this artist"} href={a ? href(locale, `/artists/${a.slug}`) : undefined} hrefLabel={d.common.viewProfile} />
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">{patterns.slice(0, 4).map((p) => <PatternCard key={p.id} pattern={p} />)}</div>
        </div></section>
      )}
    </article>
  );
}
