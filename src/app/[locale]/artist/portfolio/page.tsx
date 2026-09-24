import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { ArtistDashboard } from "@/components/artist/ArtistDashboard";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fa" ? "پورتفولیو و پروژه‌های هنرمند" : "Artist portfolio",
    robots: { index: false },
  };
}

/**
 * Portfolio manager — the artist's projects and shop products.
 *
 * Unchanged in substance from the original artist dashboard (patterns,
 * products, profile, stats): it moved here so `/artist` can be the seller
 * overview, and nothing the artists already used was lost.
 */
export default async function ArtistPortfolioPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const fa = locale === "fa";
  const session = await getSession();

  if (!session) redirect(href(locale, `/login?next=/${locale}/artist/portfolio`));

  return (
    <>
      <div className="border-b border-border bg-surface">
        <div className="container-x flex flex-wrap items-center justify-between gap-3 py-4 pt-[calc(var(--header-h)+1rem)]">
          <p className="text-caption text-foreground-secondary">
            {fa
              ? "پورتفولیو، پروژه‌ها و محصولات فروشگاهی شما — جدا از میز کار فروش دیجیتال."
              : "Your portfolio, projects and shop products — separate from the digital sales studio."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={href(locale, "/artist")}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-caption transition hover:border-foreground"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              {fa ? "داشبورد هنرمند" : "Artist dashboard"}
            </Link>
            <Link
              href={href(locale, "/artist/marketplace?tab=assets")}
              className="inline-flex h-10 items-center rounded-full border border-border px-4 text-caption transition hover:border-foreground"
            >
              {fa ? "میز کار فروش" : "Sales studio"}
            </Link>
            <SignOutButton size="sm" />
          </div>
        </div>
      </div>
      <ArtistDashboard />
    </>
  );
}
