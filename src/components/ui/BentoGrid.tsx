import { cn } from "@/lib/utils";

/** 12-col editorial grid with dense auto-placement. Children control their own spans via className. */
export function BentoGrid({ className, children, rows = "auto-rows-[220px] md:auto-rows-[260px]" }: { className?: string; children: React.ReactNode; rows?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-6 md:gap-4 lg:grid-cols-12 grid-flow-dense", rows, className)}>{children}</div>;
}

export const bentoSpan = {
  hero: "col-span-2 row-span-2 md:col-span-4 lg:col-span-7 lg:row-span-2",
  tall: "col-span-1 row-span-2 md:col-span-2 lg:col-span-5 lg:row-span-2",
  wide: "col-span-2 md:col-span-4 lg:col-span-7",
  square: "col-span-1 md:col-span-2 lg:col-span-5",
} as const;
