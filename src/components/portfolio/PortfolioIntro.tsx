import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { RAZIEH_PROFILE } from "@/lib/razieh-profile";
import type { Locale } from "@/lib/i18n/types";
import { href, t } from "@/lib/utils";

/**
 * The complete introduction that opens the portfolio page — the founder's
 * dedicated section: portrait, full biography, key numbers, professional path,
 * the facts at a glance and the ways to work with the atelier.
 *
 * Server-rendered (the copy is plain data in `@/lib/razieh-profile`), so every
 * line of the introduction is present in the first HTML response.
 */
export function PortfolioIntro({ locale }: { locale: Locale }) {
  const p = RAZIEH_PROFILE;
  const fa = locale === "fa";

  return (
    <>
      {/* ---------- the founder ---------- */}
      <section id="about" className="container-x scroll-mt-[calc(var(--header-h)+1rem)] pt-10 pb-4 md:pt-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          {/* portrait / atelier */}
          <Reveal className="lg:col-span-5">
            <div className="relative lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
              <span aria-hidden className="absolute -bottom-4 -end-4 h-full w-full rounded-2xl border border-accent/30" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-background-secondary">
                <Image
                  src="/images/portfolios/pf-process.jpg"
                  alt={t(p.portraitAlt, locale)}
                  fill
                  priority
                  quality={90}
                  sizes="(min-width: 1024px) 40vw, 92vw"
                  className="object-cover"
                />
              </div>
              <span className="absolute -bottom-3 end-6 rounded-full bg-accent px-4 py-2 text-caption font-semibold text-accent-foreground shadow-medium">
                {t(p.since, locale)}
              </span>
            </div>
          </Reveal>

          {/* the biography */}
          <div className="lg:col-span-7">
            <Reveal>
              <p className="text-label flex items-center gap-3 text-accent">
                <span className="inline-block h-px w-6 bg-accent/60" />
                {t(p.eyebrow, locale)}
              </p>
              <h2 className="mt-5 font-display text-h1 text-balance">{t(p.name, locale)}</h2>
              <p className="mt-3 text-body-lg text-foreground-secondary">{t(p.role, locale)}</p>
              <p className="mt-2 text-label text-muted" dir="ltr">
                {p.latin}
              </p>
            </Reveal>

            <Reveal delay={80} className="prose-ra mt-7">
              {p.bio.map((paragraph) => (
                <p key={paragraph.en}>{t(paragraph, locale)}</p>
              ))}
            </Reveal>

            <Reveal delay={120} className="mt-8 flex flex-wrap gap-2">
              {p.disciplines.map((d) => (
                <span key={d.en} className="rounded-full border border-border px-3 py-1 text-caption text-foreground-secondary">
                  {t(d, locale)}
                </span>
              ))}
            </Reveal>

            <Reveal delay={160} className="mt-9 flex flex-wrap gap-3">
              <Button href="#works" variant="primary">
                {t(p.ctaWorks, locale)}
              </Button>
              <Button href={href(locale, p.personalPortfolio.href)} variant="outline">
                {t(p.ctaPersonal, locale)}
              </Button>
            </Reveal>

            <Reveal delay={200} className="mt-10 flex items-center gap-4 border-t border-border pt-6">
              <div>
                <p className="font-display text-h3">{t(p.name, locale)}</p>
                <p className="mt-1 text-caption text-muted">{t(p.signatureRole, locale)}</p>
              </div>
              <span className="ms-auto font-display text-h3 tracking-[0.18em] text-accent/70">{p.monogram}</span>
            </Reveal>
          </div>
        </div>

        {/* key numbers */}
        <Reveal className="mt-14 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-0 md:divide-x md:divide-border md:rounded-xl md:border md:border-border md:bg-surface rtl:divide-x-reverse">
          {p.stats.map((stat) => (
            <div key={stat.label.en} className="rounded-lg border border-border px-4 py-6 text-center md:rounded-none md:border-0 md:px-6">
              <p className="font-display text-h2 tabular leading-none">{t(stat.value, locale)}</p>
              <p className="mt-2 text-caption text-muted">{t(stat.label, locale)}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ---------- path + facts ---------- */}
      <section className="mt-16 border-y border-border bg-background-secondary">
        <div className="container-x grid gap-12 py-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <h3 className="text-label text-accent">{t(p.timelineTitle, locale)}</h3>
            <ol className="mt-8 space-y-8">
              {p.timeline.map((milestone) => (
                <li key={milestone.period.en} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-6">
                  <p className="pt-1 text-label tabular text-muted">{t(milestone.period, locale)}</p>
                  <div>
                    <p className="font-display text-h4">{t(milestone.title, locale)}</p>
                    <p className="mt-1.5 text-body-sm text-foreground-secondary">{t(milestone.text, locale)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-5">
            <h3 className="text-label text-accent">{t(p.factsTitle, locale)}</h3>
            <dl className="mt-8 divide-y divide-border border-y border-border">
              {p.facts.map((fact) => (
                <div key={fact.label.en} className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="text-caption text-muted">{t(fact.label, locale)}</dt>
                  <dd className="text-sm text-foreground">{t(fact.value, locale)}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 rounded-xl border border-border bg-surface p-5">
              <p className="text-label text-accent">{t(p.personalPortfolio.label, locale)}</p>
              <p className="mt-2 text-body-sm text-foreground-secondary">{t(p.personalPortfolio.note, locale)}</p>
              <Button href={href(locale, p.personalPortfolio.href)} variant="outline" size="sm" className="mt-4">
                {fa ? "رفتن به صفحه‌ی راضیه" : "Open Razieh's page"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** Closing band: how to work with the atelier and its founder. */
export function PortfolioCollaboration({ locale }: { locale: Locale }) {
  const c = RAZIEH_PROFILE.collaboration;

  return (
    <section className="border-t border-border bg-background-secondary">
      <div className="container-x section-y flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-display text-h3 text-balance">{t(c.title, locale)}</h2>
          <p className="mt-3 text-body-sm text-foreground-secondary">{t(c.text, locale)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {c.links.map((link) => (
            <Button key={link.path} href={href(locale, link.path)} variant="outline" size="sm">
              {t(link.label, locale)}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
