"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Subtle fade/slide on route change — CSS only, keyed on pathname. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [renderKey, setRenderKey] = useState(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return; }
    setRenderKey((k) => k + 1);
  }, [pathname]);

  return (
    <div key={renderKey} className="anim-page">
      {children}
    </div>
  );
}
