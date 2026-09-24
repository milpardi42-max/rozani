import type { Metadata } from "next";
import { VerifyView } from "@/components/marketplace/VerifyView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fa" ? "راستی‌آزمایی گواهی لایسنس" : "Verify a license certificate",
    description:
      locale === "fa"
        ? "اصالت گواهی لایسنس صادرشده توسط رزی آتلیه را با شماره گواهی یا کد QR بررسی کنید."
        : "Confirm the authenticity of a Rosie Atelier license certificate using its number or QR code.",
  };
}

/**
 * Verification landing page — the target of the QR code printed on every
 * certificate. Reads `?serial=` so `/verify?serial=RA-LIC-…` works as a plain
 * link, and the same page accepts manual entry.
 */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ serial?: string }>;
}) {
  const { locale } = await params;
  const { serial } = await searchParams;
  const fa = locale === "fa";

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "راستی‌آزمایی گواهی" : "Verify certificate" },
        ]}
        locale={locale}
        className="mb-6"
      />
      <h1 className="font-display text-h1">{fa ? "راستی‌آزمایی گواهی لایسنس" : "Verify a license certificate"}</h1>
      <p className="mt-2 max-w-2xl text-foreground-secondary">
        {fa
          ? "کد QR روی گواهی‌های ما به همین صفحه اشاره می‌کند؛ شماره گواهی را وارد کنید تا معتبر بودن آن تأیید شود."
          : "The QR code on our certificates points here — enter the certificate number to confirm it is genuine."}
      </p>
      <div className="mt-10">
        <VerifyView initialSerial={serial} />
      </div>
    </div>
  );
}
