import type { Metadata } from "next";
import { CheckoutView } from "@/components/product/CheckoutView";
import { dictionaries } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[locale].common.checkout };
}
export default function CheckoutPage() {
  return <CheckoutView />;
}
