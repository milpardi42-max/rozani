import type { Metadata } from "next";
import { PageHero } from "@/components/ui/PageHero";
import { getSite } from "@/lib/data/queries";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].footer.faq };
}
export default async function FaqPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const site = await getSite();
  const d = dictionaries[locale];
  const fa = locale === "fa";
  const items = fa
    ? [["فایل الگو با چه فرمتی تحویل می‌شود؟", "AI، PDF و TIFF با کیفیت ۳۰۰ DPI، همراه با راهنمای تکرار."], ["تفاوت لایسنس شخصی و تجاری چیست؟", "لایسنس شخصی برای استفاده در خانه‌ی خودتان است؛ تجاری برای چاپ و فروش محصول یا اجرای پروژه."], ["محصولات اختصاصی چطور ارسال می‌شوند؟", "با پست پیشتاز یا تیپاکس، ۳ تا ۵ روز کاری."], ["می‌توانم الگوی سفارشی سفارش بدهم؟", "بله؛ از صفحه‌ی تولید سفارشی درخواست بدهید."]]
    : [["In what format are pattern files delivered?", "AI, PDF and TIFF at 300 DPI, with a repeat guide."], ["What is the difference between personal and commercial licenses?", "Personal is for your own home; commercial covers printing, selling products or executing projects."], ["How are exclusive products shipped?", "Express courier, 3–5 business days."], ["Can I commission a custom pattern?", "Yes — request one from the Custom Production page."]];

  const breadcrumb = [
    { label: d.nav.home, href: href(locale, "/") },
    { label: d.footer.support },
    { label: d.footer.faq },
  ];

  return (
    <>
      <PageHero
        eyebrow={d.footer.support}
        title={d.footer.faq}
        image={site.patterns[0]?.image ?? site.hero.image}
        breadcrumb={breadcrumb}
        locale={locale}
        zoomDirection="in"
      />
      <div className="container-x max-w-3xl pb-20">
        {items.map(([q, a]) => <details key={q} className="group border-b border-border py-5"><summary className="cursor-pointer list-none font-medium flex items-center justify-between gap-4">{q}<span className="text-muted transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 text-body text-foreground-secondary">{a}</p></details>)}
      </div>
    </>
  );
}
