"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article" | "li" | "span";
  variant?: "fade" | "blur";
  delay?: number;
  once?: boolean;
}

/** Scroll-driven reveal. One IntersectionObserver per element; unobserves after reveal. */
export function Reveal({ as = "div", variant = "fade", delay = 0, once = true, className, style, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            el.classList.add("is-visible");
            if (once) io.unobserve(el);
          } else if (!once) el.classList.remove("is-visible");
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  const Tag = as as React.ElementType;
  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      className={cn(className)}
      style={{ ...style, ["--reveal-delay" as string]: `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
