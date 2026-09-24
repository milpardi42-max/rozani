"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, CalendarClock, RefreshCw, Users } from "lucide-react";
import { faNum } from "@/lib/utils";
import type { AcademyReservation } from "@/lib/types";

export function ReservationsManager() {
  const [reservations, setReservations] = useState<AcademyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch("/api/admin/reservations", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("load_failed");
      const data = (await response.json()) as { reservations?: AcademyReservation[] };
      setReservations(data.reservations ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = reservations.filter((reservation) => reservation.status === "reserved");
  const grouped = active.reduce<Record<string, AcademyReservation[]>>((groups, reservation) => {
    (groups[reservation.eventSlug] ??= []).push(reservation);
    return groups;
  }, {});

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><CalendarClock className="h-5 w-5" /></div>
          <div>
            <h1 className="text-base font-bold text-gray-900">رزروهای رویدادها</h1>
            <p className="text-xs text-gray-400">{loading ? "در حال بارگذاری…" : `${faNum(active.length)} رزرو فعال`}</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> بارگذاری
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">دریافت رزروها با خطا مواجه شد.</div>}

      {!loading && !error && Object.keys(grouped).length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center text-sm text-gray-400">هنوز رزروی ثبت نشده است.</div>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([slug, items]) => {
          const first = items[0];
          return (
            <section key={slug} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{first.eventTitle.fa}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><CalendarClock className="h-3.5 w-3.5" />{new Date(first.startsAt).toLocaleString("fa-IR", { dateStyle: "full", timeStyle: "short" })}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"><Users className="h-3.5 w-3.5" />{faNum(items.length)} رزرو</span>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((reservation) => (
                  <div key={reservation.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{reservation.name}</p>
                      <p className="text-xs text-gray-500" dir="ltr">{reservation.email}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span dir="ltr">{new Date(reservation.createdAt).toLocaleString("fa-IR")}</span>
                      <span className="inline-flex items-center gap-1 text-emerald-600"><Bell className="h-3.5 w-3.5" />یادآوری فعال</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
