"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Product/pattern gallery: large stage + thumbnail rail, keyboard accessible.
 *  Optional `active` prop keeps the stage in sync with an external colourway picker.
 */
export function Gallery({
  images,
  alt,
  className,
  ratio = "aspect-[4/5]",
  active,
}: {
  images: string[];
  alt: string;
  className?: string;
  ratio?: string;
  /** When set, forces the gallery to show this image (colourway sync). */
  active?: string | null;
}) {
  const list = images.length ? images : ["/images/patterns/p06.jpg"];
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!active) return;
    const idx = list.indexOf(active);
    if (idx >= 0) setI(idx);
    else {
      // active image not in list — still show it by not changing index, parent should include it
    }
  }, [active, list]);

  const display = active && !list.includes(active) ? [active, ...list] : list;
  const current = Math.min(i, display.length - 1);

  return (
    <div className={cn("grid gap-3", className)}>
      <div className={cn("relative overflow-hidden rounded-lg bg-background-secondary", ratio)}>
        {display.map((src, idx) => (
          <Image
            key={src + idx}
            src={src}
            alt={alt}
            fill
            priority={idx === 0}
            sizes="(max-width:1024px) 100vw, 55vw"
            className={cn(
              "object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-out)]",
              idx === current ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]",
            )}
          />
        ))}
      </div>
      {display.length > 1 && (
        <div role="tablist" className="no-scrollbar flex gap-2 overflow-x-auto">
          {display.map((src, idx) => (
            <button
              key={src + idx}
              role="tab"
              aria-selected={idx === current}
              aria-label={`${alt} ${idx + 1}`}
              onClick={() => setI(idx)}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-md ring-offset-2 ring-offset-background transition-[box-shadow,opacity]",
                idx === current ? "ring-2 ring-foreground" : "opacity-70 hover:opacity-100",
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
