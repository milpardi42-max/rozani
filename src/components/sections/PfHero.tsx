"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown } from "lucide-react";
import { LangToggle } from "@/components/portfolio/LangToggle";
import { usePortfolioLang } from "@/components/portfolio/PortfolioLangProvider";
import { T } from "@/lib/portfolio-translations";

const NAV_ITEMS = ["about", "works", "academic", "contact"] as const;

export function PfHero() {
  const { lang } = usePortfolioLang();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="hero"
      className="pf-hero relative isolate flex h-[100svh] min-h-[640px] max-h-[1080px] flex-col overflow-hidden bg-pf-ink text-white"
    >
      {/* background image with slow zoom */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src="/images/hero/hero-main.jpg"
          alt="Razieh Kheiripour"
          fill
          priority
          quality={95}
          sizes="100vw"
          className="object-cover object-center animate-pf-slow-zoom"
        />
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-pf-ink/40 via-pf-ink/20 to-pf-ink/70" />
        {/* noise texture */}
        <div className="absolute inset-0 pf-bg-noise opacity-30" />
      </div>

      {/* top navigation bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        {/* monogram */}
        <span className="font-display text-xl font-semibold tracking-[0.18em] text-pf-gold">R.K</span>

        {/* nav links — desktop only */}
        <ul className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((k) => (
            <li key={k}>
              <button
                onClick={() => scrollTo(k)}
                className="text-[11px] uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-pf-gold"
              >
                {T(k, lang)}
              </button>
            </li>
          ))}
          {/* the way back to the atelier's own gallery and shop */}
          <li>
            <Link
              href={`/${lang}/portfolio`}
              className="text-[11px] uppercase tracking-[0.25em] text-pf-gold transition-colors hover:text-white"
            >
              {T("atelier", lang)}
            </Link>
          </li>
        </ul>

        {/* right side */}
        <div className="flex items-center gap-3">
          <Link
            href={`/${lang}/portfolio`}
            className="text-[10px] uppercase tracking-[0.2em] text-pf-gold transition-colors hover:text-white md:hidden"
          >
            {T("atelier", lang)}
          </Link>
          <LangToggle />
          <span className="hidden text-[11px] tracking-[0.18em] text-white/40 sm:block">
            {T("founded", lang)}
          </span>
        </div>
      </nav>

      {/* main content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 md:px-16 lg:px-24">
        {/* decorative line */}
        <div className="mb-6 h-px w-24 origin-left bg-pf-gold/70 animate-pf-draw-line rtl:origin-right" />

        {/* sub-title */}
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-pf-gold/90 animate-pf-fade-in">
          {T("heroSub", lang)}
        </p>

        {/* name — two lines */}
        <h1 className="pf-name leading-none">
          <span className="block text-[clamp(3.5rem,10vw,7rem)] font-display text-white animate-pf-fade-up" style={{ animationDelay: "100ms" }}>
            {T("heroName1", lang)}
          </span>
          <span className="block text-[clamp(3.5rem,10vw,7rem)] font-display text-white/85 animate-pf-fade-up" style={{ animationDelay: "250ms" }}>
            {T("heroName2", lang)}
          </span>
        </h1>

        {/* description */}
        <p className="mt-6 max-w-xl text-base text-white/65 leading-relaxed animate-pf-fade-up" style={{ animationDelay: "400ms" }}>
          {T("heroDesc", lang)}
        </p>
      </div>

      {/* bottom bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        {/* category tags */}
        <div className="flex flex-wrap gap-2">
          {(["tagPattern", "tagWallpaper", "tagTextile", "tagDrapery"] as const).map((k) => (
            <span
              key={k}
              className="rounded-full border border-white/25 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60"
            >
              {T(k, lang)}
            </span>
          ))}
        </div>

        {/* scroll down button */}
        <button
          onClick={() => scrollTo("about")}
          className="group flex flex-col items-center gap-1 text-white/50 hover:text-pf-gold transition-colors"
          aria-label="Scroll down"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">{T("scrollDown", lang)}</span>
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
