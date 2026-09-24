import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArtistStudio } from "@/components/marketplace/ArtistStudio";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fa" ? "میز کار فروش هنرمند" : "Artist sales studio",
    robots: { index: false },
  };
}

/**
 * Artist sales studio — the seller side of the marketplace.
 *
 * Kept as its own route (rather than folded into the existing portfolio
 * dashboard) so the two concerns stay separable: portfolio/commissions live in
 * `/artist`, digital-licence selling lives here.
 */
export default async function ArtistStudioPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const fa = locale === "fa";
  const session = await getSession();

  if (!session) redirect(href(locale, `/login?next=/${locale}/artist/marketplace`));
  if (session.role === "user" && !session.artistId) {
    return (
      <div className="container-x pt-[calc(var(--header-h)+2rem)] pb-24">
        <div className="mx-auto max-w-xl rounded-2xl border border-border p-10 text-center">
          <h1 className="font-display text-h3">{fa ? "این بخش برای هنرمندان است" : "This area is for artists"}</h1>
          <p className="mt-2 text-caption text-foreground-secondary">
            {fa
              ? "برای فروش آثار دیجیتال، ابتدا پروفایل هنرمند خود را تکمیل کنید."
              : "Complete your artist profile before selling digital works."}
          </p>
          <a href={href(locale, "/creators/join")} className="mt-5 inline-flex rounded-full bg-foreground px-5 py-3 text-sm text-background">
            {fa ? "تکمیل پروفایل هنرمند" : "Become an artist"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "پنل هنرمند" : "Artist", href: href(locale, "/artist") },
          { label: fa ? "میز کار فروش" : "Sales studio" },
        ]}
        locale={locale}
        className="mb-6"
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1">{fa ? "میز کار فروش آثار دیجیتال" : "Digital sales studio"}</h1>
          <p className="mt-2 max-w-2xl text-foreground-secondary">
            {fa
              ? "فایل مادر را ارسال کنید، قیمت لایسنس‌ها را تعیین کنید و فروش، سهم خود و تسویه را پیگیری کنید."
              : "Submit master files, price your licenses, and follow sales, royalties and payouts."}
          </p>
        </div>
        <SignOutButton />
      </div>
      <div className="mt-10">
        <ArtistStudio locale={locale} />
      </div>
    </div>
  );
}
