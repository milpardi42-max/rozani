"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AtSign,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Palette,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  User,
  UserCheck,
  Users,
  X,
  XCircle,
  Ban,
} from "lucide-react";
import { familyName } from "@/lib/data/families";
import type { PublicUser } from "@/lib/data/users";
import type { Artist, Pattern, SiteContent } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────
   Types & Helpers
   ────────────────────────────────────────────────────────────── */
type ArtistStatus = "pending" | "approved" | "rejected";
type ViewTab = "all" | ArtistStatus | "registered"; // "registered" = has userId

interface ArtistRow {
  artist: Artist;
  user: PublicUser | undefined;
  patterns: Pattern[];
  status: ArtistStatus;
}

function fmtDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-rose-100 text-rose-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-cyan-100 text-cyan-700",
    "bg-orange-100 text-orange-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length]!;
}

function t(loc: { fa: string; en: string } | undefined) {
  return loc?.fa ?? loc?.en ?? "";
}

/* ──────────────────────────────────────────────────────────────
   PDF Export
   ────────────────────────────────────────────────────────────── */
function exportPDF(rows: ArtistRow[], title: string) {
  const statusLabel = (s: ArtistStatus) =>
    s === "approved" ? "تأیید شده" : s === "rejected" ? "رد شده" : "در انتظار";

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
    *{box-sizing:border-box}body{font-family:'Vazirmatn',Tahoma,sans-serif;margin:32px;color:#111}
    h1{font-size:20px;margin-bottom:4px}p{font-size:13px;color:#6b7280;margin:0 0 20px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#7c3aed;color:#fff;padding:10px 12px;border:1px solid #7c3aed;text-align:right}
    td{padding:8px 12px;border:1px solid #e5e7eb;color:#374151}
    tr:nth-child(even) td{background:#f9fafb}
    tfoot td{background:#f3f4f6;font-weight:600}
    .badge-ok{color:#059669}.badge-wait{color:#d97706}.badge-no{color:#dc2626}
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>تاریخ: ${new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short" }).format(new Date())} · تعداد: ${rows.length}</p>
  <table>
    <thead><tr><th>#</th><th>نام</th><th>تخصص</th><th>شهر</th><th>اینستاگرام</th><th>پترن‌ها</th><th>امتیاز</th><th>وضعیت</th><th>کاربر ثبت‌شده</th></tr></thead>
    <tbody>
      ${rows
        .map(
          (r, i) => `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:500;color:#111">${t(r.artist.name)}</td>
        <td>${t(r.artist.profession)}</td>
        <td>${r.artist.signupCity ?? t(r.artist.location) ?? "—"}</td>
        <td dir="ltr">${r.artist.social?.instagram ? "@" + r.artist.social.instagram : "—"}</td>
        <td>${r.patterns.length}</td>
        <td>${r.artist.rating > 0 ? r.artist.rating.toFixed(1) : "—"}</td>
        <td class="${r.status === "approved" ? "badge-ok" : r.status === "rejected" ? "badge-no" : "badge-wait"}">${statusLabel(r.status)}</td>
        <td>${r.user ? r.user.email : "—"}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
    <tfoot><tr><td colspan="9">جمع: ${rows.length} هنرمند</td></tr></tfoot>
  </table>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

/* ──────────────────────────────────────────────────────────────
   Status Badge
   ────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: ArtistStatus }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        تأیید شده
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
        <XCircle className="h-3 w-3" />
        رد شده
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      در انتظار
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   Stats Bar
   ────────────────────────────────────────────────────────────── */
function StatsBar({ rows }: { rows: ArtistRow[] }) {
  const total = rows.length;
  const registered = rows.filter((r) => !!r.user).length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const pending = rows.filter((r) => r.status === "pending").length;

  const stats = [
    { label: "کل هنرمندان", value: total, icon: <Palette className="h-4 w-4" />, bg: "bg-purple-50", color: "text-purple-700" },
    { label: "پروفایل ثبت‌شده", value: registered, icon: <UserCheck className="h-4 w-4" />, bg: "bg-sky-50", color: "text-sky-700" },
    { label: "تأیید شده", value: approved, icon: <CheckCircle2 className="h-4 w-4" />, bg: "bg-emerald-50", color: "text-emerald-700" },
    { label: "در انتظار تأیید", value: pending, icon: <Clock className="h-4 w-4" />, bg: "bg-amber-50", color: "text-amber-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex items-center gap-3 rounded-xl border border-gray-100 ${s.bg} px-4 py-3`}
        >
          <span className={s.color}>{s.icon}</span>
          <div>
            <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Detail Drawer
   ────────────────────────────────────────────────────────────── */
interface DrawerProps {
  row: ArtistRow;
  locale: string;
  onClose: () => void;
  onStatusChange: (artistId: string, status: ArtistStatus, note?: string) => Promise<void>;
  onFeatureToggle: (artistId: string, featured: boolean) => Promise<void>;
  onDelete: (artistId: string, userId?: string) => Promise<void>;
  actionLoading: boolean;
}

function ArtistDetailDrawer({
  row,
  locale,
  onClose,
  onStatusChange,
  onFeatureToggle,
  onDelete,
  actionLoading,
}: DrawerProps) {
  const { artist, user, patterns, status } = row;
  const [rejectNote, setRejectNote] = useState(artist.rejectionNote ?? "");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const avatarClass = avatarColor(t(artist.name));
  const profileUrl = `/${locale}/artists/${artist.slug}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex w-full max-w-md max-h-[92vh] flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white rounded-t-2xl px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-800">پرونده هنرمند</h2>
          <div className="flex items-center gap-2">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 items-center gap-1 rounded-lg border border-gray-200 px-2.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              مشاهده پروفایل
            </a>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-5">
          {/* Identity */}
          <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            {artist.avatar && !artist.avatar.includes("placeholder") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.avatar}
                alt={t(artist.name)}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${avatarClass}`}
              >
                {initials(t(artist.name))}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900">{t(artist.name)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t(artist.profession)}</p>
                </div>
                <StatusBadge status={status} />
              </div>
              {/* Location */}
              {(artist.signupCity ?? t(artist.location)) && (
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="h-3 w-3" />
                  {artist.signupCity ?? t(artist.location)}
                </p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "پترن‌ها", value: patterns.length, icon: <Palette className="h-3.5 w-3.5" /> },
              { label: "دنبال‌کننده", value: artist.followers.toLocaleString("fa-IR"), icon: <Users className="h-3.5 w-3.5" /> },
              { label: "امتیاز", value: artist.rating > 0 ? artist.rating.toFixed(1) : "—", icon: <Star className="h-3.5 w-3.5" /> },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">{s.icon}</div>
                <p className="text-sm font-bold text-gray-800">{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Linked user account */}
          {user ? (
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                <UserCheck className="h-3.5 w-3.5" />
                حساب کاربری مرتبط
              </p>
              <p className="text-sm font-medium text-sky-900">{user.name}</p>
              <p className="text-xs text-sky-600 mt-0.5" dir="ltr">{user.email}</p>
              <p className="mt-1.5 text-[11px] text-sky-400">عضو از {fmtDate(user.createdAt)}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <User className="h-3.5 w-3.5" />
                هنرمند بدون حساب کاربری ثبت‌شده (محتوای اولیه سایت)
              </p>
            </div>
          )}

          {/* Seller application (what the designer declared at registration) */}
          {(artist.signupSpecialty ||
            artist.signupStudio ||
            artist.signupExperience ||
            (artist.signupFormats && artist.signupFormats.length > 0) ||
            (artist.signupFamilies && artist.signupFamilies.length > 0)) && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                <Palette className="h-3.5 w-3.5" />
                پرونده‌ی فروشندگی (ثبت‌نام)
              </p>
              <dl className="space-y-1.5 text-xs">
                {artist.signupStudio && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-violet-500">استودیو / برند</dt>
                    <dd className="font-medium text-violet-900">{artist.signupStudio}</dd>
                  </div>
                )}
                {artist.signupSpecialty && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-violet-500">حوزه‌ی فعالیت</dt>
                    <dd className="font-medium text-violet-900">{artist.signupSpecialty}</dd>
                  </div>
                )}
                {artist.signupExperience && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-violet-500">سابقه‌ی کار</dt>
                    <dd className="font-medium text-violet-900" dir="ltr">{artist.signupExperience}</dd>
                  </div>
                )}
                {artist.signupFormats && artist.signupFormats.length > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-violet-500">فرمت‌های اعلام‌شده</dt>
                    <dd className="font-medium text-violet-900" dir="ltr">{artist.signupFormats.join(" · ")}</dd>
                  </div>
                )}
                {artist.signupFamilies && artist.signupFamilies.length > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt className="shrink-0 text-violet-500">دسته‌های کاری</dt>
                    <dd className="text-end font-medium text-violet-900">
                      {artist.signupFamilies.map((id) => familyName(id, "fa")).join("، ")}
                    </dd>
                  </div>
                )}
                {artist.signupTermsAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-violet-500">پذیرش شرایط</dt>
                    <dd className="font-medium text-violet-900">{fmtDate(artist.signupTermsAt)}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Social */}
          {(artist.social?.instagram || artist.social?.behance || artist.social?.website || artist.signupPortfolioUrl) && (
            <div className="space-y-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">لینک‌ها</p>
              {artist.social?.instagram && (
                <a
                  href={`https://instagram.com/${artist.social.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 group"
                >
                  <AtSign className="h-4 w-4 text-pink-500" />
                  <span dir="ltr">@{artist.social.instagram}</span>
                  <ExternalLink className="mr-auto h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
                </a>
              )}
              {(artist.social?.website || artist.signupPortfolioUrl) && (
                <a
                  href={artist.social?.website ?? artist.signupPortfolioUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 group"
                >
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span dir="ltr" className="truncate max-w-[220px]">
                    {artist.social?.website ?? artist.signupPortfolioUrl}
                  </span>
                  <ExternalLink className="mr-auto h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
                </a>
              )}
            </div>
          )}

          {/* Tags */}
          {artist.tags && artist.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {artist.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Rejection note */}
          {status === "rejected" && artist.rejectionNote && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="mb-1 text-xs font-semibold text-rose-700">دلیل رد:</p>
              <p className="text-sm text-rose-800">{artist.rejectionNote}</p>
            </div>
          )}

          {/* Revenue / License */}
          <div className="space-y-1 rounded-xl border border-gray-100 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">قرارداد</p>
            {artist.revenueSharePct !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">سهم درآمد</span>
                <span className="font-semibold text-gray-800">{artist.revenueSharePct}٪</span>
              </div>
            )}
            {artist.licenseType && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">نوع لایسنس</span>
                <span className="font-semibold text-gray-800">
                  {artist.licenseType === "standard" ? "استاندارد" : artist.licenseType === "exclusive" ? "انحصاری" : "سفارشی"}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Featured toggle */}
          <button
            onClick={() => void onFeatureToggle(artist.id, !artist.featured)}
            disabled={actionLoading}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              artist.featured
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Star className="h-4 w-4" />
            {artist.featured ? "حذف از منتخب‌ها" : "افزودن به منتخب‌ها"}
          </button>

          {/* Approve / Reject */}
          <div className="space-y-2 border-t border-gray-100 pt-3">
            {(status === "pending" || status === "rejected") && (
              <button
                onClick={() => void onStatusChange(artist.id, "approved")}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                تأیید هنرمند
              </button>
            )}

            {(status === "pending" || status === "approved") && (
              <>
                {!showRejectForm ? (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                  >
                    <Ban className="h-4 w-4" />
                    رد هنرمند
                  </button>
                ) : (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-rose-800">
                      <MessageSquare className="h-4 w-4" />
                      دلیل رد (اختیاری)
                    </div>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="مثلاً: پورتفولیو کافی ارائه نشده است."
                      rows={3}
                      className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                      dir="rtl"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => void onStatusChange(artist.id, "rejected", rejectNote)}
                        disabled={actionLoading}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        ثبت رد
                      </button>
                      <button
                        onClick={() => setShowRejectForm(false)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs text-rose-600 hover:bg-rose-50"
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Delete */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف هنرمند
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-red-800">این عملیات قابل بازگشت نیست.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void onDelete(artist.id, user?.id)}
                    disabled={actionLoading}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    تأیید حذف
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    انصراف
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Artist Card
   ────────────────────────────────────────────────────────────── */
function ArtistCard({
  row,
  onSelect,
  onStatusChange,
  onFeatureToggle,
  actionLoadingId,
}: {
  row: ArtistRow;
  onSelect: () => void;
  onStatusChange: (id: string, s: ArtistStatus) => Promise<void>;
  onFeatureToggle: (id: string, featured: boolean) => Promise<void>;
  actionLoadingId: string | null;
}) {
  const { artist, user, patterns, status } = row;
  const isLoading = actionLoadingId === artist.id;
  const avatarClass = avatarColor(t(artist.name));
  const hasRealAvatar = artist.avatar && !artist.avatar.includes("placeholder");

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-4 hover:border-purple-200 hover:shadow-md hover:shadow-purple-50 transition-all cursor-pointer"
      onClick={onSelect}
    >
      {/* Status ribbon */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <StatusBadge status={status} />
        {user && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-600 ring-1 ring-sky-200">
            <UserCheck className="h-2.5 w-2.5" />
            ثبت‌شده
          </span>
        )}
      </div>

      {/* Featured star */}
      {artist.featured && (
        <div className="absolute top-3 right-3">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
        </div>
      )}

      {/* Avatar */}
      <div className="mx-auto mb-3 mt-8">
        {hasRealAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.avatar}
            alt={t(artist.name)}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold ${avatarClass}`}
          >
            {initials(t(artist.name))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-center mb-3">
        <p className="font-semibold text-gray-900 leading-snug">{t(artist.name)}</p>
        <p className="mt-0.5 text-xs text-gray-500 leading-snug">{t(artist.profession)}</p>
        {(artist.signupCity ?? t(artist.location)) && (
          <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-gray-400">
            <MapPin className="h-3 w-3" />
            {artist.signupCity ?? t(artist.location)}
          </p>
        )}
      </div>

      {/* Micro stats */}
      <div className="mb-3 flex items-center justify-center gap-3 text-[11px] text-gray-400">
        <span className="flex items-center gap-0.5">
          <Palette className="h-3 w-3" />
          {patterns.length} پترن
        </span>
        {artist.rating > 0 && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {artist.rating.toFixed(1)}
          </span>
        )}
        {artist.followers > 0 && (
          <span className="flex items-center gap-0.5">
            <Users className="h-3 w-3" />
            {artist.followers > 999 ? `${(artist.followers / 1000).toFixed(1)}k` : artist.followers}
          </span>
        )}
      </div>

      {/* Social pills */}
      <div className="mb-3 flex items-center justify-center gap-1.5">
        {artist.social?.instagram && (
          <a
            href={`https://instagram.com/${artist.social.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-50 text-pink-500 hover:bg-pink-100"
          >
            <AtSign className="h-3 w-3" />
          </a>
        )}
        {(artist.social?.website ?? artist.signupPortfolioUrl) && (
          <a
            href={artist.social?.website ?? artist.signupPortfolioUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
          >
            <Globe className="h-3 w-3" />
          </a>
        )}
        {artist.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] text-purple-600">
            {tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div
        className="mt-auto flex gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        {(status === "pending" || status === "rejected") && (
          <button
            onClick={() => void onStatusChange(artist.id, "approved")}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            تأیید
          </button>
        )}
        {(status === "pending" || status === "approved") && (
          <button
            onClick={() => void onStatusChange(artist.id, "rejected")}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-50 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            رد
          </button>
        )}
        <button
          onClick={() => void onFeatureToggle(artist.id, !artist.featured)}
          disabled={isLoading}
          className={`flex h-7 w-7 items-center justify-center rounded-xl border transition-colors disabled:opacity-50 ${
            artist.featured
              ? "border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100"
              : "border-gray-200 text-gray-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-500"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${artist.featured ? "fill-amber-400 text-amber-400" : ""}`} />
        </button>
        <button
          onClick={onSelect}
          className="flex h-7 w-7 items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Main Export
   ────────────────────────────────────────────────────────────── */
export interface ArtistsManagerProps {
  data: SiteContent;
  update: (patch: Partial<SiteContent>) => void;
  locale?: string;
}

export function ArtistsManager({ data, update, locale = "fa" }: ArtistsManagerProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ViewTab>("all");
  const [selected, setSelected] = useState<ArtistRow | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* Load users once */
  const loadUsers = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/users", { credentials: "include", cache: "no-store", signal: ac.signal });
      if (!r.ok) throw new Error("fetch_failed");
      const j = (await r.json()) as { ok: boolean; users: PublicUser[] };
      setUsers(j.users ?? []);
      setUsersLoaded(true);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("دریافت کاربران با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    return () => abortRef.current?.abort();
  }, [loadUsers]);

  /* Build merged rows: every artist in SiteContent + linked user if any */
  const allRows: ArtistRow[] = data.artists.map((artist) => {
    const user = users.find((u) => u.id === artist.userId);
    const patterns = data.patterns.filter((p) => p.artistId === artist.id);
    const status: ArtistStatus = artist.status ?? "approved";
    return { artist, user, patterns, status };
  });

  /* Tabs */
  const TABS: { key: ViewTab; label: string; count: number }[] = [
    { key: "all", label: "همه", count: allRows.length },
    { key: "registered", label: "پروفایل ثبت‌شده", count: allRows.filter((r) => !!r.user).length },
    { key: "approved", label: "تأیید شده", count: allRows.filter((r) => r.status === "approved").length },
    { key: "pending", label: "در انتظار", count: allRows.filter((r) => r.status === "pending").length },
    { key: "rejected", label: "رد شده", count: allRows.filter((r) => r.status === "rejected").length },
  ];

  const filtered = allRows
    .filter((r) => {
      if (tab === "registered") return !!r.user;
      if (tab === "all") return true;
      return r.status === tab;
    })
    .filter((r) => {
      const q = query.toLowerCase();
      return (
        t(r.artist.name).toLowerCase().includes(q) ||
        t(r.artist.profession).toLowerCase().includes(q) ||
        (r.artist.signupCity ?? t(r.artist.location) ?? "").toLowerCase().includes(q) ||
        (r.user?.email ?? "").toLowerCase().includes(q) ||
        (r.artist.social?.instagram ?? "").toLowerCase().includes(q) ||
        (r.artist.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      );
    });

  const ORDER: Record<ArtistStatus, number> = { pending: 0, approved: 1, rejected: 2 };
  const sorted = [...filtered].sort((a, b) => {
    // Registered artists first
    const regDiff = (b.user ? 1 : 0) - (a.user ? 1 : 0);
    if (regDiff !== 0) return regDiff;
    const d = ORDER[a.status] - ORDER[b.status];
    if (d !== 0) return d;
    return 0;
  });

  const pendingCount = allRows.filter((r) => r.status === "pending").length;

  /* Actions */
  async function handleStatusChange(artistId: string, status: ArtistStatus, note?: string) {
    setActionLoadingId(artistId);
    try {
      const res = await fetch("/api/admin/artists", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: artistId, status, ...(note !== undefined ? { rejectionNote: note || undefined } : {}) }),
      });
      if (!res.ok) throw new Error();
      const updatedArtists = data.artists.map((a) =>
        a.id === artistId ? { ...a, status, ...(note !== undefined ? { rejectionNote: note || undefined } : {}) } : a,
      );
      update({ artists: updatedArtists });
      if (selected?.artist.id === artistId) {
        setSelected((s) =>
          s ? { ...s, status, artist: { ...s.artist, status, ...(note !== undefined ? { rejectionNote: note || undefined } : {}) } } : s,
        );
      }
    } catch {
      setError("عملیات با خطا مواجه شد.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleFeatureToggle(artistId: string, featured: boolean) {
    setActionLoadingId(artistId);
    try {
      const res = await fetch("/api/admin/artists", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: artistId, featured }),
      });
      if (!res.ok) throw new Error();
      const updatedArtists = data.artists.map((a) => (a.id === artistId ? { ...a, featured } : a));
      update({ artists: updatedArtists });
      if (selected?.artist.id === artistId) {
        setSelected((s) => (s ? { ...s, artist: { ...s.artist, featured } } : s));
      }
    } catch {
      setError("عملیات با خطا مواجه شد.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(artistId: string, userId?: string) {
    setActionLoadingId(artistId);
    try {
      await fetch(`/api/admin/artists?id=${artistId}`, { method: "DELETE", credentials: "include" });
      if (userId) {
        await fetch("/api/admin/users", {
          method: "DELETE",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: userId }),
        });
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
      update({ artists: data.artists.filter((a) => a.id !== artistId) });
      setSelected(null);
    } catch {
      setError("عملیات حذف با خطا مواجه شد.");
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">مدیریت هنرمندان</h1>
            <p className="text-xs text-gray-400">
              {loading
                ? "در حال بارگذاری…"
                : `${allRows.length} هنرمند · ${allRows.filter((r) => !!r.user).length} پروفایل ثبت‌شده${pendingCount > 0 ? ` · ${pendingCount} در انتظار تأیید` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadUsers()}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            بارگذاری
          </button>
          <button
            onClick={() => exportPDF(sorted, "لیست هنرمندان")}
            disabled={sorted.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-purple-600 px-3 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            خروجی PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      {usersLoaded && allRows.length > 0 && <StatsBar rows={allRows} />}

      {/* Pending alert */}
      {usersLoaded && pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCount} هنرمند</strong> منتظر بررسی و تأیید شما هستند.
          </p>
          <button
            onClick={() => setTab("pending")}
            className="mr-auto flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
          >
            مشاهده <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="mr-auto text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو بر اساس نام، تخصص، شهر، ایمیل، تگ…"
          className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          dir="rtl"
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        {TABS.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === tabItem.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tabItem.label}
            {tabItem.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === tabItem.key
                    ? tabItem.key === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : tabItem.key === "registered"
                      ? "bg-sky-100 text-sky-700"
                      : tabItem.key === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : tabItem.key === "rejected"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-purple-100 text-purple-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {tabItem.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && !usersLoaded && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-purple-400" />
        </div>
      )}

      {/* Grid */}
      {(usersLoaded || data.artists.length > 0) && (
        <>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
              <ImageIcon className="mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-400">
                {query ? "نتیجه‌ای پیدا نشد." : "هنرمندی در این دسته وجود ندارد."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sorted.map((row) => (
                <ArtistCard
                  key={row.artist.id}
                  row={row}
                  onSelect={() => setSelected(row)}
                  onStatusChange={handleStatusChange}
                  onFeatureToggle={handleFeatureToggle}
                  actionLoadingId={actionLoadingId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail Drawer */}
      {selected && (
        <ArtistDetailDrawer
          row={selected}
          locale={locale}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onFeatureToggle={handleFeatureToggle}
          onDelete={handleDelete}
          actionLoading={actionLoadingId !== null}
        />
      )}
    </div>
  );
}
