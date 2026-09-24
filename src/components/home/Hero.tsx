"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { cn, faNum, href, t } from "@/lib/utils";
import type { HeroContent, Pattern } from "@/lib/types";

interface Props {
  hero: HeroContent;
  patterns: Pattern[];
  stats: { patterns: number; artists: number; projects: number };
}

export function Hero({ hero, patterns, stats }: Props) {
  const { locale, dict } = useLocale();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  /* resolve feature flags — default to enabled if not set */
  const parallaxOn = hero.parallaxEnabled !== false;
  const interactiveOn = hero.interactiveEnabled !== false;

  /* bg images: use hero.images if ≥2, otherwise null (fallback to single image / timer) */
  const bgImages = hero.images && hero.images.length > 1 ? hero.images : null;
  const count = bgImages ? bgImages.length : patterns.length;

  /* ── slider mode: force timer even when bgImages exist ── */
  const forceSlider = hero.sliderMode === true;

  /* ── scroll-driven mode (bgImages exist AND not sliderMode forced) ── */
  useEffect(() => {
    if (!bgImages || forceSlider) return;
    if (!parallaxOn) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) { ticking = false; return; }

        const { top, height } = wrapper.getBoundingClientRect();
        const scrolled = Math.max(0, Math.min(1, -top / (height - window.innerHeight)));
        const slide = scrolled * count;
        const idx = Math.min(Math.floor(slide), count - 1);
        const frac = slide - Math.floor(slide);

        setActive(idx);
        setProgress(frac);

        if (mediaRef.current) {
          const y = Math.max(0, -top);
          mediaRef.current.style.transform = `translate3d(0, ${y * 0.08}px, 0) scale(1.06)`;
        }
        if (cardRef.current) {
          const y = Math.max(0, -top);
          cardRef.current.style.transform = `translate3d(0, ${-(y * 0.14)}px, 0)`;
        }

        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, forceSlider, parallaxOn]);

  /* ── timer-driven mode (no bgImages, OR sliderMode forced) ── */
  useEffect(() => {
    const useTimer = !bgImages || forceSlider;
    if (!useTimer) return;
    const slideCount = bgImages ? bgImages.length : patterns.length;
    if (slideCount < 2) return;
    const D = 5200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = ((now - start) % D) / D;
      setProgress(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const id = window.setInterval(() => setActive((a) => (a + 1) % slideCount), D);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patterns.length, forceSlider, bgImages]);

  /* ── parallax for timer mode (no bgImages or forceSlider) ── */
  useEffect(() => {
    const useTimer = !bgImages || forceSlider;
    if (!useTimer) return;
    if (!parallaxOn) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const vh = window.innerHeight * 1.2;
        if (y < vh) {
          if (mediaRef.current) mediaRef.current.style.transform = `translate3d(0, ${y * 0.08}px, 0) scale(1.06)`;
          if (cardRef.current) cardRef.current.style.transform = `translate3d(0, ${-(y * 0.14)}px, 0)`;
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceSlider, parallaxOn]);

  const current = patterns[active % patterns.length];

  /* ── resolve which images to show as slides ── */
  const slideImages = bgImages ?? null;
  const activeSlideIndex = active % (slideImages ? slideImages.length : patterns.length);

  /* ── inner section (shared JSX) ── */
  const inner = (
    <section className={cn(
      "relative isolate w-full overflow-hidden bg-[#0d1117] text-white",
      (bgImages && !forceSlider) ? "sticky top-0 h-[100svh] min-h-[640px] max-h-[1080px]" : "h-[100svh] min-h-[640px] max-h-[1080px]"
    )}>
      {/* media */}
      <div ref={mediaRef} className="absolute inset-0 will-change-transform scale-[1.06]">
        {hero.video ? (
          <video src={hero.video} poster={hero.image} autoPlay muted loop playsInline className="h-full w-full object-cover" />
        ) : slideImages ? (
          slideImages.map((src, i) => (
            <Image key={src} src={src} alt="" fill priority={i <= 1} quality={100}
              sizes="(min-width: 3840px) 3840px, (min-width: 2560px) 2560px, (min-width: 1920px) 1920px, 100vw"
              className={cn(
                "object-cover transition-opacity duration-[1000ms] ease-[var(--ease-out)]",
                i === activeSlideIndex ? "opacity-100" : "opacity-0"
              )}
            />
          ))
        ) : (
          <Image src={hero.image} alt="" fill priority quality={100}
            sizes="(min-width: 3840px) 3840px, (min-width: 2560px) 2560px, (min-width: 1920px) 1920px, 100vw"
            className="object-cover"
          />
        )}
      </div>

      {/* cinematic vignette + gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/70 via-[#0a0d13]/15 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d13]/40 via-transparent to-transparent rtl:bg-gradient-to-l" />
      <div className="pointer-events-none absolute inset-0 [box-shadow:inset_0_0_120px_30px_rgba(5,7,12,.25)]" />

      <div className="container-x relative flex h-full flex-col justify-end pb-10 pt-[calc(var(--announce-h,0px)+var(--header-h))] md:pb-14">
        <div className="grid items-end gap-6 lg:grid-cols-12 lg:gap-10">
          {/* copy */}
          <div className="lg:col-span-7">
            <p className="anim-blur-in mb-4 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-caption backdrop-blur-md" style={{ animationDelay: "80ms" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {t(hero.eyebrow, locale)}
            </p>
            <h1 className="font-display text-display text-balance">
              <span className="anim-blur-in block" style={{ animationDelay: "160ms" }}>{t(hero.titleA, locale)}</span>
              <span className="anim-blur-in block text-white/90" style={{ animationDelay: "280ms" }}>{t(hero.titleB, locale)}</span>
            </h1>
            <p className="anim-blur-in mt-5 max-w-xl text-body-lg text-white/75" style={{ animationDelay: "400ms" }}>{t(hero.description, locale)}</p>
            <div className="anim-fade-up mt-6 flex flex-wrap items-center gap-3" style={{ animationDelay: "520ms" }}>
              <Button href={href(locale, hero.ctaHref)} size="lg" magnetic className="bg-white text-[#0f172a] hover:bg-white/90 hover:shadow-elevated">
                {dict.home.heroCta}
                <ArrowUpRight className="h-4 w-4 rtl-flip" />
              </Button>
              <Button href={href(locale, hero.cta2Href)} size="lg" variant="outline" className="border-white/35 text-white hover:border-white hover:bg-white/5">
                <Play className="h-3.5 w-3.5 fill-current" />
                {dict.home.heroCta2}
              </Button>
            </div>
            {/* stats */}
            <dl className="anim-fade-up mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/15 pt-5 text-white/80" style={{ animationDelay: "640ms" }}>
              {[
                [stats.patterns, dict.home.heroStat1],
                [stats.artists, dict.home.heroStat2],
                [stats.projects, dict.home.heroStat3],
              ].map(([n, label]) => (
                <div key={String(label)}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display text-[26px] leading-none tabular">{locale === "fa" ? faNum(n as number) : n}+</dd>
                  <dd className="mt-1 text-caption text-white/60">{label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* framed pattern preview */}
          {current && (
            <div ref={cardRef} className="anim-scale-fade hidden lg:col-span-5 lg:block will-change-transform" style={{ animationDelay: "520ms" }}>
              <div className="ms-auto max-w-[380px]">
                <div className="glass rounded-xl p-2 shadow-elevated !bg-white/10 !border-white/20">
                  <Link href={href(locale, `/patterns/${current.slug}`)} className="group relative block aspect-[4/5] overflow-hidden rounded-lg">
                    {patterns.map((p, i) => (
                      <Image key={p.id} src={p.image} alt={t(p.title, locale)} fill sizes="400px" priority={i === 0}
                        className={cn("object-cover transition-[opacity,transform] duration-[900ms] ease-[var(--ease-out)]", i === (active % patterns.length) ? "opacity-100 scale-100" : "opacity-0 scale-105")}
                      />
                    ))}
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4">
                      <div>
                        <p className="text-caption text-white/70" dir="ltr">{current.sku}</p>
                        <p className="font-display text-h3">{t(current.title, locale)}</p>
                      </div>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform group-hover:scale-105">
                        <ArrowUpRight className="h-4 w-4 rtl-flip" />
                      </span>
                    </div>
                  </Link>
                  {/* progress bar — scroll-driven or timer-driven */}
                  {interactiveOn && (
                    <div className="flex items-center gap-2 px-2 pb-1 pt-3">
                      {patterns.map((p, i) => (
                        <button key={p.id} type="button" aria-label={t(p.title, locale)}
                          onClick={() => setActive(i)}
                          className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25"
                        >
                          <span className={cn("absolute inset-y-0 start-0 rounded-full bg-white", i < (active % patterns.length) && "w-full", i > (active % patterns.length) && "w-0")}
                            style={i === (active % patterns.length) ? { width: `${progress * 100}%` } : undefined}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {!interactiveOn && (
                    <div className="flex items-center gap-2 px-2 pb-1 pt-3">
                      {patterns.map((p, i) => (
                        <div key={p.id} className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                          <span className={cn("absolute inset-y-0 start-0 rounded-full bg-white", i < (active % patterns.length) && "w-full", i > (active % patterns.length) && "w-0")}
                            style={i === (active % patterns.length) ? { width: `${progress * 100}%` } : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* bottom rail */}
        <div className="anim-fade-up mt-8 hidden items-center justify-between border-t border-white/10 pt-5 text-caption text-white/55 md:flex" style={{ animationDelay: "760ms" }}>
          <div className="flex gap-6 uppercase tracking-[0.18em]">
            <span>Wallpaper</span><span>Fabric</span><span>Curtain</span><span>Décor</span>
          </div>
          <a href="#discover" className="group inline-flex items-center gap-2 hover:text-white">
            {dict.nav.explore}
            <ArrowDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
          </a>
        </div>
      </div>
    </section>
  );

  /* scroll-driven: wrap in tall div so sticky section has room to "scroll through" */
  if (bgImages && !forceSlider) {
    return (
      <div ref={wrapperRef} style={{ height: `${count * 100}svh` }}>
        {inner}
      </div>
    );
  }

  return inner;
}
