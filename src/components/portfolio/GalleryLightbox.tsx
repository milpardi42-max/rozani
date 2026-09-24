"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  alts?: string[];
}

export function GalleryLightbox({ images, alts = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);
  const openAt = useCallback((i: number) => { setIdx(i); setOpen(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
      else if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, next, prev, close]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !open) return;
    panel.style.animation = "none";
    void panel.offsetHeight;
    panel.style.animation = "";
  }, [idx, open]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {images.map((src, i) => (
          <ThumbButton key={src} src={src} alt={alts[i] ?? ""} hero={i === 0} label={alts[i] ?? `Image ${i + 1}`} onClick={() => openAt(i)} />
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ animation: "lb-backdrop 300ms ease both" }} onClick={close}>
          <div className="absolute inset-0 bg-black/88 backdrop-blur-sm" />
          <button type="button" aria-label="Close" onClick={close} className="absolute end-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <div ref={panelRef} className="relative z-10 mx-4 md:mx-16 max-h-[85svh] w-full max-w-5xl" style={{ animation: "lb-panel 480ms cubic-bezier(0.22,1,0.36,1) both" }} onClick={(e) => e.stopPropagation()}>
            <Image src={images[idx]} alt={alts[idx] ?? ""} width={1400} height={900} className="max-h-[85svh] w-full rounded-xl object-contain shadow-elevated" priority />
            <div className="mt-4 flex items-center justify-center gap-3">
              {images.map((_, i) => (
                <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setIdx(i); }} className={cn("rounded-full transition-all duration-300", i === idx ? "h-2 w-6 bg-white" : "h-2 w-2 bg-white/30 hover:bg-white/60")} />
              ))}
            </div>
          </div>
          {images.length > 1 && (
            <>
              <button type="button" aria-label="Previous" onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute start-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 hover:scale-110 duration-200">
                <ChevronLeft className="h-5 w-5 rtl-flip" />
              </button>
              <button type="button" aria-label="Next" onClick={(e) => { e.stopPropagation(); next(); }} className="absolute end-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 hover:scale-110 duration-200">
                <ChevronRight className="h-5 w-5 rtl-flip" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ThumbButton({ src, alt, hero, label, onClick }: { src: string; alt: string; hero: boolean; label: string; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    el.style.transform = `perspective(600px) rotateX(${-ny * 8}deg) rotateY(${nx * 8}deg) scale3d(1.03,1.03,1.03)`;
  }, []);
  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
  }, []);
  return (
    <button ref={ref} type="button" aria-label={label} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave}
      className={cn("group relative overflow-hidden rounded-xl bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", hero ? "col-span-2 row-span-2 aspect-square md:col-span-2" : "aspect-square")}
      style={{ transformOrigin: "center center", transition: "transform 350ms cubic-bezier(0.22,1,0.36,1)", willChange: "transform" }}
    >
      <Image src={src} alt={alt} fill sizes="(max-width:768px) 50vw, 33vw" className="object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/25">
        <ZoomIn className="h-7 w-7 text-white opacity-0 drop-shadow-lg transition-all duration-300 group-hover:opacity-100 group-hover:scale-110" />
      </span>
    </button>
  );
}
