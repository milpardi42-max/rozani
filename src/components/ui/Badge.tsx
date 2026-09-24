import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "blue" | "glass" | "dark" | "success" | "warning" | "error" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-background-secondary text-foreground-secondary",
  accent: "bg-accent-soft text-accent",
  blue: "bg-blue-soft text-blue",
  glass: "glass text-foreground",
  dark: "bg-foreground text-background",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
  outline: "border border-border text-foreground-secondary",
};

export function Badge({ tone = "neutral", className, children, ...rest }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-caption font-medium leading-none", tones[tone], className)} {...rest}>
      {children}
    </span>
  );
}

/** Product number: monospace, always LTR, visually distinct. */
export function Sku({ value, className }: { value: string; className?: string }) {
  return (
    <span dir="ltr" className={cn("inline-flex items-center rounded-xs border border-border bg-background-secondary/70 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-foreground-secondary tabular", className)}>
      {value}
    </span>
  );
}
