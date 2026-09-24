"use client";

import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/layout/PageTransition";

export function LocaleChrome({ children, before, after }: { children: React.ReactNode; before: React.ReactNode; after: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = /\/academy\/[^/]+\/(live|broadcast)\/?$/.test(pathname);

  if (isFullscreen) {
    return (
      <main id="main" className="min-h-dvh flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {before}
      <main id="main" className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      {after}
    </div>
  );
}
