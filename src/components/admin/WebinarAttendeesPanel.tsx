"use client";

/**
 * WebinarAttendeesPanel — Admin live dashboard for a running webinar.
 * Shows real-time attendee list, chat, and Q&A from the broadcaster poll endpoint.
 *
 * Mounted inside WebinarBroadcast when the broadcast is live.
 * Can also be opened as a standalone modal from AcademyManager.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  Mail,
  Radio,
  RefreshCw,
  User,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Attendee {
  viewerId: string;
  name: string;
  email: string;
  joinedAt: number;
  lastSeen: number;
}

interface Props {
  slug: string;
  /** If true, renders as an overlay panel (with close button). Otherwise inline. */
  modal?: boolean;
  onClose?: () => void;
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
}

function isOnline(lastSeen: number) {
  return Date.now() - lastSeen < 30_000;
}

export function WebinarAttendeesPanel({ slug, modal = false, onClose }: Props) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAttendees = useCallback(async () => {
    try {
      const res = await fetch(`/api/webinar/${slug}/signal?role=broadcaster`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { attendees?: Attendee[] };
      if (Array.isArray(data.attendees)) {
        setAttendees(data.attendees);
        setLastRefresh(new Date());
      }
    } catch { /* ignore */ }
  }, [slug]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchAttendees();
    setLoading(false);
  }, [fetchAttendees]);

  // Auto-refresh every 5 s
  useEffect(() => {
    refresh();
    timerRef.current = setInterval(fetchAttendees, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAttendees, refresh]);

  const filtered = attendees.filter(
    (a) =>
      !searchQ ||
      a.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  const onlineCount = attendees.filter((a) => isOnline(a.lastSeen)).length;

  // Copy all emails to clipboard
  const copyEmails = async () => {
    const emails = attendees.map((a) => a.email).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [
      ["نام", "ایمیل", "زمان ورود", "آخرین فعالیت"].join(","),
      ...attendees.map((a) =>
        [
          `"${a.name}"`,
          `"${a.email}"`,
          `"${fmtTime(a.joinedAt)}"`,
          `"${fmtTime(a.lastSeen)}"`,
        ].join(",")
      ),
    ];
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webinar-attendees-${slug}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <div className="flex flex-col h-full bg-zinc-900 text-white" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-400" />
          <span className="font-semibold text-sm">شرکت‌کنندگان وبینار</span>
          <span className="text-xs bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">
            {attendees.length} نفر
          </span>
          {onlineCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse" />
              {onlineCount} آنلاین
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={refresh}
            disabled={loading}
            title="بارگذاری مجدد"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={copyEmails}
            title="کپی همه ایمیل‌ها"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={exportCSV}
            title="دانلود CSV"
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          {modal && onClose && (
            <button
              onClick={onClose}
              className="ms-1 p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 border-b border-zinc-800 shrink-0">
        {[
          { label: "کل ثبت‌نام", value: attendees.length },
          { label: "آنلاین", value: onlineCount },
          { label: "ایمیل جمع‌آوری شده", value: attendees.filter((a) => a.email).length },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3 text-center border-s border-zinc-800 first:border-0">
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="جستجوی نام یا ایمیل…"
          dir="rtl"
          className="w-full bg-zinc-800 text-white text-xs rounded-lg px-3 py-2 border border-zinc-700 focus:border-zinc-500 outline-none placeholder-zinc-500"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 mx-auto text-zinc-700 mb-2" />
            <p className="text-zinc-600 text-sm">
              {attendees.length === 0 ? "هنوز کسی ثبت‌نام نکرده" : "موردی یافت نشد"}
            </p>
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.viewerId}
              className="flex items-center gap-3 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 px-3 py-2.5 transition-colors"
            >
              {/* Avatar placeholder */}
              <div className="relative shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-semibold text-zinc-300">
                  {a.name.charAt(0).toUpperCase() || "?"}
                </div>
                <span className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900",
                  isOnline(a.lastSeen) ? "bg-emerald-500" : "bg-zinc-600"
                )} />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{a.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                  <p className="truncate text-xs text-zinc-500 ltr" dir="ltr">{a.email}</p>
                </div>
              </div>

              {/* Join time */}
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-zinc-500">{fmtTime(a.joinedAt)}</p>
                {isOnline(a.lastSeen) && (
                  <p className="text-[10px] text-emerald-500 font-medium">آنلاین</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {lastRefresh && (
        <div className="border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-600 text-center shrink-0">
          آخرین بروزرسانی: {lastRefresh.toLocaleTimeString("fa-IR")}
        </div>
      )}
    </div>
  );

  if (modal) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
        <div className="w-full max-w-md rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl" style={{ height: "min(90vh, 640px)" }}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}
