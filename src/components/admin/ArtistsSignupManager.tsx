"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Ban,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  AtSign,
  ExternalLink,
  Filter,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Palette,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { PublicUser } from "@/lib/data/users";
import type { Artist } from "@/lib/types";

/* ──────────────────────────────────────────────────────────────
   Types & Helpers
   ────────────────────────────────────────────────────────────── */
type ArtistStatus = "pending" | "approved" | "rejected";
type Tab = "all" | ArtistStatus;

interface ArtistRow {
  user: PublicUser;
  artist: Artist | undefined;
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

function fmtDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>تاریخ: ${new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short" }).format(new Date())} · تعداد: ${rows.length}</p>
  <table>
    <thead><tr><th>#</th><th>نام</th><th>ایمیل</th><th>تخصص</th><th>شهر</th><th>اینستاگرام</th><th>وضعیت</th><th>تاریخ ثبت‌نام</th></tr></thead>
    <tbody>
      ${rows.map((r, i) => `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:500;color:#111">${r.user.name}</td>
        <td dir="ltr">${r.user.email}</td>
        <td>${r.artist?.signupSpecialty ?? r.artist?.profession?.fa ?? "—"}</td>
        <td>${r.artist?.signupCity ?? "—"}</td>
        <td dir="ltr">${r.artist?.social?.instagram ? "@" + r.artist.social.instagram : "—"}</td>
        <td>${statusLabel(r.status)}</td>
        <td>${fmtDate(r.user.createdAt)}</td>
      </tr>`).join("")}
    </tbody>
    <tfoot><tr><td colspan="8">جمع: ${rows.length} هنرمند</td></tr></tfoot>
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        تأیید شده
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
        <XCircle className="h-3 w-3" />
        رد شده
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
      در انتظار
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   Artist Detail Drawer
   ────────────────────────────────────────────────────────────── */
interface DrawerProps {
  row: ArtistRow;
  onClose: () => void;
  onApprove: (artistId: string) => Promise<void>;
  onReject: (artistId: string, note: string) => Promise<void>;
  onDelete: (userId: string, artistId?: string) => Promise<void>;
  actionLoading: boolean;
}

function ArtistDetailDrawer({ row, onClose, onApprove, onReject, onDelete, actionLoading }: DrawerProps) {
  const { user, artist, status } = row;
  const [rejectNote, setRejectNote] = useState(artist?.rejectionNote ?? "");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const avatarClass = avatarColor(user.name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal panel */}
      <aside className="relative flex w-full max-w-md max-h-[92vh] flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white rounded-t-2xl px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-800">پرونده هنرمند</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 p-5">
          {/* Identity card */}
          <div className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${avatarClass}`}
            >
              {initials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{artist?.signupSpecialty ?? artist?.profession?.fa ?? "هنرمند / طراح"}</p>
              <div className="mt-2">
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">اطلاعات تماس</p>
            <InfoRow icon={<Mail className="h-4 w-4" />} label="ایمیل" value={user.email} dir="ltr" />
            {artist?.signupPhone && (
              <InfoRow icon={<Phone className="h-4 w-4" />} label="شماره تماس" value={artist.signupPhone} dir="ltr" />
            )}
            {(artist?.signupCity ?? artist?.location?.fa) ? (
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="شهر" value={artist?.signupCity ?? artist?.location?.fa ?? ""} />
            ) : null}
          </div>

          {/* Social & Portfolio */}
          {(artist?.social?.instagram || artist?.social?.website || artist?.signupPortfolioUrl) && (
            <div className="space-y-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">لینک‌ها</p>
              {artist?.social?.instagram && (
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
              {(artist?.social?.website || artist?.signupPortfolioUrl) && (
                <a
                  href={artist?.social?.website ?? artist?.signupPortfolioUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 group"
                >
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span dir="ltr" className="truncate max-w-[220px]">
                    {artist?.social?.website ?? artist?.signupPortfolioUrl}
                  </span>
                  <ExternalLink className="mr-auto h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500" />
                </a>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="space-y-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">اطلاعات سیستمی</p>
            <InfoRow icon={<User className="h-4 w-4" />} label="شناسه کاربر" value={user.id} dir="ltr" mono />
            {artist?.id && (
              <InfoRow icon={<Palette className="h-4 w-4" />} label="شناسه هنرمند" value={artist.id} dir="ltr" mono />
            )}
            <InfoRow icon={<Clock className="h-4 w-4" />} label="تاریخ ثبت‌نام" value={fmtDateTime(user.createdAt)} />
            {artist?.revenueSharePct !== undefined && (
              <InfoRow icon={<Star className="h-4 w-4" />} label="سهم درآمد" value={`${artist.revenueSharePct}٪`} />
            )}
          </div>

          {/* Rejection note if exists */}
          {status === "rejected" && artist?.rejectionNote && (
            <div className="rounded-lg border border-rose-100 bg-rose-50 p-3">
              <p className="mb-1 text-xs font-semibold text-rose-700">دلیل رد:</p>
              <p className="text-sm text-rose-800">{artist.rejectionNote}</p>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            {/* Approve */}
            {(status === "pending" || status === "rejected") && artist?.id && (
              <button
                onClick={() => void onApprove(artist.id)}
                disabled={actionLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                تأیید هنرمند
              </button>
            )}

            {/* Reject toggle */}
            {(status === "pending" || status === "approved") && artist?.id && (
              <>
                {!showRejectForm ? (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={actionLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                  >
                    <Ban className="h-4 w-4" />
                    رد درخواست
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
                        onClick={() => void onReject(artist.id, rejectNote)}
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
                حذف حساب کاربری
              </button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-red-800">این عملیات قابل بازگشت نیست.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void onDelete(user.id, artist?.id)}
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

function InfoRow({
  icon,
  label,
  value,
  dir,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 hover:bg-gray-50">
      <span className="shrink-0 text-gray-400">{icon}</span>
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span
        className={`mr-auto text-sm text-gray-700 truncate max-w-[220px] ${mono ? "font-mono text-xs" : ""}`}
        dir={dir}
      >
        {value}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Artist Card (Grid View)
   ────────────────────────────────────────────────────────────── */
function ArtistCard({
  row,
  onSelect,
  onApprove,
  onReject,
  actionLoading,
}: {
  row: ArtistRow;
  onSelect: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
  actionLoading: string | null;
}) {
  const { user, artist, status } = row;
  const isLoading = actionLoading === artist?.id;
  const avatarClass = avatarColor(user.name);

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 hover:border-purple-200 hover:shadow-md hover:shadow-purple-50 transition-all cursor-pointer"
      onClick={onSelect}
    >
      {/* Status ribbon */}
      <div className="absolute top-3 left-3">
        <StatusBadge status={status} />
      </div>

      {/* Avatar */}
      <div
        className={`mx-auto mb-3 mt-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold ${avatarClass}`}
      >
        {initials(user.name)}
      </div>

      {/* Info */}
      <div className="text-center mb-4">
        <p className="font-semibold text-gray-900">{user.name}</p>
        <p className="mt-0.5 text-xs text-gray-500">
          {artist?.signupSpecialty ?? artist?.profession?.fa ?? "هنرمند / طراح"}
        </p>
        {(artist?.signupCity || artist?.location?.fa) && (
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-gray-400">
            <MapPin className="h-3 w-3" />
            {artist?.signupCity ?? artist?.location?.fa}
          </p>
        )}
      </div>

      {/* Contact pill */}
      <p className="mb-4 truncate text-center text-xs text-gray-400" dir="ltr">
        {user.email}
      </p>

      {/* Social links */}
      <div className="mb-4 flex items-center justify-center gap-2">
        {artist?.social?.instagram && (
          <a
            href={`https://instagram.com/${artist.social.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-50 text-pink-500 hover:bg-pink-100"
          >
            <AtSign className="h-3.5 w-3.5" />
          </a>
        )}
        {(artist?.social?.website || artist?.signupPortfolioUrl) && (
          <a
            href={artist?.social?.website ?? artist?.signupPortfolioUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-500 hover:bg-blue-100"
          >
            <Globe className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Date */}
      <p className="mb-4 text-center text-[11px] text-gray-300">{fmtDate(user.createdAt)}</p>

      {/* Action buttons */}
      {artist?.id && (
        <div
          className="mt-auto flex gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {(status === "pending" || status === "rejected") && (
            <button
              onClick={() => void onApprove(artist.id)}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              تأیید
            </button>
          )}
          {(status === "pending" || status === "approved") && (
            <button
              onClick={() => void onReject(artist.id, "")}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-50 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              رد
            </button>
          )}
          <button
            onClick={onSelect}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-600 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Stats Bar
   ────────────────────────────────────────────────────────────── */
function StatsBar({ rows }: { rows: ArtistRow[] }) {
  const total = rows.length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const approved = rows.filter((r) => r.status === "approved").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;

  const stats = [
    { label: "کل هنرمندان", value: total, icon: <Users className="h-4 w-4" />, bg: "bg-purple-50", color: "text-purple-700" },
    { label: "در انتظار تأیید", value: pending, icon: <Clock className="h-4 w-4" />, bg: "bg-amber-50", color: "text-amber-700" },
    { label: "تأیید شده", value: approved, icon: <CheckCircle2 className="h-4 w-4" />, bg: "bg-emerald-50", color: "text-emerald-700" },
    { label: "رد شده", value: rejected, icon: <XCircle className="h-4 w-4" />, bg: "bg-rose-50", color: "text-rose-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className={`flex items-center gap-3 rounded-xl border border-gray-100 ${s.bg} px-4 py-3`}>
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
   Main Component
   ────────────────────────────────────────────────────────────── */
export function ArtistsSignupManager() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<ArtistRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const [uRes, aRes] = await Promise.all([
        fetch("/api/admin/users", { credentials: "include", cache: "no-store", signal: ac.signal }),
        fetch("/api/admin/artists", { credentials: "include", cache: "no-store", signal: ac.signal }),
      ]);
      if (!uRes.ok || !aRes.ok) throw new Error("fetch_failed");
      const uJson = (await uRes.json()) as { ok: boolean; users: PublicUser[] };
      const aJson = (await aRes.json()) as { ok: boolean; artists: Artist[] };
      setUsers((uJson.users ?? []).filter((u) => u.role === "artist"));
      setArtists(aJson.artists ?? []);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("دریافت داده با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Build merged rows */
  const allRows: ArtistRow[] = users.map((u) => {
    const artist = artists.find((a) => a.id === u.artistId);
    const status: ArtistStatus = artist?.status ?? "pending";
    return { user: u, artist, status };
  });

  /* Filter by tab + query */
  const filtered = allRows
    .filter((r) => tab === "all" || r.status === tab)
    .filter((r) => {
      const q = query.toLowerCase();
      return (
        r.user.name.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        (r.artist?.signupCity ?? "").toLowerCase().includes(q) ||
        (r.artist?.signupSpecialty ?? "").toLowerCase().includes(q) ||
        (r.artist?.social?.instagram ?? "").toLowerCase().includes(q)
      );
    });

  /* Sort: pending → approved → rejected, then by createdAt desc */
  const ORDER: Record<ArtistStatus, number> = { pending: 0, approved: 1, rejected: 2 };
  const sorted = [...filtered].sort((a, b) => {
    const d = ORDER[a.status] - ORDER[b.status];
    if (d !== 0) return d;
    return new Date(b.user.createdAt).getTime() - new Date(a.user.createdAt).getTime();
  });

  const pendingCount = allRows.filter((r) => r.status === "pending").length;

  /* Actions */
  async function handleApprove(artistId: string) {
    setActionLoading(artistId);
    try {
      const res = await fetch("/api/admin/artists", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: artistId, status: "approved" }),
      });
      if (!res.ok) throw new Error();
      setArtists((prev) =>
        prev.map((a) => (a.id === artistId ? { ...a, status: "approved", rejectionNote: undefined } : a)),
      );
      // Update selected row if open
      if (selected?.artist?.id === artistId) {
        setSelected((s) => s ? { ...s, status: "approved", artist: s.artist ? { ...s.artist, status: "approved", rejectionNote: undefined } : s.artist } : s);
      }
    } catch {
      setError("عملیات تأیید با خطا مواجه شد.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(artistId: string, note: string) {
    setActionLoading(artistId);
    try {
      const res = await fetch("/api/admin/artists", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: artistId, status: "rejected", rejectionNote: note || undefined }),
      });
      if (!res.ok) throw new Error();
      setArtists((prev) =>
        prev.map((a) =>
          a.id === artistId ? { ...a, status: "rejected", rejectionNote: note || undefined } : a,
        ),
      );
      if (selected?.artist?.id === artistId) {
        setSelected((s) => s ? { ...s, status: "rejected", artist: s.artist ? { ...s.artist, status: "rejected", rejectionNote: note || undefined } : s.artist } : s);
      }
    } catch {
      setError("عملیات رد با خطا مواجه شد.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(userId: string, artistId?: string) {
    setActionLoading(artistId ?? userId);
    try {
      // Delete artist record first
      if (artistId) {
        await fetch(`/api/admin/artists?id=${artistId}`, { method: "DELETE", credentials: "include" });
      }
      // Delete user
      await fetch("/api/admin/users", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setArtists((prev) => prev.filter((a) => a.id !== artistId));
      setSelected(null);
    } catch {
      setError("عملیات حذف با خطا مواجه شد.");
    } finally {
      setActionLoading(null);
    }
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: "pending", label: "در انتظار تأیید", count: allRows.filter((r) => r.status === "pending").length },
    { key: "approved", label: "تأیید شده", count: allRows.filter((r) => r.status === "approved").length },
    { key: "rejected", label: "رد شده", count: allRows.filter((r) => r.status === "rejected").length },
    { key: "all", label: "همه", count: allRows.length },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">مدیریت ثبت‌نام هنرمندان</h1>
            <p className="text-xs text-gray-400">
              {loading
                ? "در حال بارگذاری…"
                : `${allRows.length} هنرمند ثبت‌نام‌شده${pendingCount > 0 ? ` · ${pendingCount} در انتظار تأیید` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
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
      {!loading && allRows.length > 0 && <StatsBar rows={allRows} />}

      {/* Pending Alert */}
      {!loading && pendingCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>{pendingCount} هنرمند</strong> منتظر بررسی شما هستند.
          </p>
          <button
            onClick={() => setTab("pending")}
            className="mr-auto flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
          >
            مشاهده <ArrowUpRight className="h-3 w-3" />
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

      {/* Search + Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس نام، ایمیل، شهر، تخصص…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            dir="rtl"
          />
        </div>
        <button className="flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50">
          <Filter className="h-3.5 w-3.5" />
          فیلتر
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  tab === t.key
                    ? t.key === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : t.key === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : t.key === "rejected"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-purple-100 text-purple-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-purple-400" />
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
              <Palette className="mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-400">
                {query ? "نتیجه‌ای پیدا نشد." : tab === "pending" ? "هیچ درخواستی در انتظار تأیید نیست." : "هنوز هنرمندی ثبت‌نام نکرده است."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sorted.map((row) => (
                <ArtistCard
                  key={row.user.id}
                  row={row}
                  onSelect={() => setSelected(row)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  actionLoading={actionLoading}
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
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelete={handleDelete}
          actionLoading={actionLoading !== null}
        />
      )}
    </div>
  );
}
