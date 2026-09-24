import { redirect } from "next/navigation";
import { getSession, isOwner } from "@/lib/auth";
import { OwnerApp } from "@/components/owner/OwnerApp";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

export default async function OwnerAcademyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!isOwner(session)) {
    redirect(`/${locale}/login?next=/${locale}/owner/academy`);
  }

  return <OwnerApp defaultSection="academy" />;
}
