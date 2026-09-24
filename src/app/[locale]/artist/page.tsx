import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Palette, Sparkles } from "lucide-react";
import { ArtistDashboardPanel } from "@/components/artist/ArtistDashboardPanel";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fa" ? "داشبورد هنرمند" : "Artist dashboard",
    robots: { index: false },
  };
}

/**
 * Artist dashboard — the seller home.
 *
 * Signed-out visitors go to the login page; buyers (accounts without an
 * artist profile) get an honest upsell to the designer registration instead of
 * an empty screen. Everything an approved artist needs is assembled
 * server-side in `getArtistDashboard()`.
 */
export default async function ArtistDashboardPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const fa = locale === "fa";
  const session = await getSession();

  if (!session) redirect(href(locale, `/login?next=/${locale}/artist`));

  const isArtist = session.role === "artist" || session.role === "admin" || Boolean(session.artistId);
  if (!isArtist) {
    return (
      <div className="container-x pt-[calc(var(--header-h)+2.5rem)] pb-24">
        <div className="mx-auto max-w-xl rounded-3xl border border-border bg-surface p-10 text-center shadow-soft">
          <Palette className="mx-auto h-8 w-8 text-accent" />
          <h1 className="mt-4 font-display text-h2">{fa ? "اینجا خانه‌ی هنرمندان است" : "This is the artists' home"}</h1>
          <p className="mt-3 text-body-sm text-foreground-secondary">
            {fa
              ? "حساب شما حساب خریدار است. برای فروش طرح‌ها، فرم ثبت‌نام فروشنده را پر کنید؛ حوزه‌ی فعالیت و شهر را می‌نویسید و اطلاعات استودیو و فرمت‌های تحویل اختیاری‌اند."
              : "Yours is a buyer account. To sell designs, fill in the seller registration form — your field of practice and city, with studio details and delivery formats optional."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href={href(locale, "/creators/join")}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm text-background transition hover:bg-primary"
            >
              <Sparkles className="h-4 w-4" />
              {fa ? "ثبت‌نام هنرمند / فروشنده" : "Artist / seller signup"}
            </Link>
            <Link
              href={href(locale, "/account")}
              className="inline-flex h-11 items-center rounded-full border border-border px-6 text-sm transition hover:border-foreground"
            >
              {fa ? "حساب خریدار من" : "My buyer account"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ArtistDashboardPanel locale={locale} userId={session.id} artistId={session.artistId} />;
}
