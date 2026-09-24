"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Loader2,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SESSION_FETCH } from "@/lib/http";

/* ─── Types ─── */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "artist" | "admin";
  artistId?: string;
  createdAt: string;
}

type RoleFilter = "all" | "user" | "artist";
type SortKey = "name" | "email" | "role" | "createdAt";
type SortDir = "asc" | "desc";

/* ─── Helpers ─── */
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "همین الان";
  if (diff < 3600) return `${Math.floor(diff / 60)} دقیقه پیش`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ساعت پیش`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });
}

function fullDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ROLE_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  user:   { label: "کاربر عادی",   color: "text-blue-700 bg-blue-50 border-blue-200",   icon: <User className="h-3 w-3" /> },
  artist: { label: "هنرمند/طراح",  color: "text-purple-700 bg-purple-50 border-purple-200", icon: <UserCheck className="h-3 w-3" /> },
  admin:  { label: "مدیر",         color: "text-rose-700 bg-rose-50 border-rose-200",   icon: <Shield className="h-3 w-3" /> },
};

/* ─────────────────────────────────────────────────────────
   PDF generation — pure client-side via print iframe
   ───────────────────────────────────────────────────────── */
function buildPdfHtml(users: AdminUser[], title: string): string {
  const rows = users
    .map(
      (u) => `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${ROLE_MAP[u.role]?.label ?? u.role}</td>
        <td>${u.artistId ?? "—"}</td>
        <td>${new Date(u.createdAt).toLocaleDateString("fa-IR")}</td>
        <td>${new Date(u.createdAt).toLocaleTimeString("fa-IR")}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; font-size: 12px; color: #1f2328; padding: 28px 32px; direction: rtl; }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; color: #1e2230; }
  .meta { font-size: 11px; color: #6e7681; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #1e2230; color: #fff; padding: 8px 10px; text-align: right; font-size: 11px; font-weight: 600; }
  tbody tr:nth-child(even) { background: #f7f8fa; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
  .badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 600; }
  .user   { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
  .artist { background: #faf5ff; color: #7c3aed; border: 1px solid #ddd6fe; }
  .admin  { background: #fff1f2; color: #be123c; border: 1px solid #fecdd3; }
  .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>📋 ${title}</h1>
  <p class="meta">تاریخ خروجی: ${new Date().toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} · تعداد: ${users.length} نفر</p>
  <table>
    <thead>
      <tr>
        <th>نام</th>
        <th>ایمیل</th>
        <th>نقش</th>
        <th>شناسه هنرمند</th>
        <th>تاریخ ثبت‌نام</th>
        <th>ساعت ثبت‌نام</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer">رزی آتلیه — پنل مدیریت کاربران · این سند به‌صورت خودکار تولید شده است</p>
</body>
</html>`;
}

function printPdf(users: AdminUser[], title: string) {
  const html = buildPdfHtml(users, title);
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;opacity:0;pointer-events:none;z-index:-1";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  // Wait for fonts then print
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 600);
}

/* ─── Action Menu ─── */
function ActionMenu({
  user,
  onRoleChange,
  onDelete,
  onPdfSingle,
}: {
  user: AdminUser;
  onRoleChange: (id: string, role: "user" | "artist") => void;
  onDelete: (id: string) => void;
  onPdfSingle: (user: AdminUser) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (user.role === "admin") return null;

  const otherRole = user.role === "user" ? "artist" : "user";
  const otherLabel = user.role === "user" ? "تغییر به هنرمند/طراح" : "تغییر به کاربر عادی";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-background-secondary hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-white shadow-medium">
          <button
            onClick={() => { onRoleChange(user.id, otherRole); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-background-secondary"
          >
            <UserCheck className="h-4 w-4 text-purple-500" />
            {otherLabel}
          </button>
          <button
            onClick={() => { onPdfSingle(user); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-background-secondary"
          >
            <FileText className="h-4 w-4 text-blue-500" />
            دانلود PDF تکی
          </button>
          <div className="border-t border-border" />
          <button
            onClick={() => { onDelete(user.id); setOpen(false); }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            حذف کاربر
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Signup form ─── */
const SIGNUP_ERRORS: Record<string, string> = {
  invalid_payload: "اطلاعات ناقص است. همه فیلدها را پر کنید.",
  password_too_short: "رمز عبور باید حداقل ۶ کاراکتر باشد.",
  email_taken: "این ایمیل قبلاً ثبت شده است.",
  server_error: "خطای سرور. لطفاً دوباره تلاش کنید.",
};

function SignupPanel({ onCreated }: { onCreated: (u: AdminUser) => void }) {
  const [roleTab, setRoleTab] = useState<"artist" | "user">("artist");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setSuccess("");
    const fd = new FormData(e.currentTarget);
    const name     = String(fd.get("name") ?? "").trim();
    const email    = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    try {
      const r = await fetch("/api/admin/users", {
        ...SESSION_FETCH,
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, role: roleTab }),
      });
      const d = (await r.json()) as { ok: boolean; error?: string; user?: AdminUser };
      if (!d.ok) {
        setErr(SIGNUP_ERRORS[d.error ?? "server_error"] ?? "خطای ناشناخته");
      } else {
        setSuccess(`کاربر "${name}" با موفقیت ثبت شد.`);
        formRef.current?.reset();
        if (d.user) onCreated(d.user);
      }
    } catch {
      setErr("خطای شبکه. لطفاً دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-white shadow-soft">
      {/* Role sub-tabs */}
      <div className="flex border-b border-border">
        {(["artist", "user"] as const).map((r) => (
          <button
            key={r}
            onClick={() => { setRoleTab(r); setErr(""); setSuccess(""); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              roleTab === r
                ? "border-b-2 border-accent text-accent bg-accent/5"
                : "text-muted hover:text-foreground hover:bg-background-secondary",
            )}
          >
            {r === "artist"
              ? <><UserCheck className="h-4 w-4" />هنرمند / طراح</>
              : <><User className="h-4 w-4" />خریدار</>}
          </button>
        ))}
      </div>

      {/* Form */}
      <form ref={formRef} onSubmit={submit} className="space-y-4 p-5" noValidate>
        <p className="text-xs text-muted">
          {roleTab === "artist"
            ? "ثبت‌نام یک حساب هنرمند / طراح جدید توسط ادمین."
            : "ثبت‌نام یک حساب خریدار جدید توسط ادمین."}
        </p>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-foreground-secondary">نام کامل</label>
          <input
            name="name"
            required
            autoComplete="off"
            placeholder="مثال: علی رضایی"
            className="h-9 w-full rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-foreground-secondary">ایمیل</label>
          <input
            name="email"
            type="email"
            required
            dir="ltr"
            autoComplete="off"
            placeholder="example@email.com"
            className="h-9 w-full rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-foreground-secondary">رمز عبور (حداقل ۶ کاراکتر)</label>
          <input
            name="password"
            type="password"
            required
            dir="ltr"
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            className="h-9 w-full rounded-lg border border-border bg-background-secondary px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
          />
        </div>

        {err && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            ✓ {success}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors",
            busy
              ? "cursor-not-allowed bg-[#1e2230]/40 text-white/60"
              : "bg-[#1e2230] text-white hover:bg-[#2a3045]",
          )}
        >
          {busy
            ? <><Loader2 className="h-4 w-4 animate-spin" />در حال ثبت…</>
            : <><UserPlus className="h-4 w-4" />ثبت‌نام {roleTab === "artist" ? "هنرمند / طراح" : "خریدار"}</>}
        </button>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   کامپوننت اصلی مدیریت کاربران
   ═══════════════════════════════════════════════════════════ */
export function UsersManager() {
  const [mainTab, setMainTab] = useState<"list" | "signup">("list");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* Filters */
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* Multi-select */
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* Toast */
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  /* Fetch */
  const fetchUsers = useCallback(async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const r = await fetch("/api/admin/users", { ...SESSION_FETCH });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = (await r.json()) as { ok: boolean; users: AdminUser[] };
      if (d.ok) setUsers(d.users);
    } catch {
      setError("خطا در بارگذاری کاربران");
    } finally {
      setLoading(false);
      if (showSpin) setTimeout(() => setRefreshing(false), 500);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /* Role change */
  const handleRoleChange = async (id: string, role: "user" | "artist") => {
    const prev = users.find((u) => u.id === id);
    setUsers((us) => us.map((u) => (u.id === id ? { ...u, role } : u)));
    try {
      const r = await fetch("/api/admin/users", {
        ...SESSION_FETCH,
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, role }),
      });
      if (!r.ok) throw new Error();
      showToast("نقش کاربر بروز شد");
    } catch {
      if (prev) setUsers((us) => us.map((u) => (u.id === id ? prev : u)));
      showToast("خطا در تغییر نقش", false);
    }
  };

  /* Delete */
  const handleDelete = async (id: string) => {
    if (!confirm("آیا مطمئن هستید؟ این عمل قابل بازگشت نیست.")) return;
    const prev = users.find((u) => u.id === id);
    setUsers((us) => us.filter((u) => u.id !== id));
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
    try {
      const r = await fetch("/api/admin/users", {
        ...SESSION_FETCH,
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error();
      showToast("کاربر حذف شد");
    } catch {
      if (prev) setUsers((us) => [...us, prev]);
      showToast("خطا در حذف کاربر", false);
    }
  };

  /* PDF */
  const handlePdfSingle = (user: AdminUser) => {
    printPdf([user], `پروفایل کاربر: ${user.name}`);
  };

  const handlePdfBulk = () => {
    const target = selected.size > 0
      ? filteredSorted.filter((u) => selected.has(u.id))
      : filteredSorted;
    if (target.length === 0) return;
    const label = roleFilter === "artist" ? "هنرمندان و طراحان" : roleFilter === "user" ? "کاربران عادی" : "همه کاربران";
    printPdf(target, `لیست ${label} — رزی آتلیه`);
  };

  /* Filter + Sort */
  const filteredSorted = users
    .filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      let va: string | number = a[sortKey];
      let vb: string | number = b[sortKey];
      if (sortKey === "createdAt") { va = new Date(va as string).getTime(); vb = new Date(vb as string).getTime(); }
      const cmp = String(va).localeCompare(String(vb), "fa");
      return sortDir === "asc" ? cmp : -cmp;
    });

  /* Select helpers */
  const allSelected = filteredSorted.length > 0 && filteredSorted.every((u) => selected.has(u.id));
  const someSelected = filteredSorted.some((u) => selected.has(u.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filteredSorted.map((u) => u.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
  };

  /* Counts */
  const countAll    = users.length;
  const countUser   = users.filter((u) => u.role === "user").length;
  const countArtist = users.filter((u) => u.role === "artist").length;

  /* ─── Render ─── */
  return (
    <div className="space-y-5" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 left-1/2 z-[999] -translate-x-1/2 flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium shadow-medium transition-all",
          toast.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700",
        )}>
          {toast.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">مدیریت کاربران</h1>
          <p className="mt-0.5 text-xs text-muted">ورود و خروج، نقش‌ها و اطلاعات همه کاربران</p>
        </div>
        {mainTab === "list" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchUsers(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground-secondary shadow-soft hover:bg-background-secondary",
                refreshing && "opacity-60 pointer-events-none",
              )}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              به‌روزرسانی
            </button>
            <button
              onClick={handlePdfBulk}
              className="flex items-center gap-1.5 rounded-lg bg-[#1e2230] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2a3045]"
            >
              <Download className="h-3.5 w-3.5" />
              {selected.size > 0 ? `دانلود PDF (${selected.size} نفر)` : "دانلود PDF کلی"}
            </button>
          </div>
        )}
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-white p-1 shadow-soft">
        <button
          onClick={() => setMainTab("list")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
            mainTab === "list"
              ? "bg-[#1e2230] text-white shadow-soft"
              : "text-muted hover:bg-background-secondary hover:text-foreground",
          )}
        >
          <Users className="h-4 w-4" />
          لیست کاربران
        </button>
        <button
          onClick={() => setMainTab("signup")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
            mainTab === "signup"
              ? "bg-[#1e2230] text-white shadow-soft"
              : "text-muted hover:bg-background-secondary hover:text-foreground",
          )}
        >
          <UserPlus className="h-4 w-4" />
          ثبت‌نام کاربر جدید
        </button>
      </div>

      {mainTab === "signup" && (
        <SignupPanel
          onCreated={(u) => {
            setUsers((prev) => [u, ...prev]);
            setMainTab("list");
            showToast(`کاربر "${u.name}" با موفقیت ثبت شد.`);
          }}
        />
      )}

      {/* Stat cards — only in list tab */}
      {mainTab === "list" && <>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "همه کاربران", count: countAll, icon: <Users className="h-4 w-4" />, color: "bg-slate-50 text-slate-600", filter: "all" as RoleFilter },
          { label: "کاربران عادی", count: countUser, icon: <User className="h-4 w-4" />, color: "bg-blue-50 text-blue-600", filter: "user" as RoleFilter },
          { label: "هنرمندان/طراحان", count: countArtist, icon: <UserCheck className="h-4 w-4" />, color: "bg-purple-50 text-purple-600", filter: "artist" as RoleFilter },
        ].map((s) => (
          <button
            key={s.filter}
            onClick={() => setRoleFilter(s.filter)}
            className={cn(
              "rounded-xl border p-4 text-right transition-all hover:shadow-medium",
              roleFilter === s.filter ? "border-accent/40 bg-accent/5 shadow-soft" : "border-border bg-white shadow-soft",
            )}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">{s.label}</p>
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", s.color)}>
                {s.icon}
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{s.count.toLocaleString("fa-IR")}</p>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-border bg-white shadow-soft">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو نام، ایمیل یا شناسه…"
              className="h-8 w-full rounded-md border border-border bg-background-secondary pr-8 pl-3 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Role filter */}
          <div className="relative">
            <Filter className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="h-8 appearance-none rounded-md border border-border bg-background-secondary pr-8 pl-6 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
            >
              <option value="all">همه نقش‌ها</option>
              <option value="user">کاربر عادی</option>
              <option value="artist">هنرمند/طراح</option>
            </select>
            <ChevronDown className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          <div className="mr-auto text-xs text-muted">
            {filteredSorted.length} نفر از {countAll}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                <div className="h-4 w-4 animate-pulse rounded bg-background-secondary" />
                <div className="h-8 w-8 animate-pulse rounded-full bg-background-secondary" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-background-secondary" />
                  <div className="h-2.5 w-48 animate-pulse rounded bg-background-secondary" />
                </div>
                <div className="h-5 w-20 animate-pulse rounded-full bg-background-secondary" />
                <div className="h-3 w-24 animate-pulse rounded bg-background-secondary" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <X className="h-8 w-8 text-red-400" />
            <p className="text-sm text-muted">{error}</p>
            <button onClick={() => fetchUsers()} className="text-xs text-accent underline">تلاش مجدد</button>
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-8 w-8 text-muted/40" />
            <p className="text-sm text-muted">کاربری یافت نشد</p>
          </div>
        ) : (
          <>
            {/* Table head */}
            <div className="hidden grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b border-border bg-background-secondary px-4 py-2 text-[11px] font-semibold text-muted sm:grid">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleAll}
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                    allSelected ? "border-accent bg-accent text-white" : someSelected ? "border-accent bg-accent/20" : "border-border bg-white",
                  )}
                >
                  {(allSelected || someSelected) && <Check className="h-2.5 w-2.5" />}
                </button>
              </div>
              <div className="w-9" />
              <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-right hover:text-foreground">
                نام و ایمیل {sortKey === "name" && <ChevronDown className={cn("h-3 w-3", sortDir === "asc" && "rotate-180")} />}
              </button>
              <button onClick={() => toggleSort("role")} className="flex items-center gap-1 hover:text-foreground">
                نقش {sortKey === "role" && <ChevronDown className={cn("h-3 w-3", sortDir === "asc" && "rotate-180")} />}
              </button>
              <div className="hidden lg:block">شناسه هنرمند</div>
              <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1 hover:text-foreground">
                تاریخ ثبت {sortKey === "createdAt" && <ChevronDown className={cn("h-3 w-3", sortDir === "asc" && "rotate-180")} />}
              </button>
              <div className="w-7" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-border">
              {filteredSorted.map((user) => {
                const role = ROLE_MAP[user.role] ?? ROLE_MAP.user;
                const isSel = selected.has(user.id);
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      isSel ? "bg-accent/4" : "hover:bg-background-secondary/50",
                    )}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => user.role !== "admin" && toggleOne(user.id)}
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        user.role === "admin" ? "cursor-default border-border bg-background-secondary opacity-40" :
                        isSel ? "border-accent bg-accent text-white" : "border-border bg-white hover:border-accent/50",
                      )}
                    >
                      {isSel && <Check className="h-2.5 w-2.5" />}
                    </button>

                    {/* Avatar */}
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      user.role === "artist" ? "bg-purple-100 text-purple-700" :
                      user.role === "admin" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700",
                    )}>
                      {user.name.charAt(0)}
                    </div>

                    {/* Name / Email / ID */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                      <code className="mt-0.5 inline-block rounded bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted">
                        {user.id}
                      </code>
                    </div>

                    {/* Role badge */}
                    <span className={cn(
                      "hidden shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:flex",
                      role.color,
                    )}>
                      {role.icon}{role.label}
                    </span>

                    {/* Artist ID */}
                    <div className="hidden min-w-0 lg:block">
                      {user.artistId ? (
                        <code className="rounded bg-purple-50 px-1.5 py-0.5 font-mono text-[10px] text-purple-700">
                          {user.artistId}
                        </code>
                      ) : (
                        <span className="text-[11px] text-muted">—</span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="hidden shrink-0 flex-col items-end sm:flex">
                      <span className="text-xs text-foreground">{timeAgo(user.createdAt)}</span>
                      <span className="text-[10px] text-muted">{fullDate(user.createdAt)}</span>
                    </div>

                    {/* Actions */}
                    <ActionMenu
                      user={user}
                      onRoleChange={handleRoleChange}
                      onDelete={handleDelete}
                      onPdfSingle={handlePdfSingle}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        {!loading && filteredSorted.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted">
            <span>
              {selected.size > 0 && (
                <span className="font-medium text-accent">{selected.size.toLocaleString("fa-IR")} انتخاب شده · </span>
              )}
              {filteredSorted.length.toLocaleString("fa-IR")} نفر نمایش داده می‌شود
            </span>
            {selected.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePdfBulk}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-background-secondary"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  دانلود PDF انتخاب‌شده‌ها
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-muted hover:text-foreground"
                >
                  لغو انتخاب
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </>}
    </div>
  );
}
