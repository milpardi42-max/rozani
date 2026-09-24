"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth, useCart, useLocale } from "@/components/providers/AppProviders";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Sku } from "@/components/ui/Badge";
import { EmptyState, SuccessState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { formatPrice, href } from "@/lib/utils";

export function CheckoutView() {
  const { lines, clear } = useCart();
  const { locale, dict } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fa = locale === "fa";
  const total = lines.reduce(
    (acc, l) => ({ fa: acc.fa + l.price.fa * l.qty, en: acc.en + l.price.en * l.qty }),
    { fa: 0, en: 0 },
  );

  if (done) {
    return (
      <div className="container-x max-w-xl pt-[calc(var(--header-h)+4rem)] pb-20">
        <SuccessState
          message={`${fa ? "سفارش شما با موفقیت ثبت شد. شماره سفارش" : "Order placed successfully. Order number"}: ${done}`}
        />
        <Button href={href(locale, "/")} className="mt-6" variant="outline">
          {dict.common.continueShopping}
        </Button>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="container-x max-w-xl pt-[calc(var(--header-h)+4rem)] pb-20">
        <EmptyState
          title={dict.common.emptyCart}
          description={dict.common.emptyCartDesc}
          action={
            <Button href={href(locale, "/shop")} size="sm" variant="outline">
              {dict.common.continueShopping}
            </Button>
          }
        />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);

    const orderLines = lines.map((l) => ({
      kind: l.kind,
      id: l.id,
      sku: l.sku,
      title: l.title,
      image: l.image,
      price: l.price,
      colorName: l.colorName,
      qty: l.qty,
    }));

    try {
      const r = await fetch("/api/orders", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: fd.get("name"),
          email: fd.get("email") || user?.email,
          phone: fd.get("phone"),
          address: fd.get("address"),
          city: fd.get("city"),
          postal: fd.get("postal"),
          lines: orderLines,
        }),
      });
      const d = (await r.json()) as { ok: boolean; orderId?: string; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error ?? "server_error");
      clear();
      setDone(d.orderId ?? "—");
      router.refresh();
    } catch {
      setError(fa ? "خطا در ثبت سفارش. لطفاً دوباره تلاش کنید." : "Order failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x pt-[calc(var(--header-h)+2.5rem)] pb-20">
      <h1 className="font-display text-h1">{dict.common.checkout}</h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        <form className="space-y-4 lg:col-span-7" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={dict.common.name}>
              <Input name="name" required autoComplete="name" defaultValue={user?.name ?? ""} />
            </Field>
            <Field label={dict.common.phone}>
              <Input name="phone" type="tel" required dir="ltr" autoComplete="tel" />
            </Field>
            <Field label={dict.common.email}>
              <Input
                name="email"
                type="email"
                required
                dir="ltr"
                autoComplete="email"
                defaultValue={user?.email ?? ""}
              />
            </Field>
            <Field label={dict.common.city}>
              <Input name="city" required autoComplete="address-level2" />
            </Field>
            <div className="sm:col-span-2">
              <Field label={dict.common.address}>
                <Input name="address" required autoComplete="street-address" />
              </Field>
            </div>
            <Field label={dict.common.postal}>
              <Input name="postal" dir="ltr" autoComplete="postal-code" />
            </Field>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {dict.common.placeOrder}
          </Button>
        </form>

        <aside className="lg:col-span-5">
          <div className="rounded-lg border border-border p-5">
            <ul className="divide-y divide-border">
              {lines.map((l) => (
                <li key={l.key} className="flex gap-3 py-3">
                  <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md bg-background-secondary">
                    <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{l.title}</span>
                    <span className="mt-1 flex items-center gap-2 text-caption text-foreground-secondary">
                      <Sku value={l.sku} />
                      {l.colorName && <span>{l.colorName}</span>}
                      <span>× {l.qty}</span>
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular">
                    {formatPrice({ fa: l.price.fa * l.qty, en: l.price.en * l.qty }, locale)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-foreground-secondary">{dict.common.total}</span>
              <span className="font-display text-h3 tabular">{formatPrice(total, locale)}</span>
            </div>
            <p className="mt-2 text-caption text-muted">{dict.common.shippingNote}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
