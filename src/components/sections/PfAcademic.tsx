"use client";

import Image from "next/image";
import { BookOpen, Users, Award, GraduationCap } from "lucide-react";
import { usePortfolioLang } from "@/components/portfolio/PortfolioLangProvider";
import { T, COURSES } from "@/lib/portfolio-translations";

const ACHIEVEMENTS = [
  { icon: BookOpen, valKey: "ach1Val", labelKey: "ach1Label" },
  { icon: Award,    valKey: "ach2Val", labelKey: "ach2Label" },
  { icon: Users,    valKey: "ach3Val", labelKey: "ach3Label" },
  { icon: GraduationCap, valKey: "ach4Val", labelKey: "ach4Label" },
] as const;

export function PfAcademic() {
  const { lang } = usePortfolioLang();

  return (
    <section id="academic" className="bg-pf-cream py-20 md:py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        {/* header */}
        <div className="reveal mb-12 grid gap-6 sm:grid-cols-12 sm:items-end">
          <div className="sm:col-span-7">
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-pf-terracotta">
              {T("academicLabel", lang)}
            </p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-pf-charcoal">
              {T("academicTitle", lang)}
            </h2>
          </div>
          <p className="text-pf-charcoal/60 sm:col-span-5 sm:text-end">
            {T("academicDesc", lang)}
          </p>
        </div>

        {/* teaching image */}
        <div className="reveal relative mb-12 aspect-[21/9] overflow-hidden rounded-2xl">
          <Image
            src="/images/education/e01.jpg"
            alt={T("academicTitle", lang)}
            fill
            sizes="(min-width: 1024px) 80vw, 95vw"
            quality={85}
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-pf-ink/60 via-transparent to-transparent" />
          <div className="absolute bottom-6 start-6 rtl:end-6 rtl:start-auto">
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-pf-gold/80">
              {T("deptLabel", lang)}
            </p>
            <p className="font-display text-xl text-white">
              {T("rankLabel", lang)}
            </p>
          </div>
        </div>

        {/* achievement cards */}
        <div className="reveal mb-14 grid grid-cols-2 gap-4 md:grid-cols-4">
          {ACHIEVEMENTS.map(({ icon: Icon, valKey, labelKey }) => (
            <div
              key={valKey}
              className="rounded-xl border border-pf-terracotta/20 bg-white p-6 text-center transition-shadow hover:shadow-md"
            >
              <Icon className="mx-auto mb-3 h-6 w-6 text-pf-terracotta/60" />
              <div className="font-display text-2xl text-pf-terracotta">{T(valKey, lang)}</div>
              <div className="mt-1 text-xs text-pf-charcoal/55">{T(labelKey, lang)}</div>
            </div>
          ))}
        </div>

        {/* courses */}
        <div className="reveal">
          <h3 className="mb-6 font-display text-xl text-pf-charcoal">{T("coursesTitle", lang)}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {COURSES.map((course) => (
              <div
                key={course.id}
                className="group relative rounded-xl border border-pf-terracotta/15 bg-white p-6 transition-shadow hover:shadow-md"
              >
                {/* accent dot */}
                <span className="absolute end-5 top-5 h-2 w-2 rounded-full bg-pf-terracotta/30 transition-colors group-hover:bg-pf-terracotta" />
                <p className="mb-1 text-[11px] uppercase tracking-[0.15em] text-pf-ochre">
                  {course.level[lang]}
                </p>
                <h4 className="font-semibold text-pf-charcoal">{course.title[lang]}</h4>
                <p className="mt-2 text-sm text-pf-charcoal/60 leading-relaxed">{course.desc[lang]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
