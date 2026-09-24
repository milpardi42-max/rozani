import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { faNum, href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.about };
}
export default async function AboutPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const fa = locale === "fa";
  const values = fa ? [["الگو", "زبان مشترک سطح و فضا."], ["طراحی", "دقیق، مینیمال، بادوام."], ["خلاقیت", "با احترام به ریشه و نگاه به آینده."], ["سبک زندگی", "چیزهایی که هر روز با آن‌ها زندگی می‌کنیم."]] : [["Pattern", "The shared language of surface and space."], ["Design", "Precise, minimal, lasting."], ["Creativity", "Respecting roots, looking forward."], ["Lifestyle", "The things we live with every day."]];

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.about },
  ];

  return (
    <>
      <PageHero
        eyebrow={d.nav.about}
        title={fa ? "رزی آتلیه؛ استودیویی برای الگو و فضا" : "Rosie Atelier — a studio for pattern and space"}
        description={d.footer.about}
        image={site.hero.image}
        breadcrumb={breadcrumb}
        locale={locale}
        zoomDirection="out"
      />
      <section className="container-x section-y grid gap-12 lg:grid-cols-12">
        <div className="prose-ra lg:col-span-7">
          <p>{fa ? "رزی آتلیه در سال ۱۴۰۲ توسط راضیه خیری‌پور با یک ایده‌ی ساده شروع شد: الگوهای خوب باید راهی مستقیم به دیوارها، پارچه‌ها و اشیای زندگی روزمره داشته باشند؛ و طراحان‌شان باید دیده و منصفانه پرداخت شوند." : "Rosie Atelier was founded in 2023 by Razieh Kheiripour with a simple idea: good patterns deserve a direct path to walls, textiles and everyday objects — and their designers deserve to be seen and paid fairly."}</p>
          <p>{fa ? "امروز رزی آتلیه یک مارکت‌پلیس الگو، یک فروشگاه محصولات اختصاصی، یک گالری پورتفولیو و یک آکادمی است؛ همه در یک اکوسیستم." : "Today Rosie Atelier is a pattern marketplace, an exclusive product store, a portfolio gallery and an academy — all in one ecosystem."}</p>
        </div>
        <dl className="grid grid-cols-2 gap-4 lg:col-span-5">
          {[[site.patterns.length * 40, d.home.heroStat1], [site.artists.length * 30, d.home.heroStat2], [0, d.home.heroStat3], [2, fa ? "زبان" : "languages"]].map(([n, l]) => <Reveal key={String(l)} className="rounded-lg border border-border p-6"><dd className="font-display text-h1 tabular">{fa ? faNum(n as number) : n}+</dd><dt className="text-caption text-foreground-secondary">{l}</dt></Reveal>)}
        </dl>
      </section>
      <section className="bg-background-secondary"><div className="container-x section-y grid gap-6 md:grid-cols-4">
        {values.map(([t1, s], i) => <Reveal key={t1} delay={i * 60}><p className="text-label text-accent">0{i + 1}</p><h3 className="mt-2 font-display text-h2">{t1}</h3><p className="mt-2 text-body-sm text-foreground-secondary">{s}</p></Reveal>)}
      </div></section>
      <section className="container-x section-y"><div className="relative aspect-[21/9] overflow-hidden rounded-xl"><Image src={site.hero.image} alt="" fill sizes="100vw" className="object-cover" /></div></section>
    </>
  );
}
