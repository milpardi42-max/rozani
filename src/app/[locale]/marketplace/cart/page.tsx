import type { Metadata } from "next";
import { DigitalCheckout } from "@/components/marketplace/DigitalCheckout";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "fa" ? "سبد خرید دیجیتال" : "Digital cart", robots: { index: false } };
}

export default async function MarketplaceCartPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const fa = locale === "fa";

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "فایل دیجیتال" : "Digital files", href: href(locale, "/marketplace") },
          { label: fa ? "پرداخت" : "Checkout" },
        ]}
        locale={locale}
        className="mb-6"
      />
      <h1 className="font-display text-h1">{fa ? "پرداخت و تحویل فوری" : "Checkout & instant delivery"}</h1>
      <p className="mt-2 max-w-2xl text-foreground-secondary">
        {fa
          ? "پس از پرداخت، لایسنس صادر می‌شود، گواهی PDF آماده می‌گردد و لینک دانلود امن بلافاصله در دسترس است."
          : "Once paid, your license is issued, the PDF certificate is generated and the secure download link is ready immediately."}
      </p>
      <div className="mt-10">
        <DigitalCheckout />
      </div>
    </div>
  );
}
