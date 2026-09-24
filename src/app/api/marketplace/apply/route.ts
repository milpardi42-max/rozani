import { getAssets } from "@/lib/marketplace/assets";
import { getSession } from "@/lib/auth";
import { clientIp, recordAttempt, tooManyAttempts } from "@/lib/rate-limit";
import { fail, json, readJson } from "@/lib/marketplace/guard";
import { queueMessage } from "@/lib/marketplace/email";
import { absoluteUrl } from "@/lib/marketplace/config";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketplace/apply
 *
 * Application endpoint for the artwork upload pipeline: an artist (or a shop
 * owner) describes the work they want reviewed and how they would price it. The
 * admin panel sees the request in the review queue; the reply is a real e-mail.
 *
 * Kept separate from `/api/marketplace/upload/session` because applying does not
 * require an existing account — the studio can pre-screen a file first.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limitKey = `marketplace-apply:${ip}`;
  if (tooManyAttempts(limitKey)) return fail("too_many_attempts", 429);
  recordAttempt(limitKey);

  const body = await readJson<{
    name?: string;
    email?: string;
    portfolio?: string;
    kind?: string;
    assetSlug?: string;
    message?: string;
    locale?: "fa" | "en";
    priceFa?: number;
    priceEn?: number;
  }>(request);

  const name = body?.name?.trim();
  const email = body?.email?.trim();
  if (!name || !email || !email.includes("@")) return fail("invalid_payload");

  const locale = body?.locale === "en" ? "en" : "fa";
  const assets = body?.assetSlug ? await getAssets() : [];
  const asset = body?.assetSlug ? assets.find((item) => item.slug === body.assetSlug) : null;

  await queueMessage({
    to: process.env.MARKETPLACE_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "hello@rosie-atelier.ir",
    subject: locale === "fa" ? `درخواست همکاری هنرمند — ${name}` : `Artist application — ${name}`,
    kind: "review",
    meta: { kind: "application", from: email, assetId: asset?.id ?? "" },
    html: `<div style="font-family:Tahoma,sans-serif;line-height:1.9" dir="${locale === "fa" ? "rtl" : "ltr"}">
      <h2>${locale === "fa" ? "درخواست جدید همکاری" : "New collaboration request"}</h2>
      <p><b>${locale === "fa" ? "نام" : "Name"}:</b> ${name}</p>
      <p><b>${locale === "fa" ? "ایمیل" : "Email"}:</b> ${email}</p>
      ${body?.portfolio ? `<p><b>${locale === "fa" ? "نمونه‌کار" : "Portfolio"}:</b> <a href="${body.portfolio}">${body.portfolio}</a></p>` : ""}
      ${asset ? `<p><b>${locale === "fa" ? "اثر مورد اشاره" : "Referenced work"}:</b> <a href="${absoluteUrl(`/${locale}/patterns`)}">${asset.title.fa}</a></p>` : ""}
      ${body?.priceFa || body?.priceEn ? `<p><b>${locale === "fa" ? "قیمت پیشنهادی" : "Proposed price"}:</b> ${body.priceFa ?? 0} تومان · $${body.priceEn ?? 0}</p>` : ""}
      <p style="white-space:pre-wrap">${(body?.message ?? "").slice(0, 2000)}</p>
    </div>`,
  });

  /* Acknowledge the applicant too — people trust the flow more when it answers. */
  await queueMessage({
    to: email,
    subject: locale === "fa" ? "درخواست شما دریافت شد — رزی آتلیه" : "We received your request — Rosie Atelier",
    kind: "test",
    html: `<div style="font-family:Tahoma,sans-serif;line-height:1.9" dir="rtl">
      <p>${name} عزیز، درخواست شما دریافت شد و کارشناسان رزی آتلیه حداکثر تا ۴۸ ساعت آینده پاسخ می‌دهند.</p>
      <p>اگر اثر آماده ارسال است، از طریق پنل هنرمند می‌توانید فایل مادر را آپلود کنید.</p>
    </div>`,
  });

  return json({ ok: true, received: true, user: Boolean(await getSession()) });
}
