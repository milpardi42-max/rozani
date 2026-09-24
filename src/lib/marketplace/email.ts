import "server-only";
import { EMAIL_LINK_TTL_S, absoluteUrl, mailProvider, siteUrl } from "./config";
import { KEYS, mutateCollection, readCollection } from "./store";
import { newId } from "./assets";
import { signObjectToken } from "./storage";
import { toPersianDigits } from "./pdf/text";
import { assetColourways, assetDeliverables } from "./colourways";
import { formatLabel } from "./formats";
import type { Localized } from "@/lib/i18n/types";
import type { License, MarketplaceOrder, OutboxMessage, Payout } from "./types";

/**
 * Transactional e-mail.
 *
 * Every message is written to an **outbox** first and then delivered through the
 * configured provider (Resend → SMTP → outbox-only). That has two benefits:
 *
 *   • the admin panel can show exactly what a buyer received — invaluable while
 *     the delivery links are being tested;
 *   • a provider outage never loses the receipt, and the same function can be
 *     replayed from the admin UI.
 *
 * Delivery links are signed tokens: `/{locale}/delivery/{token}` resolves to the
 * licensed file, expires with `EMAIL_LINK_TTL_S`, and (when the buyer has an
 * account) still binds to that account.
 */

/* ------------------------------------------------------------------ */
/* Outbox                                                              */
/* ------------------------------------------------------------------ */

export async function getOutbox(limit = 100): Promise<OutboxMessage[]> {
  const messages = await readCollection<OutboxMessage>(KEYS.outbox);
  return messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
}

async function persist(message: OutboxMessage): Promise<OutboxMessage> {
  await mutateCollection<OutboxMessage, void>(KEYS.outbox, (items) => {
    const index = items.findIndex((item) => item.id === message.id);
    if (index === -1) return { next: [...items, message], result: undefined };
    const copy = items.slice();
    copy[index] = message;
    return { next: copy, result: undefined };
  });
  return message;
}

export interface QueueMessageInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind: OutboxMessage["kind"];
  meta?: Record<string, string>;
  /** Skip provider delivery (used by tests / dry runs). */
  dryRun?: boolean;
}

export async function queueMessage(input: QueueMessageInput): Promise<OutboxMessage> {
  const provider = mailProvider();
  const message: OutboxMessage = {
    id: newId("msg"),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text ?? stripHtml(input.html),
    kind: input.kind,
    status: "queued",
    provider: provider === "outbox" ? "outbox" : provider,
    createdAt: new Date().toISOString(),
    meta: input.meta,
  };
  await persist(message);
  if (input.dryRun) return message;

  const delivered = await deliver(message);
  return persist(delivered);
}

async function deliver(message: OutboxMessage): Promise<OutboxMessage> {
  const provider = mailProvider();

  if (provider === "outbox") {
    // No provider configured: the message stays in the outbox for the admin to read.
    return { ...message, status: "logged", sentAt: new Date().toISOString() };
  }

  try {
    if (provider === "resend") {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.MARKETPLACE_EMAIL_FROM ?? "Rosie Atelier <no-reply@rosie-atelier.ir>",
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      if (!response.ok) throw new Error(`resend_${response.status}:${(await response.text()).slice(0, 200)}`);
      return { ...message, status: "sent", sentAt: new Date().toISOString() };
    }

    /* ---------- SMTP (optional dependency, loaded at runtime) ---------- */
    const moduleName = "nodemailer";
    const nodemailerAvailable = await import(/* webpackIgnore: true */ moduleName).catch(() => null);
    if (!nodemailerAvailable) throw new Error("smtp_requires_nodemailer");
    const transporter = nodemailerAvailable.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "1",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.MARKETPLACE_EMAIL_FROM ?? process.env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { ...message, status: "sent", sentAt: new Date().toISOString() };
  } catch (error) {
    return { ...message, status: "failed", error: String(error).slice(0, 300) };
  }
}

/** Admin action: retry a queued/failed message. */
export async function retryMessage(id: string): Promise<OutboxMessage | null> {
  const messages = await readCollection<OutboxMessage>(KEYS.outbox);
  const message = messages.find((item) => item.id === id);
  if (!message) return null;
  return persist(await deliver({ ...message, status: "queued", error: undefined }));
}

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

const BRAND = "#b5713a";
const INK = "#0f172a";

function shell(title: string, body: string, footer?: string, dir: "rtl" | "ltr" = "rtl") {
  return `<!doctype html>
<html dir="${dir}" lang="${dir === "rtl" ? "fa" : "en"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"</head>
<body style="margin:0;background:#f6f7f9;font-family:${dir === "rtl" ? "Tahoma, 'IranSans', sans-serif" : "Helvetica, Arial, sans-serif"};color:${INK}">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e6e9ef">
      <div style="background:${INK};padding:22px 28px">
        <p style="margin:0;color:#fff;font-size:18px;font-weight:700">Rosie Atelier · رزی آتلیه</p>
        <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:12px">${title}</p>
      </div>
      <div style="padding:26px 28px;line-height:1.9;font-size:14px">${body}</div>
      <div style="background:#faf7f3;padding:16px 28px;font-size:11px;color:#667085;border-top:1px solid #efe7dd">
        ${footer ?? `Rosie Atelier · <a href="${siteUrl()}" style="color:${BRAND}">${siteUrl().replace(/^https?:\/\//, "")}</a>`}
      </div>
    </div>
  </div>
</body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:22px 0"><a href="${href}" style="background:${BRAND};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${label}</a></p>`;
}

const faNum = (value: number | string) => toPersianDigits(String(value));

function money(price: { fa: number; en: number }, locale: "fa" | "en") {
  if (locale === "fa" && price.fa > 0) return `${faNum(price.fa.toLocaleString("en-US"))} تومان`;
  if (price.en > 0) return `$${price.en.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${faNum(price.fa.toLocaleString("en-US"))} تومان`;
}

/* ------------------------------------------------------------------ */
/* Delivery links                                                      */
/* ------------------------------------------------------------------ */

export interface DeliveryLink {
  licenseId: string;
  assetTitle: Localized;
  url: string;
  bytes?: number;
}

export function buildDeliveryLink(license: License, locale: "fa" | "en"): DeliveryLink {
  const token = signObjectToken({
    k: license.assetId, // resolved to the real object key at redemption time
    exp: Math.floor(Date.now() / 1000) + EMAIL_LINK_TTL_S,
    lic: license.id,
    uid: license.buyerUserId ?? undefined,
    fn: `${license.title.en || license.title.fa}`.replace(/[^\w.-]+/g, "_"),
    d: "attachment",
    src: "email",
  });
  return {
    licenseId: license.id,
    assetTitle: license.title,
    url: absoluteUrl(`/${locale}/delivery/${token}`),
  };
}

/* ------------------------------------------------------------------ */
/* Order delivery                                                      */
/* ------------------------------------------------------------------ */

export async function sendOrderDelivery(input: {
  order: MarketplaceOrder;
  licenses: License[];
  locale?: "fa" | "en";
}): Promise<string[]> {
  const { order, licenses } = input;
  const locale = input.locale ?? (order.charge.currency === "USD" ? "en" : "fa");
  const sent: string[] = [];
  if (!licenses.length) return sent;

  const links = licenses.map((license) => ({ license, link: buildDeliveryLink(license, locale) }));

  /* Tell the buyer exactly what is inside the box: formats and colour versions. */
  const { getAssets } = await import("./assets");
  const assetIndex = new Map((await getAssets()).map((asset) => [asset.id, asset]));

  const contents = (licenseId: string): string => {
    const asset = assetIndex.get(licenses.find((item) => item.id === licenseId)?.assetId ?? "");
    if (!asset) return "";
    const files = assetDeliverables(asset);
    if (!files.length) return "";
    const formats = [...new Set(files.map((item) => item.formatId))].map((id) => formatLabel(id, locale)).join(" · ");
    const colours = assetColourways(asset).filter((colourway) => colourway.files.length).length;
    return locale === "fa"
      ? `فرمت‌های تحویل: ${formats}${colours > 1 ? ` · ${toPersianDigits(String(colours))} رنگ` : ""} (همه در پنل کاربری قابل دانلود است)`
      : `Delivered formats: ${formats}${colours > 1 ? ` · ${colours} colours` : ""} (all downloadable from your account)`;
  };

  const rows = links
    .map(
      ({ license, link }) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eef1f5">
          <p style="margin:0;font-weight:700">${locale === "fa" ? license.title.fa : license.title.en}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#667085">
            ${locale === "fa" ? "شماره گواهی" : "Certificate"}: ${license.serial} ·
            ${locale === "fa" ? "لایسنس" : "License"}: ${license.licenseKind}
          </p>
          ${contents(license.id) ? `<p style="margin:4px 0 0;font-size:12px;color:#667085">${contents(license.id)}</p>` : ""}
          <p style="margin:8px 0 0"><a href="${link.url}" style="color:${BRAND};font-weight:600">${
            locale === "fa" ? "دانلود فایل" : "Download file"
          }</a></p>
        </td>
      </tr>`,
    )
    .join("");

  const buyerHtml = shell(
    locale === "fa" ? "تحویل سفارش دیجیتال" : "Your digital delivery",
    locale === "fa"
      ? `<p>${order.buyer.name} عزیز، پرداخت سفارش شما با موفقیت انجام شد.</p>
         <p style="font-size:12px;color:#667085">شماره سفارش: <b>${order.id}</b> · مبلغ: <b>${money(order.total, locale)}</b></p>
         <table style="width:100%;border-collapse:collapse">${rows}</table>
         ${button(absoluteUrl(`/${locale}/account`), "مشاهده گواهی‌ها و دانلودها")}
         <p style="font-size:12px;color:#667085">لینک‌های دانلود تا ${
           Math.round(EMAIL_LINK_TTL_S / 86400)
         } روز اعتبار دارند. گواهی لایسنس PDF نیز در پنل کاربری شما قابل دریافت است.</p>`
      : `<p>Dear ${order.buyer.name}, your payment was completed successfully.</p>
         <p style="font-size:12px;color:#667085">Order: <b>${order.id}</b> · Total: <b>${money(order.total, locale)}</b></p>
         <table style="width:100%;border-collapse:collapse">${rows}</table>
         ${button(absoluteUrl(`/${locale}/account`), "Open my licenses & downloads")}
         <p style="font-size:12px;color:#667085">Download links stay valid for ${Math.round(
           EMAIL_LINK_TTL_S / 86400,
         )} days. Your PDF license certificates are available in your account.</p>`,
  );

  const receipt = await queueMessage({
    to: order.buyer.email,
    subject: locale === "fa" ? `تحویل سفارش ${order.id} — رزی آتلیه` : `Your download is ready — order ${order.id}`,
    html: buyerHtml,
    kind: "delivery",
    meta: { orderId: order.id, licenses: String(licenses.length) },
  });
  sent.push(receipt.id);

  /* ---------- artist sale notices ---------- */
  if (process.env.MARKETPLACE_NOTIFY_ARTISTS !== "0") {
    const byArtist = new Map<string, License[]>();
    for (const license of licenses) {
      if (!license.artistId) continue;
      byArtist.set(license.artistId, [...(byArtist.get(license.artistId) ?? []), license]);
    }
    const { getAssets } = await import("./assets");
    const { findUserById } = await import("@/lib/data/users").catch(() => ({ findUserById: null }));

    for (const [artistId, artistLicenses] of byArtist) {
      /* Resolve the artist's account e-mail from the owning asset; fall back to
         the platform-wide notice address for unattributed works. */
      const ownerUserId = (await getAssets()).find((asset) => asset.artistId === artistId)?.ownerUserId ?? null;
      const owner = findUserById && ownerUserId ? await findUserById(ownerUserId).catch(() => null) : null;
      const to = owner?.email ?? process.env.MARKETPLACE_ARTIST_NOTIFY_EMAIL;
      if (!to) continue;

      const total = artistLicenses.reduce(
        (acc, license) => ({ fa: acc.fa + license.royalty.amount.fa, en: acc.en + license.royalty.amount.en }),
        { fa: 0, en: 0 },
      );
      const html = shell(
        "فروش جدید / New sale",
        `<p>یک لایسنس از آثار شما فروخته شد.</p>
         <ul style="padding-inline-start:18px">${artistLicenses
           .map((license) => `<li>${license.title.fa} — ${license.serial} (${license.licenseKind})</li>`)
           .join("")}</ul>
         <p>سهم شما از این فروش: <b>${money(total, "fa")}</b></p>
         ${button(absoluteUrl("/fa/artist?tab=royalty"), "مشاهده کیف پول و تسویه")}`,
      );
      const message = await queueMessage({
        to,
        subject: `فروش جدید در رزی آتلیه — ${artistLicenses.length} لایسنس`,
        html,
        kind: "sale-notice",
        meta: { artistId, orderId: order.id },
      });
      sent.push(message.id);
    }
  }

  return sent;
}

export async function sendSubscriptionReceipt(input: {
  order: MarketplaceOrder;
  planTitle: Localized;
  periodEnd: string;
  locale?: "fa" | "en";
}): Promise<string> {
  const locale = input.locale ?? "fa";
  const html = shell(
    locale === "fa" ? "فعال‌سازی اشتراک" : "Subscription activated",
    locale === "fa"
      ? `<p>اشتراک «${input.planTitle.fa}» فعال شد.</p>
         <p style="font-size:12px;color:#667085">معتبر تا: ${new Date(input.periodEnd).toLocaleDateString("fa-IR")} · مبلغ: ${money(
           input.order.total,
           locale,
         )}</p>
         ${button(absoluteUrl("/fa/subscriptions"), "مدیریت اشتراک")}`
      : `<p>Your “${input.planTitle.en}” pass is active.</p>
         <p style="font-size:12px;color:#667085">Valid until ${new Date(input.periodEnd).toDateString()} · Paid ${money(
           input.order.total,
           locale,
         )}</p>
         ${button(absoluteUrl("/en/subscriptions"), "Manage subscription")}`,
  );
  const message = await queueMessage({
    to: input.order.buyer.email,
    subject: locale === "fa" ? "اشتراک دانلود شما فعال شد" : "Your download pass is active",
    html,
    kind: "subscription",
    meta: { orderId: input.order.id },
  });
  return message.id;
}

/* ------------------------------------------------------------------ */
/* Payouts & admin notifications                                       */
/* ------------------------------------------------------------------ */

export async function sendPayoutNotice(input: { payout: Payout; to: string; artistName: string; locale?: "fa" | "en" }): Promise<string> {
  const locale = input.locale ?? "fa";
  const statusLabel = {
    requested: locale === "fa" ? "ثبت شد" : "requested",
    approved: locale === "fa" ? "تأیید شد" : "approved",
    paid: locale === "fa" ? "پرداخت شد" : "paid",
    rejected: locale === "fa" ? "رد شد" : "rejected",
  }[input.payout.status];

  const html = shell(
    locale === "fa" ? "وضعیت تسویه" : "Payout status",
    locale === "fa"
      ? `<p>درخواست تسویه شما ${statusLabel}.</p>
         <p style="font-size:13px">مبلغ: <b>${money(input.payout.amount, locale)}</b><br>
         روش: ${input.payout.method}<br>مقصد: <span dir="ltr">${input.payout.destination}</span>
         ${input.payout.reference ? `<br>کد پیگیری: <span dir="ltr">${input.payout.reference}</span>` : ""}</p>
         ${input.payout.note ? `<p style="color:#667085;font-size:12px">${input.payout.note}</p>` : ""}`
      : `<p>Your payout request is ${statusLabel}.</p>
         <p style="font-size:13px">Amount: <b>${money(input.payout.amount, locale)}</b><br>
         Method: ${input.payout.method}<br>Destination: <span dir="ltr">${input.payout.destination}</span>
         ${input.payout.reference ? `<br>Reference: <span dir="ltr">${input.payout.reference}</span>` : ""}</p>`,
  );

  const message = await queueMessage({
    to: input.to,
    subject: locale === "fa" ? `تسویه ${statusLabel} — رزی آتلیه` : `Payout ${statusLabel} — Rosie Atelier`,
    html,
    kind: "payout",
    meta: { payoutId: input.payout.id },
  });
  return message.id;
}

export async function sendReviewNotice(input: {
  to: string;
  assetTitle: Localized;
  status: "approved" | "rejected";
  note?: string;
  locale?: "fa" | "en";
}): Promise<string> {
  const locale = input.locale ?? "fa";
  const html = shell(
    locale === "fa" ? "نتیجه بازبینی اثر" : "Review result",
    input.status === "approved"
      ? locale === "fa"
        ? `<p>اثر «${input.assetTitle.fa}» تأیید شد و اکنون در فروشگاه قابل مشاهده است.</p>
           ${button(absoluteUrl("/fa/artist"), "داشبورد هنرمند")}`
        : `<p>“${input.assetTitle.en}” was approved and is now live in the shop.</p>`
      : locale === "fa"
        ? `<p>اثر «${input.assetTitle.fa}» رد شد.</p>${input.note ? `<p style="color:#b42318">${input.note}</p>` : ""}`
        : `<p>“${input.assetTitle.en}” was rejected.</p>${input.note ? `<p style="color:#b42318">${input.note}</p>` : ""}`,
  );
  const message = await queueMessage({
    to: input.to,
    subject: locale === "fa" ? `بازبینی اثر: ${input.status === "approved" ? "تأیید" : "رد"}` : `Review: ${input.status}`,
    html,
    kind: "review",
  });
  return message.id;
}

export async function sendTestEmail(to: string): Promise<string> {
  const message = await queueMessage({
    to,
    subject: "رزی آتلیه — ایمیل آزمایشی / test email",
    html: shell(
      "تست ایمیل / e-mail test",
      `<p>این یک ایمیل آزمایشی از سیستم فروشگاه رزی آتلیه است.</p>
       <p style="font-size:12px;color:#667085">Provider: ${mailProvider()} · ${new Date().toISOString()}</p>`,
    ),
    kind: "test",
  });
  return message.id;
}
