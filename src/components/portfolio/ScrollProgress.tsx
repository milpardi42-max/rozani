"use client";

import { useEffect, useRef } from "react";

/** Thin progress bar pinned to top of viewport; tracks scroll depth of the article. */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const bar = barRef.current;
      if (!bar) return;
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${total > 0 ? scrolled / total : 0})`;
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="fixed start-0 top-0 z-[60] h-[3px] w-full origin-[0%_50%] bg-accent"
      style={{ transform: "scaleX(0)", willChange: "transform" }}
    />
  );
}
