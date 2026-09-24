import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  align?: "start" | "center";
  size?: "md" | "lg";
  className?: string;
  tone?: "default" | "inverse";
}

export function SectionHeader({ eyebrow, title, description, href, hrefLabel, align = "start", size = "md", className, tone = "default" }: Props) {
  const inverse = tone === "inverse";
  return (
    <Reveal className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", align === "center" && "md:flex-col md:items-center text-center", className)}>
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && (
          <p className={cn("text-label mb-4 flex items-center gap-3", inverse ? "text-white/60" : "text-accent")}>
            <span className={cn("inline-block h-px w-6", inverse ? "bg-white/40" : "bg-accent/60")} />
            {eyebrow}
          </p>
        )}
        <h2 className={cn("font-display text-balance", size === "lg" ? "text-h1" : "text-h2", inverse ? "text-white" : "text-foreground")}>{title}</h2>
        {description && <p className={cn("mt-4 text-body-lg max-w-xl", inverse ? "text-white/70" : "text-foreground-secondary", align === "center" && "mx-auto")}>{description}</p>}
      </div>
      {href && hrefLabel && (
        <Link
          href={href}
          className={cn(
            "group inline-flex items-center gap-2 text-sm font-medium shrink-0 border-b border-transparent hover:border-current transition-colors pb-0.5",
            inverse ? "text-white" : "text-foreground",
          )}
        >
          {hrefLabel}
          <ArrowUpRight className="h-4 w-4 rtl-flip arrow-shift" />
        </Link>
      )}
    </Reveal>
  );
}
