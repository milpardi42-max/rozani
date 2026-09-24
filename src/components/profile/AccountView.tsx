"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Heart,
  Package,
  Palette,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Clock,
  ChevronRight,
  User,
  Bell,
  CalendarClock,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { useAuth, useCart, useFavorites, useLocale } from "@/components/providers/AppProviders";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { SESSION_FETCH } from "@/lib/http";
import { faNum, formatPrice, href } from "@/lib/utils";
import type { Order } from "@/lib/data/orders";
import type { AcademyReservation } from "@/lib/types";

export function AccountView() {
  const { user } = useAuth();
  const { ids } = useFavorites();
  const { lines } = useCart();
  const { locale, dict } = useLocale();
  const router = useRouter();
  const fa = locale === "fa";

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [reservations, setReservations] = useState<AcademyReservation[]>([]);
  const [reservationsLoaded, setReservationsLoaded] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "reservations" | "orders" | "settings">("overview");

  const loadOrders = useCallback(async () => {
    try {
      const r = await fetch("/api/orders", { ...SESSION_FETCH });
      if (r.ok) {
        const d = (await r.json()) as { ok: boolean; orders?: Order[] };
        setOrders(d.orders ?? []);
      }
    } catch {
      // non-fatal
    } finally {
      setOrdersLoaded(true);
    }
  }, []);

  const loadReservations = useCallback(async () => {
    try {
      const response = await fetch("/api/reservations", { ...SESSION_FETCH });
      if (response.ok) {
        const data = (await response.json()) as { reservations?: AcademyReservation[] };
        setReservations(data.reservations ?? []);
      }
    } catch {
      // non-fatal
    } finally {
      setReservationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => router.replace(href(locale, "/login")), 50);
      return () => clearTimeout(t);
    }
    if (user) {
      void loadOrders();
      void loadReservations();
    }
  }, [user, router, locale, loadOrders, loadReservations]);

  useEffect(() => {
    setRemindersEnabled(typeof window !== "undefined" && localStorage.getItem("academy-reminders") === "enabled");
  }, []);

  useEffect(() => {
    if (!remindersEnabled || typeof window === "undefined" || !("Notification" in window)) return;
    const timers = reservations
      .filter((reservation) => reservation.status === "reserved")
      .map((reservation) => {
        const delay = new Date(reservation.startsAt).getTime() - Date.now();
        if (delay <= 0 || delay > 2_147_000_000) return null;
        return window.setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("یادآوری رویداد رزی آتلیه", {
              body: `${reservation.eventTitle.fa} اکنون شروع شد.`,
              tag: reservation.id,
            });
          }
        }, delay);
      })
      .filter((timer): timer is number => timer !== null);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reservations, remindersEnabled]);

  async function enableReminders() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("academy-reminders", "enabled");
      setRemindersEnabled(true);
    }
  }

  if (!user) {
    return (
      <div className="container-x pt-[calc(var(--header-h)+4rem)] pb-20">
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  const orderStatusLabel = (status: Order["status"]) => {
    const map: Record<Order["status"], { fa: string; en: string }> = {
      pending: { fa: "در انتظار تأیید", en: "Pending" },
      confirmed: { fa: "تأیید شده", en: "Confirmed" },
      shipped: { fa: "ارسال شده", en: "Shipped" },
      delivered: { fa: "تحویل داده شده", en: "Delivered" },
      cancelled: { fa: "لغو شده", en: "Cancelled" },
    };
    return fa ? map[status].fa : map[status].en;
  };

  const orderStatusTone = (status: Order["status"]): "neutral" | "accent" | "success" | "error" | "outline" => {
    if (status === "delivered") return "success";
    if (status === "cancelled") return "error";
    if (status === "shipped" || status === "confirmed") return "accent";
    return "outline";
  };

  const navItems = [
    { id: "overview" as const, label: fa ? "خلاصه حساب" : "Overview", icon: <User className="h-4 w-4" /> },
    { id: "reservations" as const, label: fa ? "رزروهای من" : "My reservations", icon: <CalendarClock className="h-4 w-4" />, count: reservations.filter((reservation) => reservation.status === "reserved").length },
    { id: "orders" as const, label: fa ? "سفارش‌ها" : "Orders", icon: <Package className="h-4 w-4" />, count: orders.length },
    { id: "settings" as const, label: fa ? "تنظیمات" : "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  const quickLinks = [
    { href: href(locale, "/favorites"), icon: <Heart className="h-4 w-4" />, label: fa ? "علاقه‌مندی‌ها" : "Favorites" },
    { href: href(locale, "/checkout"), icon: <ShoppingBag className="h-4 w-4" />, label: fa ? "سبد خرید" : "Cart" },
    {
      href: href(locale, "/account/licenses"),
      icon: <ShieldCheck className="h-4 w-4" />,
      label: fa ? "لایسنس‌های دیجیتال" : "Digital licenses",
    },
    ...(user.role === "artist" || user.role === "admin" ? [{ href: href(locale, "/artist"), icon: <Palette className="h-4 w-4" />, label: fa ? "داشبورد هنرمند" : "Artist Dashboard" }] : []),
    ...(user.role === "admin" ? [{ href: href(locale, "/admin"), icon: <ShieldCheck className="h-4 w-4" />, label: fa ? "پنل مدیریت" : "Admin Panel" }] : []),
  ];

  /* ---- initials avatar ---- */
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background-secondary pt-[calc(var(--announce-h,0px)+var(--header-h))]">
      {/* Profile Banner */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-primary/90 via-accent/60 to-blue/80">
        <div className="absolute inset-0 bg-[url('/images/collections/s01.jpg')] bg-cover bg-center opacity-15 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-background-secondary/60 to-transparent" />
      </div>

      <div className="container-x pb-24">
        {/* Avatar row */}
        <div className="relative -mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-gradient-to-br from-accent/20 to-blue/20 shadow-medium">
              <span className="font-display text-2xl font-bold text-accent">{initials}</span>
            </div>
            <div className="pb-1">
              <h1 className="font-display text-h2">{fa ? `سلام، ${user.name}` : `Hello, ${user.name}`}</h1>
              <p className="text-sm text-foreground-secondary" dir="ltr">{user.email}</p>
              {user.role === "artist" && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-caption font-medium text-accent">
                  <Palette className="h-3 w-3" />
                  {fa ? "هنرمند" : "Artist"}
                </span>
              )}
            </div>
          </div>
          <SignOutButton className="mb-1" />
        </div>

        {/* Main layout: sidebar + content */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* ---- Sidebar ---- */}
          <aside className="space-y-3">
            <nav className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                {fa ? "منو" : "Menu"}
              </p>
              <ul className="pb-2">
                {navItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                        activeSection === item.id
                          ? "bg-accent/8 font-semibold text-accent"
                          : "text-foreground-secondary hover:bg-background-secondary hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {item.icon}
                        {item.label}
                      </span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          {fa ? faNum(item.count) : item.count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              {/* Sign out lives with the navigation, not only in the page header. */}
              <div className="border-t border-border p-2">
                <SignOutButton variant="ghost" size="sm" className="w-full justify-start rounded-xl" />
              </div>
            </nav>

            {/* Quick links */}
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
              <p className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
                {fa ? "دسترسی سریع" : "Quick links"}
              </p>
              <ul className="pb-2">
                {quickLinks.map((lnk) => (
                  <li key={lnk.href}>
                    <Link
                      href={lnk.href}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-secondary transition-colors hover:bg-background-secondary hover:text-foreground"
                    >
                      {lnk.icon}
                      {lnk.label}
                      <ChevronRight className={`ms-auto h-3.5 w-3.5 ${fa ? "rotate-180" : ""}`} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* ---- Main content ---- */}
          <main className="space-y-6">

            {/* Overview section */}
            {activeSection === "overview" && (
              <>
                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Favorites */}
                  <Link
                    href={href(locale, "/favorites")}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-medium"
                  >
                    <div className="absolute -end-4 -top-4 h-20 w-20 rounded-full bg-accent/5 transition group-hover:bg-accent/10" />
                    <Heart className="h-5 w-5 text-accent" />
                    <p className="mt-4 font-display text-h2 tabular">{fa ? faNum(ids.size) : ids.size}</p>
                    <p className="text-caption text-foreground-secondary">{dict.common.favorite}</p>
                  </Link>

                  {/* Cart */}
                  <Link
                    href={href(locale, "/checkout")}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:border-blue/40 hover:shadow-medium"
                  >
                    <div className="absolute -end-4 -top-4 h-20 w-20 rounded-full bg-blue/5 transition group-hover:bg-blue/10" />
                    <ShoppingBag className="h-5 w-5 text-blue" />
                    <p className="mt-4 font-display text-h2 tabular">{fa ? faNum(lines.length) : lines.length}</p>
                    <p className="text-caption text-foreground-secondary">{dict.nav.cart}</p>
                  </Link>

                  {/* Orders */}
                  <button
                    type="button"
                    onClick={() => setActiveSection("orders")}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 text-start transition-all hover:border-success/40 hover:shadow-medium"
                  >
                    <div className="absolute -end-4 -top-4 h-20 w-20 rounded-full bg-success/5 transition group-hover:bg-success/10" />
                    <Package className="h-5 w-5 text-success" />
                    <p className="mt-4 font-display text-h2 tabular">{fa ? faNum(orders.length) : orders.length}</p>
                    <p className="text-caption text-foreground-secondary">{fa ? "سفارش‌ها" : "Orders"}</p>
                  </button>
                </div>

                {/* Recent orders preview */}
                <div className="rounded-2xl border border-border bg-surface shadow-soft">
                  <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <p className="font-semibold">{fa ? "آخرین سفارش‌ها" : "Recent orders"}</p>
                    {orders.length > 0 && (
                      <button type="button" onClick={() => setActiveSection("orders")} className="text-caption text-accent hover:underline">
                        {fa ? "مشاهده همه" : "View all"}
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    {!ordersLoaded ? (
                      <div className="space-y-2">
                        <div className="skeleton h-14 rounded-lg" />
                        <div className="skeleton h-14 rounded-lg" />
                      </div>
                    ) : orders.length === 0 ? (
                      <EmptyState
                        title={fa ? "هنوز سفارشی ندارید." : "No orders yet."}
                        action={<Button href={href(locale, "/shop")} size="sm" variant="outline">{dict.common.continueShopping}</Button>}
                      />
                    ) : (
                      <ul className="space-y-2">
                        {orders.slice(0, 3).map((order) => (
                          <li key={order.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background-secondary">
                                <Clock className="h-4 w-4 text-muted" />
                              </div>
                              <div>
                                <p className="text-sm font-medium" dir="ltr">{order.id}</p>
                                <p className="text-caption text-foreground-secondary">
                                  {new Date(order.createdAt).toLocaleDateString(fa ? "fa-IR" : "en-US", { month: "short", day: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
                              <span className="text-sm font-semibold tabular">{formatPrice(order.total, locale)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Orders section */}
            {activeSection === "reservations" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-5">
                  <div>
                    <p className="font-semibold">{fa ? "یادآوری شروع رویداد" : "Event start reminders"}</p>
                    <p className="mt-1 text-caption text-foreground-secondary">
                      {fa ? "در زمان شروع ورکشاپ یا وبینار، روی همین دستگاه اعلان دریافت می‌کنید." : "Get a browser notification when your workshop or webinar starts."}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant={remindersEnabled ? "outline" : "accent"} onClick={() => void enableReminders()} disabled={remindersEnabled}>
                    <Bell className="h-3.5 w-3.5" />
                    {remindersEnabled ? (fa ? "یادآوری فعال است" : "Reminders enabled") : (fa ? "فعال‌سازی یادآوری" : "Enable reminders")}
                  </Button>
                </div>
                <div className="rounded-2xl border border-border bg-surface shadow-soft">
                  <div className="border-b border-border px-6 py-4">
                    <p className="font-semibold">{fa ? "رزروهای من" : "My reservations"}</p>
                  </div>
                  <div className="p-4">
                    {!reservationsLoaded ? (
                      <div className="space-y-2"><div className="skeleton h-20 rounded-lg" /><div className="skeleton h-20 rounded-lg" /></div>
                    ) : reservations.length === 0 ? (
                      <EmptyState title={fa ? "هنوز رزروی ندارید." : "No reservations yet."} action={<Button href={href(locale, "/academy")} size="sm" variant="outline">{fa ? "مشاهده آکادمی" : "Explore academy"}</Button>} />
                    ) : (
                      <ul className="space-y-3">
                        {reservations.map((reservation) => {
                          const isPast = new Date(reservation.startsAt).getTime() <= Date.now();
                          return (
                            <li key={reservation.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"><CalendarClock className="h-4 w-4" /></div>
                                <div>
                                  <p className="font-medium">{fa ? reservation.eventTitle.fa : reservation.eventTitle.en}</p>
                                  <p className="mt-1 text-caption text-foreground-secondary">
                                    {new Date(reservation.startsAt).toLocaleString(fa ? "fa-IR" : "en-US", { dateStyle: "full", timeStyle: "short" })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge tone={reservation.status === "cancelled" ? "error" : isPast ? "success" : "accent"}>
                                  {reservation.status === "cancelled" ? (fa ? "لغو شده" : "Cancelled") : isPast ? (fa ? "شروع شده" : "Started") : (fa ? "رزرو شده" : "Reserved")}
                                </Badge>
                                <Link href={href(locale, `/academy/${reservation.eventSlug}/live`)} className="text-caption font-semibold text-accent hover:underline">
                                  {fa ? "ورود" : "Join"}
                                </Link>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Orders section */}
            {activeSection === "orders" && (
              <div className="rounded-2xl border border-border bg-surface shadow-soft">
                <div className="border-b border-border px-6 py-4">
                  <p className="font-semibold">{fa ? "سفارش‌های من" : "My orders"}</p>
                </div>
                <div className="p-4">
                  {!ordersLoaded ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}
                    </div>
                  ) : orders.length === 0 ? (
                    <EmptyState
                      title={fa ? "هنوز سفارشی ندارید." : "No orders yet."}
                      action={<Button href={href(locale, "/shop")} size="sm" variant="outline">{dict.common.continueShopping}</Button>}
                    />
                  ) : (
                    <ul className="space-y-2">
                      {orders.map((order) => (
                        <li key={order.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background-secondary">
                              <Package className="h-4 w-4 text-muted" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold" dir="ltr">{order.id}</span>
                                <Badge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</Badge>
                              </div>
                              <p className="mt-0.5 text-caption text-foreground-secondary">
                                {new Date(order.createdAt).toLocaleDateString(fa ? "fa-IR" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                                {" · "}
                                {order.lines.length}{" "}
                                {fa ? "قلم" : order.lines.length === 1 ? "item" : "items"}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold tabular">{formatPrice(order.total, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Settings section */}
            {activeSection === "settings" && (
              <div className="rounded-2xl border border-border bg-surface shadow-soft">
                <div className="border-b border-border px-6 py-4">
                  <p className="font-semibold">{fa ? "تنظیمات حساب" : "Account settings"}</p>
                </div>
                <ul className="divide-y divide-border">
                  {[
                    { icon: <User className="h-4 w-4" />, label: fa ? "اطلاعات شخصی" : "Personal info", desc: fa ? "نام، آواتار و اطلاعات تماس" : "Name, avatar and contact info" },
                    { icon: <Bell className="h-4 w-4" />, label: fa ? "اعلان‌ها" : "Notifications", desc: fa ? "تنظیم ایمیل و پوش‌نوتیفیکیشن" : "Email and push notifications" },
                    { icon: <CreditCard className="h-4 w-4" />, label: fa ? "روش‌های پرداخت" : "Payment methods", desc: fa ? "کارت‌های بانکی و کیف پول" : "Bank cards and wallet" },
                    { icon: <HelpCircle className="h-4 w-4" />, label: fa ? "پشتیبانی" : "Help & support", desc: fa ? "ارتباط با تیم پشتیبانی" : "Contact support team" },
                  ].map((item) => (
                    <li key={item.label} className="flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors hover:bg-background-secondary">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">{item.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-caption text-foreground-secondary">{item.desc}</p>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted ${fa ? "rotate-180" : ""}`} />
                    </li>
                  ))}
                </ul>

                {/* Sign out — a first-class row in settings, not a hidden link. */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-5">
                  <div>
                    <p className="text-sm font-medium">{fa ? "خروج از حساب" : "Sign out"}</p>
                    <p className="text-caption text-foreground-secondary">
                      {fa
                        ? "نشست شما در این دستگاه بسته می‌شود؛ لایسنس‌ها و دانلودها در حساب باقی می‌مانند."
                        : "Ends the session on this device — your licenses and downloads stay in your account."}
                    </p>
                  </div>
                  <SignOutButton variant="solid" />
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
