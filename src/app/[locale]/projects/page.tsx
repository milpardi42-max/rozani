import type { Metadata } from "next";
import { Building2, Compass, Factory, Handshake } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { InquiryForm } from "@/components/ui/InquiryForm";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.projects };
}
export default async function ProjectsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const fa = locale === "fa";
  const steps = [
    { icon: Compass, t: fa ? "مشاوره و بریف" : "Consulting & brief", s: fa ? "شناخت فضا، برند و نیازهای فنی." : "Understanding space, brand and technical needs." },
    { icon: Handshake, t: fa ? "طراحی انحصاری" : "Exclusive design", s: fa ? "همکاری با طراح مناسب یا تیم داخلی رزی آتلیه." : "Working with the right designer or Rosie Atelier's in-house team." },
    { icon: Factory, t: fa ? "تولید" : "Production", s: fa ? "کاغذ دیواری، پارچه، سرامیک و محصولات دکوراتیو." : "Wallpaper, textile, ceramic and decorative products." },
    { icon: Building2, t: fa ? "اجرا و نصب" : "Execution & installation", s: fa ? "تیم اجرایی در سراسر کشور." : "Installation team nationwide." },
  ];

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.projects },
  ];

  return (
    <>
      <PageHero
        eyebrow={d.nav.projects}
        title={d.home.b2bTitle}
        description={d.home.b2bDesc}
        image={site.hero.image}
        breadcrumb={breadcrumb}
        locale={locale}
        zoomDirection="in"
      />
      <section className="container-x section-y">
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.t} delay={i * 70} className="rounded-lg border border-border p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent"><s.icon className="h-5 w-5" /></span>
              <p className="mt-5 text-caption text-muted tabular">0{i + 1}</p>
              <h3 className="mt-1 font-semibold">{s.t}</h3>
              <p className="mt-2 text-body-sm text-foreground-secondary">{s.s}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="container-x section-y">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4"><p className="text-label text-accent">{d.home.b2bCta}</p><h2 className="mt-3 font-display text-h2">{fa ? "درباره‌ی پروژه‌تان بگویید" : "Tell us about your project"}</h2><p className="mt-3 text-body text-foreground-secondary">{fa ? "ظرف ۲ روز کاری با شما تماس می‌گیریم." : "We'll get back to you within two business days."}</p></div>
          <div className="lg:col-span-8"><InquiryForm kind="b2b" options={fa ? ["هتل و اقامتگاه", "رستوران و کافه", "دفتر کار", "مسکونی", "برند و خرده‌فروشی"] : ["Hotel & hospitality", "Restaurant & café", "Office", "Residential", "Brand & retail"]} /></div>
        </div>
      </section>
    </>
  );
}
