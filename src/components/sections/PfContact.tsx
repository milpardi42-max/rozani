"use client";

import { useState, useRef } from "react";
import { Mail, MapPin, ExternalLink, Link2 } from "lucide-react";
import { usePortfolioLang } from "@/components/portfolio/PortfolioLangProvider";
import { T } from "@/lib/portfolio-translations";

export function PfContact() {
  const { lang } = usePortfolioLang();
  const formRef = useRef<HTMLFormElement>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    formRef.current?.reset();
  };

  return (
    <section id="contact" className="bg-pf-ink py-20 md:py-28 lg:py-36">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* left info column */}
          <div className="reveal lg:col-span-5 flex flex-col justify-center">
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-pf-gold">
              {T("contactLabel", lang)}
            </p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight text-pf-cream mb-6">
              {T("contactTitle", lang)}
            </h2>
            <p className="mb-8 text-pf-stone/60 leading-relaxed">
              {T("contactDesc", lang)}
            </p>

            {/* contact details */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-pf-gold/70" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-pf-stone/50 mb-0.5">
                    {T("emailLabel", lang)}
                  </p>
                  <a
                    href="mailto:r.kheyripour@art.ac.ir"
                    dir="ltr"
                    className="text-sm text-pf-stone/80 transition-colors hover:text-pf-gold"
                  >
                    r.kheyripour@art.ac.ir
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-pf-gold/70" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-pf-stone/50 mb-0.5">
                    {T("addressLabel", lang)}
                  </p>
                  <p className="text-sm text-pf-stone/80">{T("addressVal", lang)}</p>
                </div>
              </div>
            </div>

            {/* social icons */}
            <div className="mt-8 flex gap-3">
              {[
                { icon: ExternalLink, label: "Instagram", href: "#" },
                  { icon: Link2,       label: "LinkedIn",  href: "#" },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/50 transition-colors hover:border-pf-gold hover:text-pf-gold"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* right form column */}
          <div className="reveal lg:col-span-7" style={{ "--reveal-delay": "100ms" } as React.CSSProperties}>
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-pf-stone/50 mb-2">
                    {T("nameField", lang)}
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full border-b border-white/20 bg-transparent pb-2 text-pf-cream placeholder:text-white/20 focus:border-pf-gold focus:outline-none transition-colors"
                    placeholder={T("nameField", lang)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-pf-stone/50 mb-2">
                    {T("emailField", lang)}
                  </label>
                  <input
                    required
                    type="email"
                    dir="ltr"
                    className="w-full border-b border-white/20 bg-transparent pb-2 text-pf-cream placeholder:text-white/20 focus:border-pf-gold focus:outline-none transition-colors"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-pf-stone/50 mb-2">
                  {T("subjectField", lang)}
                </label>
                <input
                  required
                  type="text"
                  className="w-full border-b border-white/20 bg-transparent pb-2 text-pf-cream placeholder:text-white/20 focus:border-pf-gold focus:outline-none transition-colors"
                  placeholder={T("subjectField", lang)}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-pf-stone/50 mb-2">
                  {T("messageField", lang)}
                </label>
                <textarea
                  required
                  rows={5}
                  className="w-full resize-none border-b border-white/20 bg-transparent pb-2 text-pf-cream placeholder:text-white/20 focus:border-pf-gold focus:outline-none transition-colors"
                  placeholder={T("messageField", lang)}
                />
              </div>

              {/* submit */}
              <button
                type="submit"
                className="rounded-full bg-pf-gold px-8 py-3 text-sm font-medium uppercase tracking-[0.18em] text-pf-ink transition-opacity hover:opacity-90"
              >
                {T("sendBtn", lang)}
              </button>

              {/* success message */}
              <div
                className={`text-sm text-pf-gold transition-opacity duration-500 ${sent ? "opacity-100" : "opacity-0"}`}
              >
                {T("successMsg", lang)}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
