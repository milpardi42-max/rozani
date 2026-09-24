import type { Metadata } from "next";
import { SandboxGateway } from "@/components/marketplace/SandboxGateway";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false } };

/**
 * Sandbox payment page.
 *
 * The gateway's `init()` sends the buyer here when this deployment has no live
 * PSP credentials. Server-rendered shell + client confirmation card, so the page
 * works even with JavaScript partially blocked (the buttons are ordinary POSTs
 * to the same API).
 */
export default async function SandboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ authority?: string }>;
}) {
  const { locale } = await params;
  const { authority } = await searchParams;
  return <SandboxGateway locale={locale === "en" ? "en" : "fa"} authority={authority ?? ""} />;
}
