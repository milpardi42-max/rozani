"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  label?: string;
  /** center modal or side drawer */
  variant?: "center" | "drawer";
}

export function Modal({ open, onClose, children, className, label, variant = "center" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const focusable = ref.current?.querySelector<HTMLElement>("button, [href], input, [tabindex]:not([tabindex='-1'])");
    focusable?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal aria-label={label}>
      <button aria-label="close" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-[3px] animate-[ra-scale-fade_200ms_ease-out]" style={{ animationName: "none", opacity: 1 }} />
      <div
        ref={ref}
        className={cn(
          "absolute bg-surface shadow-elevated",
          variant === "center" && "inset-x-4 top-1/2 mx-auto max-h-[88vh] w-auto max-w-4xl -translate-y-1/2 overflow-auto rounded-xl anim-scale-fade md:inset-x-8",
          variant === "drawer" && "inset-y-0 inset-inline-end-0 h-full w-full max-w-md overflow-auto animate-[ra-drawer_360ms_var(--ease-out)_both]",
          className,
        )}
      >
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full glass text-foreground hover:bg-surface inset-inline-end-3"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
      <style>{`@keyframes ra-drawer{from{transform:translateX(var(--drawer-from,100%));opacity:.6}to{transform:none;opacity:1}} html[dir=rtl]{--drawer-from:-100%}`}</style>
    </div>,
    document.body,
  );
}
