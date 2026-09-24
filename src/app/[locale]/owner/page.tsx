import { redirect } from "next/navigation";
import Link from "next/link";
import { GalleryHorizontalEnd, BookOpen, ArrowLeft } from "lucide-react";
import { getSession, isOwner } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OwnerIndexPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  if (!isOwner(session)) redirect(`/${locale}/login?next=/${locale}/owner`);

  const cards = [
    {
      href: href(locale, "/owner/portfolio"),
      icon: GalleryHorizontalEnd,
      title: "مدیریت پورتفولیو",
      desc: "افزودن، ویرایش و انتشار پروژه‌های اجراشده",
    },
    {
      href: href(locale, "/owner/academy"),
      icon: BookOpen,
      title: "مدیریت آکادمی",
      desc: "افزودن، ویرایش و انتشار دوره‌ها و ورکشاپ‌ها",
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="border-b border-border bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <p className="text-sm text-foreground-secondary">
            خوش آمدید، <span className="font-semibold text-foreground">{session!.name}</span>
          </p>
          <Link
            href={href(locale, "/")}
            className="inline-flex items-center gap-1.5 text-sm text-foreground-secondary hover:text-foreground"
          >
            بازگشت به سایت
            <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <h1 className="font-display text-h2 text-center mb-2">پنل مالک سایت</h1>
        <p className="text-body-sm text-foreground-secondary text-center mb-12">
          راضیه خیری‌پور — مدیریت محتوای پورتفولیو و آکادمی
        </p>
        <div className="grid gap-6 sm:grid-cols-2 w-full max-w-xl">
          {cards.map(({ href: cardHref, icon: Icon, title, desc }) => (
            <Link
              key={cardHref}
              href={cardHref}
              className="group flex flex-col gap-4 rounded-xl border border-border bg-surface p-8 transition-all hover:border-accent hover:shadow-soft"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-semibold text-foreground group-hover:text-accent transition-colors">
                  {title}
                </span>
                <span className="block mt-1 text-body-sm text-foreground-secondary">{desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
