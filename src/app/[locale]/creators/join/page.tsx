import type { Metadata } from "next";
import Image from "next/image";
import { BadgePercent, Globe2, Palette, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { CreatorSignupForm } from "@/components/profile/CreatorSignupForm";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.becomeCreator };
}

export default async function JoinPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const fa = locale === "fa";

  const perks = [
    {
      icon: BadgePercent,
      t: fa ? "۷۰٪ سهم فروش" : "70% revenue share",
      s: fa ? "شفاف، ماهانه، بدون هزینه‌ی عضویت." : "Transparent, monthly, no membership fee.",
    },
    {
      icon: Globe2,
      t: fa ? "مخاطب دوزبانه" : "Bilingual audience",
      s: fa ? "نمایش هم‌زمان به بازار ایران و بین‌الملل." : "Reach both Iranian and international markets.",
    },
    {
      icon: Palette,
      t: fa ? "پورتفولیو حرفه‌ای" : "Professional portfolio",
      s: fa ? "پروفایل، پروژه‌ها و روایت شما در یک‌جا." : "Your profile, projects and story in one place.",
    },
    {
      icon: ShieldCheck,
      t: fa ? "حفاظت از لایسنس" : "License protection",
      s: fa ? "قرارداد و واترمارک برای همه‌ی فایل‌ها." : "Contracts and watermarking for all files.",
    },
  ];

  const heroImage = site.artists[0]?.cover ?? site.artists[0]?.avatar ?? site.hero.image;

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.nav.artists, href: href(locale, "/artists") },
    { label: d.nav.becomeCreator },
  ];

  const options = fa
    ? ["طراح سطح", "تصویرگر", "طراح گرافیک", "هنرمند سنتی", "استودیو"]
    : ["Surface designer", "Illustrator", "Graphic designer", "Traditional artist", "Studio"];

  return (
    <>
      <PageHero
        eyebrow={d.nav.artists}
        title={d.nav.becomeCreator}
        description={
          fa
            ? "الگوهایتان را به فضا تبدیل کنید. به جامعه‌ی طراحان رزی آتلیه بپیوندید."
            : "Turn your patterns into spaces. Join the Rosie Atelier designer community."
        }
        image={heroImage}
        breadcrumb={breadcrumb}
        locale={locale}
        zoomDirection="in"
      />

      <section className="container-x pb-20">
        {/* Perks */}
        <div className="grid gap-6 md:grid-cols-4">
          {perks.map((p, i) => (
            <Reveal key={p.t} delay={i * 60} className="rounded-lg border border-border p-6">
              <p.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-4 font-semibold">{p.t}</h3>
              <p className="mt-1.5 text-body-sm text-foreground-secondary">{p.s}</p>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          {/* Left: existing artists */}
          <div className="lg:col-span-5">
            <h2 className="font-display text-h2">
              {fa ? "طراحانی که همراه ما هستند" : "Designers already with us"}
            </h2>
            <ul className="mt-6 space-y-3">
              {site.artists.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="relative h-10 w-10 overflow-hidden rounded-full">
                    <Image src={a.avatar} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{t(a.name, locale)}</span>
                    <span className="block text-caption text-foreground-secondary">
                      {t(a.profession, locale)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: signup form */}
          <div className="lg:col-span-7">
            <h2 className="mb-6 font-display text-h2">
              {fa ? "همین حالا ثبت‌نام کنید" : "Register now"}
            </h2>
            <CreatorSignupForm options={options} />
          </div>
        </div>
      </section>
    </>
  );
}
