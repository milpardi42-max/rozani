"use client";

import { PortfolioLangProvider } from "@/components/portfolio/PortfolioLangProvider";
import { PfHero } from "@/components/sections/PfHero";
import { PfAbout } from "@/components/sections/PfAbout";
import { PfPortfolio } from "@/components/sections/PfPortfolio";
import { PfPhilosophy } from "@/components/sections/PfPhilosophy";
import { PfAcademic } from "@/components/sections/PfAcademic";
import { PfContact } from "@/components/sections/PfContact";
import { useReveal } from "@/hooks/use-reveal";
import type { Locale } from "@/lib/i18n/types";
import type { Lang } from "@/lib/portfolio-translations";

function PortfolioInner() {
  useReveal();
  return (
    <>
      <PfHero />
      <PfAbout />
      <PfPortfolio />
      <PfPhilosophy />
      <PfAcademic />
      <PfContact />
    </>
  );
}

export default function RaziehPortfolioClient({ locale }: { locale: Locale }) {
  const lang: Lang = locale === "fa" ? "fa" : "en";
  return (
    <PortfolioLangProvider initialLang={lang}>
      <PortfolioInner />
    </PortfolioLangProvider>
  );
}
