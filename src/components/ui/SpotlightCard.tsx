"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

/** Card with cursor-following spotlight; throttled via rAF, disabled on touch (CSS media query). */
export function SpotlightCard({ className, children, as = "div", ...rest }: React.HTMLAttributes<HTMLDivElement> & { as?: "div" | "article" | "li" }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (frame.current) return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = e;
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sx", `${clientX - r.left}px`);
      el.style.setProperty("--sy", `${clientY - r.top}px`);
      frame.current = null;
    });
  }, []);
  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} onMouseMove={onMove} className={cn("spotlight", className)} {...rest}>
      {children}
    </Tag>
  );
}
