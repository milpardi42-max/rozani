"use client";

import { useEffect } from "react";

/**
 * Attaches an IntersectionObserver to every `.reveal` element inside the document.
 * When an element enters the viewport, the `.in-view` class is added.
 * This drives the CSS transition defined in globals.css for `.reveal` / `.in-view`.
 */
export function useReveal() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
