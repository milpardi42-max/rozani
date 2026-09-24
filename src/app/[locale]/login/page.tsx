import type { Metadata } from "next";
import { LoginShell } from "@/components/profile/LoginShell";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.login };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = dictionaries[locale];
  const site = await getSite();
  const image = site.portfolios[5]?.cover ?? site.hero.image;

  return (
    <LoginShell
      locale={locale}
      image={image}
      dict={{ login: d.nav.login, signup: d.nav.signup, admin: d.nav.admin }}
    />
  );
}
