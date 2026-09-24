import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/types";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Accessible breadcrumb nav — RTL-aware (uses ChevronLeft for fa, ChevronRight for en).
 * The last item is always the current page (no link, aria-current="page").
 */
export function Breadcrumb({
  items,
  locale,
  className,
}: {
  items: BreadcrumbItem[];
  locale: Locale;
  className?: string;
}) {
  const Sep = locale === "fa" ? ChevronLeft : ChevronRight;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center flex-wrap gap-1 text-caption text-foreground-secondary", className)}>
      <ol className="flex items-center flex-wrap gap-1" itemScope itemType="https://schema.org/BreadcrumbList">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li
              key={i}
              className="flex items-center gap-1"
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
            >
              {i > 0 && (
                <Sep className="h-3.5 w-3.5 shrink-0 text-border" aria-hidden="true" />
              )}
              {isLast || !item.href ? (
                <span
                  className={cn(isLast ? "text-foreground font-medium" : "text-foreground-secondary")}
                  aria-current={isLast ? "page" : undefined}
                  itemProp="name"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                  itemProp="item"
                >
                  <span itemProp="name">{item.label}</span>
                </Link>
              )}
              <meta itemProp="position" content={String(i + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
