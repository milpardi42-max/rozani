"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart, useLocale } from "@/components/providers/AppProviders";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Sku } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatPrice, href } from "@/lib/utils";

export function CartDrawer() {
  const { isOpen, close, lines, remove, setQty } = useCart();
  const { locale, dict } = useLocale();
  const total = lines.reduce((acc, l) => ({ fa: acc.fa + l.price.fa * l.qty, en: acc.en + l.price.en * l.qty }), { fa: 0, en: 0 });

  return (
    <Modal open={isOpen} onClose={close} variant="drawer" label={dict.nav.cart}>
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-5">
          <h2 className="font-display text-h3">{dict.nav.cart}</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <EmptyState title={dict.common.emptyCart} description={dict.common.emptyCartDesc} action={<Button variant="outline" size="sm" onClick={close}>{dict.common.continueShopping}</Button>} className="border-0" />
          ) : (
            <ul className="divide-y divide-border">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-4 py-4 anim-fade-up">
                  <Link href={l.href} onClick={close} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-background-secondary">
                    <Image src={l.image} alt={l.title} fill sizes="80px" className="object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={l.href} onClick={close} className="line-clamp-2 text-sm font-medium hover:text-accent">{l.title}</Link>
                      <button aria-label={dict.common.remove} onClick={() => remove(l.key)} className="text-muted hover:text-error"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-caption text-foreground-secondary">
                      <Sku value={l.sku} />
                      {l.colorName && <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full ring-1 ring-border" style={{ background: l.colorHex }} />{l.colorName}</span>}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button aria-label="-" onClick={() => setQty(l.key, l.qty - 1)} className="flex h-8 w-8 items-center justify-center hover:text-accent"><Minus className="h-3 w-3" /></button>
                        <span className="w-6 text-center text-sm tabular">{l.qty}</span>
                        <button aria-label="+" onClick={() => setQty(l.key, l.qty + 1)} className="flex h-8 w-8 items-center justify-center hover:text-accent"><Plus className="h-3 w-3" /></button>
                      </div>
                      <span className="text-sm font-semibold tabular">{formatPrice({ fa: l.price.fa * l.qty, en: l.price.en * l.qty }, locale)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {lines.length > 0 && (
          <div className="border-t border-border px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">{dict.common.subtotal}</span>
              <span className="text-h4 font-semibold tabular">{formatPrice(total, locale)}</span>
            </div>
            <Button href={href(locale, "/checkout")} size="lg" className="w-full" onClick={close}>{dict.common.checkout}</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
