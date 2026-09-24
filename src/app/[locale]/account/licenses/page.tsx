import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MyLicenses } from "@/components/marketplace/MyLicenses";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false } };

/** Buyer's vault: licenses, certificates, download quota and verification links. */
export default async function AccountLicensesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const fa = locale === "fa";
  const session = await getSession();
  if (!session) redirect(href(locale, `/login?next=/${locale}/account/licenses`));

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "حساب من" : "My account", href: href(locale, "/account") },
          { label: fa ? "لایسنس‌ها" : "Licenses" },
        ]}
        locale={locale}
        className="mb-6"
      />
      <h1 className="font-display text-h1">{fa ? "لایسنس‌ها و گواهی‌ها" : "Licenses & certificates"}</h1>
      <p className="mt-2 max-w-2xl text-foreground-secondary">
        {fa
          ? "فایل‌های خریداری‌شده، گواهی PDF لایسنس و لینک راستی‌آزمایی هر خرید در این بخش است. هر دانلود ثبت و در سهمیه لایسنس لحاظ می‌شود."
          : "Your purchased files, PDF certificates and per-purchase verification links. Every download is logged and counted against the license quota."}
      </p>
      <div className="mt-10">
        <MyLicenses locale={locale} />
      </div>
    </div>
  );
}
