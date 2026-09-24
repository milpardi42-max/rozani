import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { InquiryForm } from "@/components/ui/InquiryForm";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { faNum, href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.custom };
}
export default async function CustomPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const fa = locale === "fa";
  const steps = fa ? ["اسکیس و بریف", "طراحی موتیف", "تکرار و پالت", "نمونه‌ی چاپی", "تولید و نصب"] : ["Sketch & brief", "Motif design", "Repeat & palette", "Printed sample", "Production & installation"];

  const coverImage = site.portfolios[0]?.cover ?? site.patterns[2]?.image ?? site.hero.image;

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.custom },
  ];

  return (
    <>
      <PageHero
        eyebrow={d.nav.custom}
        title={d.home.customTitle}
        description={d.home.customDesc}
        image={coverImage}
        breadcrumb={breadcrumb}
        locale={locale}
        zoomDirection="in"
      />
      <section className="container-x pb-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl"><Image src={site.patterns[2]?.image ?? site.hero.image} alt="" fill sizes="40vw" className="object-cover" /></div>
            <ol className="mt-8 space-y-4">
              {steps.map((s, i) => (
                <Reveal as="li" key={s} delay={i * 60} className="flex items-center gap-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-caption tabular">{fa ? faNum(i + 1) : i + 1}</span><span className="font-medium">{s}</span></Reveal>
              ))}
            </ol>
          </div>
          <div className="lg:col-span-7">
            <h2 className="font-display text-h2">{d.home.customCta}</h2>
            <p className="mt-3 text-body text-foreground-secondary">{fa ? "الگوی سفارشی از ۴ هفته؛ شامل ۲ دور اصلاح و نمونه‌ی چاپی." : "Custom patterns from 4 weeks; includes two revision rounds and a printed sample."}</p>
            <div className="mt-8"><InquiryForm kind="custom" options={fa ? ["کاغذ دیواری", "پارچه و منسوجات", "سرامیک", "محصول دکوراتیو", "برندینگ"] : ["Wallpaper", "Textile", "Ceramic", "Decorative product", "Branding"]} /></div>
          </div>
        </div>
      </section>
    </>
  );
}
