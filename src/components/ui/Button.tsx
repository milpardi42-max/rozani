"use client";

import Link from "next/link";
import { forwardRef, useRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "outline" | "ghost" | "glass" | "link";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  magnetic?: boolean;
  external?: boolean;
}

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-[transform,background-color,color,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985]";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft hover:shadow-medium hover:-translate-y-px",
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover shadow-soft hover:shadow-glow hover:-translate-y-px",
  outline: "border border-border-strong text-foreground hover:border-foreground bg-transparent hover:-translate-y-px",
  ghost: "text-foreground hover:bg-background-secondary",
  glass: "glass text-foreground hover:bg-surface shadow-soft hover:-translate-y-px",
  link: "text-foreground underline-offset-4 hover:underline p-0 h-auto rounded-none",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px] rounded-md",
  md: "h-11 px-5 text-sm rounded-md",
  lg: "h-13 px-7 text-[15px] rounded-lg",
  icon: "h-10 w-10 rounded-md",
};

/** AnimatedButton: subtle magnetic + hover motion, RTL-safe (uses transforms only). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", href, magnetic, external, children, onMouseMove, onMouseLeave, ...props },
  ref,
) {
  const inner = useRef<HTMLSpanElement>(null);
  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e);
    if (!magnetic || !inner.current || window.matchMedia("(hover: none)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 6;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 6;
    inner.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e);
    if (inner.current) inner.current.style.transform = "";
  };
  const cls = cn(base, variants[variant], sizes[size], className);
  const content = (
    <span ref={inner} className="inline-flex items-center gap-2 transition-transform duration-300 ease-[var(--ease-out)]">
      {children}
    </span>
  );
  if (href) {
    if (external) {
      return (
        <a href={href} className={cls} target="_blank" rel="noreferrer">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} aria-label={props["aria-label"]}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} onMouseMove={handleMove} onMouseLeave={handleLeave} {...props}>
      {content}
    </button>
  );
});
