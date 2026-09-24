import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].footer.returns };
}
export default async function ReturnsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const d = dictionaries[locale];
  const fa = locale === "fa";
  return (
    <>
      <PageHero eyebrow={d.footer.support} title={d.footer.returns} />
      <div className="container-x prose-ra pb-20">
        <p>{fa ? "محصولات فیزیکی کالکشن اختصاصی تا ۷ روز پس از تحویل، در صورت سالم بودن و بسته‌بندی اولیه، قابل بازگشت هستند." : "Physical products from the exclusive collection can be returned within 7 days of delivery, if unused and in original packaging."}</p>
        <p>{fa ? "فایل‌های دیجیتال الگو به دلیل ماهیت‌شان قابل بازگشت نیستند؛ اما اگر مشکلی در فایل وجود داشت، ظرف ۴۸ ساعت رفع یا وجه بازگردانده می‌شود." : "Digital pattern files are non-returnable by nature; however, if a file is faulty we fix it or refund within 48 hours."}</p>
      </div>
    </>
  );
}
