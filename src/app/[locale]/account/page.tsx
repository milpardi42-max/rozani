import type { Metadata } from "next";
import { ArtistDashboardPanel } from "@/components/artist/ArtistDashboardPanel";
import { AccountView } from "@/components/profile/AccountView";
import { getSession } from "@/lib/auth";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

/** True for the accounts that sell: artists, and any account with an artist profile. */
function isDesigner(session: { role: string; artistId?: string } | null): boolean {
  return Boolean(session && (session.role === "artist" || session.artistId));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const session = await getSession();
  if (isDesigner(session)) {
    return { title: locale === "fa" ? "داشبورد هنرمند" : "Artist dashboard", robots: { index: false } };
  }
  return { title: dictionaries[locale].nav.account };
}

/**
 * The account page.
 *
 * Buyers keep the account view they always had — overview, reservations,
 * orders, settings. An artist / designer gets **only** the artist dashboard
 * here: the profile page of a designer is the dashboard (`ArtistDashboardPanel`,
 * the same panel `/{locale}/artist` renders), with none of the buyer sections.
 */
export default async function AccountPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await getSession();

  if (session && isDesigner(session)) {
    return <ArtistDashboardPanel locale={locale} userId={session.id} artistId={session.artistId} />;
  }

  return <AccountView />;
}
