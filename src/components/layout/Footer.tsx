"use client";

import Link from "next/link";
import { Camera, Mail, MapPin, Phone, Send } from "lucide-react";
import { useAuth, useLocale, useTheme } from "@/components/providers/AppProviders";
import { href } from "@/lib/utils";
import { Logo } from "./Logo";
import { NewsletterForm } from "./NewsletterForm";
import { usePathname } from "next/navigation";
import { faNum } from "@/lib/utils";

export function Footer() {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const other = locale === "fa" ? "en" : "fa";
  const switchHref = pathname.replace(new RegExp(`^/${locale}`), `/${other}`) || `/${other}`;
  const year = new Date().getFullYear();

  const cols = [
    { title: dict.footer.discover, links: [[dict.nav.patterns, "/patterns"], [dict.nav.products, "/shop"], [locale === "fa" ? "فایل دیجیتال و لایسنس" : "Digital files & licensing", "/marketplace"], [locale === "fa" ? "اشتراک دانلود" : "Download passes", "/marketplace/subscriptions"], [dict.nav.artists, "/artists"], [dict.nav.portfolio, "/portfolio"], [locale === "fa" ? "پورتفولیوی راضیه خیری‌پور" : "Razieh Kheiripour's portfolio", "/razieh"], [dict.nav.education, "/academy"], [dict.nav.collections, "/collections"]] },
    { title: dict.footer.company, links: [[dict.nav.about, "/about"], [dict.nav.projects, "/projects"], [dict.nav.custom, "/custom"], [dict.nav.stories, "/stories"], [dict.nav.becomeCreator, "/creators/join"], [locale === "fa" ? "میز کار فروش هنرمند" : "Artist sales studio", "/artist/marketplace"]] },
    { title: dict.footer.support, links: [[dict.footer.faq, "/faq"], [dict.footer.returns, "/returns"], [dict.nav.contact, "/contact"], [dict.nav.account, user ? "/account" : "/login"], [locale === "fa" ? "راستی‌آزمایی گواهی" : "Verify a certificate", "/verify"], ...(user?.role === "admin" ? [[dict.nav.admin, "/admin"]] : [])] },
  ];

  return (
    <footer className="relative mt-24 border-t border-border bg-background">
      <div className="gradient-strip absolute inset-x-0 top-0" />
      <div className="container-x pt-16 pb-10">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* brand */}
          <div className="lg:col-span-4">
            <Link href={href(locale, "/")} className="inline-flex items-center">
              <Logo className="text-[19px] text-foreground" />
            </Link>
            <p className="mt-5 max-w-sm text-body-sm text-foreground-secondary">{dict.footer.about}</p>
            <div className="mt-6 flex items-center gap-2">
              {[
                { icon: Camera, label: "Instagram", href: "https://instagram.com" },
                { icon: Send, label: "Telegram", href: "https://t.me" },
                { icon: Mail, label: "Email", href: "mailto:hello@rosieatelier.com" },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} className="flex h-10 w-10 items-center justify-center rounded-full glass text-foreground transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-soft">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* nav */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            {cols.map((c) => (
              <div key={c.title}>
                <p className="text-label text-muted">{c.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map(([label, path]) => (
                    <li key={path}>
                      <Link href={href(locale, path)} className="text-sm text-foreground-secondary transition-colors hover:text-foreground">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* newsletter + contact */}
          <div className="lg:col-span-3">
            <p className="text-label text-muted">{dict.common.newsletterTitle}</p>
            <NewsletterForm compact className="mt-4" />
            <div className="mt-6 rounded-lg border border-border p-4 text-sm">
              <p className="mb-3 font-medium">{dict.footer.contactTitle}</p>
              <ul className="space-y-2 text-foreground-secondary">
                <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 shrink-0" />{locale === "fa" ? "تهران، خیابان ولیعصر" : "Valiasr St., Tehran"}</li>
                <li className="flex items-center gap-2" dir="ltr"><Phone className="h-3.5 w-3.5 shrink-0" />+98 21 8800 0000</li>
                <li className="flex items-center gap-2" dir="ltr"><Mail className="h-3.5 w-3.5 shrink-0" />hello@rosieatelier.com</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border pt-6 text-caption text-foreground-secondary md:flex-row md:items-center md:justify-between">
          <p>© {locale === "fa" ? faNum(year) : year} Rosie Atelier · {dict.footer.founder} · {dict.footer.rights}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href={href(locale, "/legal/privacy")} className="hover:text-foreground">{dict.footer.privacy}</Link>
            <Link href={href(locale, "/legal/terms")} className="hover:text-foreground">{dict.footer.terms}</Link>
            <Link href={href(locale, "/legal/licenses")} className="hover:text-foreground">{dict.footer.licenses}</Link>
            <Link href={switchHref} className="rounded-full border border-border px-2.5 py-1 hover:border-foreground">{other === "fa" ? "فارسی" : "English"}</Link>
            <button type="button" onClick={toggle} className="rounded-full border border-border px-2.5 py-1 hover:border-foreground">{theme === "dark" ? (locale === "fa" ? "روشن" : "Light") : locale === "fa" ? "تاریک" : "Dark"}</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
