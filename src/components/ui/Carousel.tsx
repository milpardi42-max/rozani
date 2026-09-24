"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Horizontal scroll rail with snap + RTL-aware arrow controls. */
export function Carousel({ children, className, itemClassName = "w-[78vw] xs:w-[60vw] sm:w-[44vw] md:w-[32vw] lg:w-[24vw] xl:w-[300px]" }: { children: React.ReactNode[]; className?: string; itemClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setPrev] = useState(false);
  const [canNext, setNext] = useState(true);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const x = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth - 2;
    setPrev(x > 2);
    setNext(x < max);
    void rtl;
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div ref={ref} className="no-scrollbar scroll-snap-x -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:-mx-0 md:px-0">
        {children.map((c, i) => (
          <div key={i} className={cn("snap-item shrink-0", itemClassName)}>{c}</div>
        ))}
      </div>
      <div className="mt-4 hidden items-center justify-end gap-2 md:flex">
        <button type="button" aria-label="previous" disabled={!canPrev} onClick={() => scroll(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:opacity-30">
          <ChevronLeft className="h-4 w-4 rtl-flip" />
        </button>
        <button type="button" aria-label="next" disabled={!canNext} onClick={() => scroll(1)} className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-foreground disabled:opacity-30">
          <ChevronRight className="h-4 w-4 rtl-flip" />
        </button>
      </div>
    </div>
  );
}
