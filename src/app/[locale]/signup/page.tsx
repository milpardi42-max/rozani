import type { Metadata } from "next";
import { SignupShell } from "@/components/profile/SignupShell";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].nav.signup };
}

export default async function SignupPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = dictionaries[locale];
  const site = await getSite();
  const image = site.portfolios[2]?.cover ?? site.hero.image;

  return (
    <SignupShell
      locale={locale}
      image={image}
      dict={{ login: d.nav.login, signup: d.nav.signup }}
    />
  );
}
