import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/types";
import RaziehPortfolioClient from "./RaziehClient";

export const metadata: Metadata = {
  title: { absolute: "راضیه خیری‌پور — طراح الگو و استاد دانشگاه | Razieh Kheiripour" },
  description:
    "پورتفولیو حرفه‌ای راضیه خیری‌پور — طراح الگو، کاغذ دیواری، پارچه و پرده | Professional portfolio of Razieh Kheiripour — Pattern, Wallpaper, Textile & Drapery Designer",
};

export default async function RaziehPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <RaziehPortfolioClient locale={locale as Locale} />;
}
