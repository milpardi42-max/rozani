import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/marketplace/AdminConsole";
import { getSession } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "فروشگاه دیجیتال · پنل مدیریت",
  robots: { index: false },
};

/**
 * Marketplace console inside the existing admin area (`/admin/marketplace`), so
 * the operator keeps one login and the current admin app is left untouched.
 */
export default async function AdminMarketplacePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const session = await getSession();

  if (!session || session.role !== "admin") {
    redirect(href(locale, `/admin/login?next=/admin/marketplace`));
  }

  const fa = locale === "fa";

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-h2">{fa ? "مدیریت فروشگاه دیجیتال" : "Digital marketplace console"}</h1>
          <p className="mt-2 max-w-2xl text-caption text-foreground-secondary">
            {fa
              ? "بازبینی فایل‌های مادر، مدیریت سفارش‌ها و لایسنس‌ها، تسویه هنرمندان، صندوق ایمیل‌ها و وضعیت یکپارچه‌سازی‌ها."
              : "Master-file review, orders and licenses, artist payouts, the e-mail outbox and integration status."}
          </p>
        </div>
        <a href={href(locale, "/admin")} className="rounded-full border border-border px-4 py-2 text-sm">
          {fa ? "پنل مدیریت اصلی" : "Main admin"}
        </a>
      </div>

      <div className="mt-8">
        <AdminConsole locale={locale} />
      </div>
    </div>
  );
}
