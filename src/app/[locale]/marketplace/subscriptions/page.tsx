import type { Metadata } from "next";
import { SubscriptionsView } from "@/components/marketplace/SubscriptionsView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fa" ? "اشتراک دانلود ماهانه" : "Monthly download passes",
    description:
      locale === "fa"
        ? "با اشتراک ماهانه چند فایل دیجیتال را با لایسنس شخصی و تجاری دانلود کنید."
        : "Download a handful of digital files each month under personal/commercial licenses.",
  };
}

export default async function SubscriptionsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const fa = locale === "fa";

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "فایل دیجیتال" : "Digital files", href: href(locale, "/marketplace") },
          { label: fa ? "اشتراک" : "Passes" },
        ]}
        locale={locale}
        className="mb-6"
      />
      <h1 className="font-display text-h1">{fa ? "اشتراک دانلود ماهانه" : "Monthly download passes"}</h1>
      <p className="mt-2 max-w-2xl text-foreground-secondary">
        {fa
          ? "پلن مناسب خود را انتخاب کنید و بعد از فعال‌سازی، از صفحه هر اثر دانلود کنید."
          : "Pick a plan, then redeem files straight from any asset page."}
      </p>
      <div className="mt-10">
        <SubscriptionsView />
      </div>
    </div>
  );
}
