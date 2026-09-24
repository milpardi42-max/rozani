"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { useAuth, useLocale } from "@/components/providers/AppProviders";
import { cn, href } from "@/lib/utils";

type Variant = "solid" | "outline" | "ghost" | "menu";
type Size = "sm" | "md" | "lg";

interface SignOutButtonProps {
  /**
   * `solid`  — filled, for card footers
   * `outline` — bordered, the house default (profile header, toolbars)
   * `ghost`  — text-only, for sidebars and dense rows
   * `menu`   — full-width row, for dropdowns (icon + label + hover)
   */
  variant?: Variant;
  size?: Size;
  /** Icon-only square button (header). Label becomes the accessible name. */
  iconOnly?: boolean;
  /** Where to land after signing out (locale-prefixed automatically). */
  redirectTo?: string;
  label?: string;
  className?: string;
}

const SIZES: Record<Size, string> = {
  sm: "h-9 gap-2 px-3.5 text-caption",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-sm",
};

const VARIANTS: Record<Variant, string> = {
  solid: "bg-foreground text-background hover:bg-primary",
  outline: "border border-border text-foreground-secondary hover:border-error hover:text-error",
  ghost: "text-foreground-secondary hover:bg-background-secondary hover:text-error",
  menu: "w-full justify-start rounded-xl px-3 py-2.5 text-sm text-foreground-secondary hover:bg-background-secondary hover:text-error",
};

/**
 * Sign out — one control for the whole site.
 *
 * Clearing the session cookie is not enough on its own: several pages
 * (/account, /artist, /artist/marketplace) are server-rendered with the
 * visitor's data, so a soft navigation could still show the previous render.
 * This button therefore clears the cookie, replaces the history entry (so the
 * back button cannot return to a private page) and refreshes the router so
 * every server component re-renders as a signed-out visitor.
 */
export function SignOutButton({
  variant = "outline",
  size = "md",
  iconOnly = false,
  redirectTo = "/",
  label,
  className,
}: SignOutButtonProps) {
  const { locale } = useLocale();
  const { logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const fa = locale === "fa";
  const text = label ?? (fa ? "خروج از حساب" : "Sign out");

  const signOut = () => {
    if (busy) return;
    setBusy(true);
    logout();                                  // clears client state + POSTs /api/auth/logout
    router.replace(href(locale, redirectTo));  // no history entry back into the private area
    router.refresh();                          // re-render server components as a guest
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      aria-label={text}
      title={iconOnly ? text : undefined}
      data-testid="sign-out"
      className={cn(
        "inline-flex items-center justify-center font-medium transition disabled:opacity-60",
        iconOnly ? "" : SIZES[size],
        VARIANTS[variant],
        iconOnly && "h-10 w-10 rounded-md",
        variant === "menu" && !iconOnly && "",
        className,
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className={iconOnly ? "h-[18px] w-[18px]" : "h-4 w-4"} />}
      {!iconOnly && <span>{busy ? (fa ? "در حال خروج…" : "Signing out…") : text}</span>}
    </button>
  );
}
