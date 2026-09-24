"use client";

import { useState } from "react";
import { useLocale } from "@/components/providers/AppProviders";
import { Button } from "./Button";
import { Field, Input, Select, Textarea } from "./Input";
import { ErrorState, SuccessState } from "./States";

export function InquiryForm({ kind, options }: { kind: "b2b" | "custom" | "contact" | "creator"; options?: string[] }) {
  const { locale, dict } = useLocale();
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [id, setId] = useState("");
  const fa = locale === "fa";

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("loading");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, ...Object.fromEntries(fd) }) });
      const j = await r.json();
      if (!r.ok) throw new Error();
      setId(j.id);
      setState("ok");
    } catch {
      setState("error");
    }
  };

  if (state === "ok") return <SuccessState message={`${fa ? "درخواست شما ثبت شد. شماره پیگیری" : "Your request was received. Reference"}: ${id}`} />;

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={dict.common.name}><Input name="name" required autoComplete="name" /></Field>
      <Field label={dict.common.email}><Input name="email" type="email" required dir="ltr" autoComplete="email" /></Field>
      <Field label={dict.common.phone}><Input name="phone" type="tel" dir="ltr" autoComplete="tel" /></Field>
      {options && (
        <Field label={fa ? "نوع پروژه" : "Project type"}>
          <Select name="type">{options.map((o) => <option key={o}>{o}</option>)}</Select>
        </Field>
      )}
      <div className="sm:col-span-2"><Field label={fa ? "توضیحات" : "Details"}><Textarea name="message" required placeholder={fa ? "درباره‌ی فضا، متراژ، زمان‌بندی و بودجه‌ی تقریبی بنویسید…" : "Tell us about the space, size, timeline and rough budget…"} /></Field></div>
      {state === "error" && <div className="sm:col-span-2"><ErrorState /></div>}
      <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={state === "loading"}>{dict.common.submit}</Button></div>
    </form>
  );
}
