"use client";

import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Clock,
  Download,
  Hash,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserMinus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import type { PublicUser } from "@/lib/data/users";

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */
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
    "bg-sky-100 text-sky-700",
    "bg-blue-100 text-blue-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length]!;
}

/* ──────────────────────────────────────────────────────────────
   Relative time helper
   ────────────────────────────────────────────────────────────── */
function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "امروز";
    if (days === 1) return "دیروز";
    if (days < 7) return `${days} روز پیش`;
    if (days < 30) return `${Math.floor(days / 7)} هفته پیش`;
    if (days < 365) return `${Math.floor(days / 30)} ماه پیش`;
    return `${Math.floor(days / 365)} سال پیش`;
  } catch {
    return "";
  }
}

/* ──────────────────────────────────────────────────────────────
   PDF Export
   ────────────────────────────────────────────────────────────── */
function exportPDF(users: PublicUser[], title: string) {
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
    th{background:#1e2230;color:#fff;padding:10px 12px;border:1px solid #1e2230;text-align:right}
    td{padding:8px 12px;border:1px solid #e5e7eb;color:#374151}
    tr:nth-child(even) td{background:#f9fafb}
    tfoot td{background:#f3f4f6;font-weight:600}
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>تاریخ: ${new Intl.DateTimeFormat("fa-IR", { dateStyle: "long", timeStyle: "short" }).format(new Date())} · تعداد: ${users.length}</p>
  <table>
    <thead><tr><th>#</th><th>نام</th><th>ایمیل</th><th>شناسه</th><th>تاریخ ثبت‌نام</th></tr></thead>
    <tbody>
      ${users.map((u, i) => `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:500;color:#111">${u.name}</td>
        <td dir="ltr">${u.email}</td>
        <td dir="ltr" style="font-family:monospace;font-size:11px">${u.id}</td>
        <td>${fmtDate(u.createdAt)}</td>
      </tr>`).join("")}
    </tbody>
    <tfoot><tr><td colspan="5">جمع: ${users.length} خریدار</td></tr></tfoot>
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
   Stats Bar
   ────────────────────────────────────────────────────────────── */
function StatsBar({ users }: { users: PublicUser[] }) {
  const total = users.length;

  // New this week
  const weekAgo = Date.now() - 7 * 86_400_000;
  const newThisWeek = users.filter((u) => new Date(u.createdAt).getTime() > weekAgo).length;

  // New this month
  const monthAgo = Date.now() - 30 * 86_400_000;
  const newThisMonth = users.filter((u) => new Date(u.createdAt).getTime() > monthAgo).length;

  const stats = [
    {
      label: "کل خریداران",
      value: total,
      icon: <Users className="h-4 w-4" />,
      bg: "bg-sky-50",
      color: "text-sky-700",
    },
    {
      label: "این هفته",
      value: newThisWeek,
      icon: <TrendingUp className="h-4 w-4" />,
      bg: "bg-emerald-50",
      color: "text-emerald-700",
    },
    {
      label: "این ماه",
      value: newThisMonth,
      icon: <Calendar className="h-4 w-4" />,
      bg: "bg-violet-50",
      color: "text-violet-700",
    },
    {
      label: "شناسه‌دار",
      value: total,
      icon: <UserCheck className="h-4 w-4" />,
      bg: "bg-amber-50",
      color: "text-amber-700",
    },
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
   Buyer Card
   ────────────────────────────────────────────────────────────── */
function BuyerCard({
  user,
  index,
  onSelect,
}: {
  user: PublicUser;
  index: number;
  onSelect: () => void;
}) {
  const avatarClass = avatarColor(user.name);

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-5 hover:border-sky-200 hover:shadow-md hover:shadow-sky-50 transition-all cursor-pointer"
      onClick={onSelect}
    >
      {/* Index badge */}
      <span className="absolute top-3 left-3 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
        #{index + 1}
      </span>

      {/* Avatar */}
      <div
        className={`mx-auto mb-3 mt-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold ${avatarClass}`}
      >
        {initials(user.name)}
      </div>

      {/* Name */}
      <div className="text-center mb-4">
        <p className="font-semibold text-gray-900 leading-tight">{user.name}</p>
        <p className="mt-1 text-xs text-gray-400" dir="ltr">
          {user.email}
        </p>
      </div>

      {/* Meta chips */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
        <span className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500">
          <Clock className="h-3 w-3 shrink-0" />
          {relativeTime(user.createdAt)}
        </span>
      </div>

      {/* ID */}
      <p
        className="mb-4 truncate text-center font-mono text-[11px] text-gray-300"
        dir="ltr"
      >
        {user.id}
      </p>

      {/* Action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs text-gray-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
        مشاهده پروفایل
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Buyer Detail Drawer
   ────────────────────────────────────────────────────────────── */
interface DrawerProps {
  user: PublicUser;
  onClose: () => void;
  onDelete: (userId: string) => Promise<void>;
  actionLoading: boolean;
}

function BuyerDetailDrawer({ user, onClose, onDelete, actionLoading }: DrawerProps) {
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
          <h2 className="text-sm font-semibold text-gray-800">پروفایل خریدار</h2>
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
              <p className="text-sm text-gray-500 mt-0.5">خریدار</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                <UserCheck className="h-3 w-3" />
                کاربر فعال
              </span>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              اطلاعات حساب
            </p>
            <InfoRow
              icon={<User className="h-4 w-4" />}
              label="نام کامل"
              value={user.name}
            />
            <InfoRow
              icon={<Mail className="h-4 w-4" />}
              label="ایمیل"
              value={user.email}
              dir="ltr"
            />
            <InfoRow
              icon={<Hash className="h-4 w-4" />}
              label="شناسه کاربر"
              value={user.id}
              dir="ltr"
              mono
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4" />}
              label="تاریخ ثبت‌نام"
              value={fmtDateTime(user.createdAt)}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4" />}
              label="زمان عضویت"
              value={relativeTime(user.createdAt)}
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Actions */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <button
              onClick={() => exportPDF([user], `پروفایل خریدار: ${user.name}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Download className="h-4 w-4" />
              دریافت PDF این کاربر
            </button>

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
                <p className="text-xs font-semibold text-red-800">
                  این عملیات قابل بازگشت نیست.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void onDelete(user.id)}
                    disabled={actionLoading}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
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
   Main Component
   ────────────────────────────────────────────────────────────── */
export function BuyersManager() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PublicUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function load() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = (await res.json()) as { ok: boolean; users: PublicUser[] };
      setUsers((json.users ?? []).filter((u) => u.role === "user"));
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        setError("دریافت داده با خطا مواجه شد.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(userId: string) {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelected(null);
    } catch {
      setError("حذف کاربر با خطا مواجه شد.");
    } finally {
      setActionLoading(false);
    }
  }

  /* Sort: newest first */
  const sorted = [...users].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const filtered = sorted.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()) ||
      u.id.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">مدیریت خریداران</h1>
            <p className="text-xs text-gray-400">
              {loading ? "در حال بارگذاری…" : `${users.length} خریدار ثبت‌نام‌شده`}
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
            onClick={() => exportPDF(filtered, "لیست خریداران")}
            disabled={filtered.length === 0}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 text-xs font-semibold text-white hover:bg-[#2a3045] disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            خروجی PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && users.length > 0 && <StatsBar users={users} />}

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
          placeholder="جستجو بر اساس نام، ایمیل یا شناسه…"
          className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-9 pl-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          dir="rtl"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-sky-400" />
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center">
              <UserMinus className="mb-3 h-10 w-10 text-gray-200" />
              <p className="text-sm font-medium text-gray-400">
                {query ? "نتیجه‌ای پیدا نشد." : "هنوز خریداری ثبت‌نام نکرده است."}
              </p>
            </div>
          ) : (
            <>
              {/* Result count */}
              {query && (
                <p className="text-xs text-gray-400">
                  {filtered.length} نتیجه برای «{query}»
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((u, i) => (
                  <BuyerCard
                    key={u.id}
                    user={u}
                    index={i}
                    onSelect={() => setSelected(u)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Detail Drawer */}
      {selected && (
        <BuyerDetailDrawer
          user={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Legacy export — kept for backward compatibility with
   ArtistsSignupManager (which no longer imports it, but
   other files may still reference it)
   ────────────────────────────────────────────────────────────── */
export function UserDetailModal({
  user,
  onClose,
  accentClass,
  accentLight,
  roleLabel,
  extra,
}: {
  user: PublicUser;
  onClose: () => void;
  accentClass: string;
  accentLight: string;
  roleLabel: string;
  extra?: React.ReactNode;
}) {
  function exportSingle() {
    exportPDF([user], `پروفایل ${roleLabel}: ${user.name}`);
  }

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "نام کامل", value: user.name },
    { label: "ایمیل", value: user.email, mono: true },
    { label: "شناسه کاربر", value: user.id, mono: true },
    { label: "نقش", value: roleLabel },
    { label: "تاریخ ثبت‌نام", value: fmtDateTime(user.createdAt) },
    ...(user.artistId ? [{ label: "شناسه هنرمند", value: user.artistId, mono: true }] : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className={`${accentClass} flex items-center gap-3 rounded-t-2xl px-5 py-4`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
            {initials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold text-white">{user.name}</p>
            <p className="text-xs text-white/70">{roleLabel}</p>
          </div>
          <button
            onClick={exportSingle}
            className="flex h-8 items-center gap-1 rounded-md bg-white/20 px-2.5 text-xs text-white hover:bg-white/30"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
        <div className="p-5 space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {r.label}
              </span>
              <span
                className={`rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-800 ${r.mono ? "font-mono" : ""}`}
                dir={r.mono ? "ltr" : "rtl"}
              >
                {r.value}
              </span>
            </div>
          ))}
          {extra}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
