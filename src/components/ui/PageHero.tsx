import Image from "next/image";
import { cn } from "@/lib/utils";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import type { Locale } from "@/lib/i18n/types";

/** Compact editorial page header used across listing pages. */
export function PageHero({
  eyebrow,
  title,
  description,
  image,
  children,
  className,
  align = "start",
  breadcrumb,
  locale,
  zoomDirection = "in",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string;
  children?: React.ReactNode;
  className?: string;
  align?: "start" | "center";
  breadcrumb?: BreadcrumbItem[];
  locale?: Locale;
  /** "in" = slow zoom-in (default), "out" = starts zoomed then slowly zooms out */
  zoomDirection?: "in" | "out";
}) {
  if (image) {
    return (
      <section className={cn("relative isolate overflow-hidden bg-[#0d1117] text-white", className)}>
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className={cn("object-cover opacity-70", zoomDirection === "out" ? "hero-zoom-out" : "hero-zoom-in")}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0d13]/90 via-[#0a0d13]/40 to-[#0a0d13]/30" />
        <div className="container-x relative flex min-h-[52svh] flex-col justify-end pb-12 pt-[calc(var(--header-h)+3rem)]">
          {breadcrumb && locale && (
            <Breadcrumb
              items={breadcrumb}
              locale={locale}
              className="mb-6 text-white/60 [&_a]:text-white/60 [&_a:hover]:text-white [&_.text-foreground]:text-white [&_.text-foreground-secondary]:text-white/60 [&_.text-border]:text-white/25"
            />
          )}
          {eyebrow && <p className="anim-blur-in text-label text-white/70">{eyebrow}</p>}
          <h1 className="anim-blur-in mt-4 max-w-3xl font-display text-h1 text-balance" style={{ animationDelay: "100ms" }}>{title}</h1>
          {description && <p className="anim-blur-in mt-4 max-w-xl text-body-lg text-white/75" style={{ animationDelay: "200ms" }}>{description}</p>}
          {children && <div className="anim-fade-up mt-8" style={{ animationDelay: "300ms" }}>{children}</div>}
        </div>
      </section>
    );
  }
  return (
    <section className={cn("container-x pt-[calc(var(--header-h)+2.5rem)] pb-10 md:pt-[calc(var(--header-h)+4rem)]", className)}>
      <div className={cn(align === "center" && "mx-auto text-center")}>
        {breadcrumb && locale && (
          <Breadcrumb items={breadcrumb} locale={locale} className="mb-6" />
        )}
        {eyebrow && <p className="anim-blur-in text-label text-accent">{eyebrow}</p>}
        <h1 className="anim-blur-in mt-4 max-w-3xl font-display text-h1 text-balance" style={{ animationDelay: "80ms", marginInline: align === "center" ? "auto" : undefined }}>{title}</h1>
        {description && <p className={cn("anim-blur-in mt-4 max-w-xl text-body-lg text-foreground-secondary", align === "center" && "mx-auto")} style={{ animationDelay: "160ms" }}>{description}</p>}
        {children && <div className="anim-fade-up mt-8" style={{ animationDelay: "240ms" }}>{children}</div>}
      </div>
    </section>
  );
}
