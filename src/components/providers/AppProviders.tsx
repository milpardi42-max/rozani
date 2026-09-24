"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/types";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionary";
import { SESSION_FETCH } from "@/lib/http";

/* ------------------------------------------------------------------ */
/* Locale                                                               */
/* ------------------------------------------------------------------ */
interface LocaleCtx {
  locale: Locale;
  dir: "rtl" | "ltr";
  dict: Dictionary;
}
const LocaleContext = createContext<LocaleCtx | null>(null);
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale outside provider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Theme                                                                */
/* ------------------------------------------------------------------ */
type Theme = "light" | "dark";
interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeCtx>({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(ThemeContext);

/* ------------------------------------------------------------------ */
/* Cart                                                                 */
/* ------------------------------------------------------------------ */
export interface CartLine {
  key: string;
  kind: "pattern" | "product";
  id: string;
  sku: string;
  title: string;
  image: string;
  price: { fa: number; en: number };
  colorName?: string;
  colorHex?: string;
  qty: number;
  href: string;
}
interface CartCtx {
  lines: CartLine[];
  count: number;
  add: (line: Omit<CartLine, "qty" | "key"> & { qty?: number }) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  lastAdded: string | null;
}
const CartContext = createContext<CartCtx | null>(null);
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart outside provider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Favorites                                                            */
/* ------------------------------------------------------------------ */
interface FavCtx {
  ids: Set<string>;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
}
const FavContext = createContext<FavCtx | null>(null);
export function useFavorites() {
  const ctx = useContext(FavContext);
  if (!ctx) throw new Error("useFavorites outside provider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                  */
/* ------------------------------------------------------------------ */
export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "artist" | "admin";
  artistId?: string;
}
interface AuthCtx {
  user: User | null;
  /** false until the server session has been checked */
  ready: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
    role?: "user" | "artist",
    extra?: {
      /* seller registration — ignored for buyer accounts */
      phone?: string;
      city?: string;
      specialty?: string;
      instagram?: string;
      portfolioUrl?: string;
      studioName?: string;
      experience?: string;
      bio?: string;
      formats?: string[];
      families?: string[];
      terms?: boolean;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}
const AuthContext = createContext<AuthCtx | null>(null);
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Search palette                                                       */
/* ------------------------------------------------------------------ */
interface SearchCtx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}
const SearchContext = createContext<SearchCtx>({ isOpen: false, open: () => {}, close: () => {} });
export const useSearch = () => useContext(SearchContext);

/* ------------------------------------------------------------------ */
function useLocalState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, [key]);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state, hydrated]);
  return [state, setState];
}

export function AppProviders({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const localeValue = useMemo<LocaleCtx>(
    () => ({ locale, dir: locale === "fa" ? "rtl" : "ltr", dict: dictionaries[locale] }),
    [locale],
  );

  /* theme */
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = (document.documentElement.getAttribute("data-theme") as Theme) || "light";
    setTheme(saved);
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("ra-theme", next);
      } catch {}
      return next;
    });
  }, []);

  /* cart */
  const [lines, setLines] = useLocalState<CartLine[]>("ra-cart", []);
  const [cartOpen, setCartOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const add = useCallback<CartCtx["add"]>(
    (line) => {
      const key = `${line.kind}:${line.id}:${line.colorName ?? ""}`;
      setLines((prev) => {
        const existing = prev.find((l) => l.key === key);
        if (existing) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + (line.qty ?? 1) } : l));
        return [...prev, { ...line, key, qty: line.qty ?? 1 }];
      });
      setLastAdded(key);
      window.setTimeout(() => setLastAdded(null), 1600);
    },
    [setLines],
  );
  const remove = useCallback((key: string) => setLines((p) => p.filter((l) => l.key !== key)), [setLines]);
  const setQty = useCallback(
    (key: string, qty: number) => setLines((p) => p.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l))),
    [setLines],
  );
  const clear = useCallback(() => setLines([]), [setLines]);
  const cartValue = useMemo<CartCtx>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      add,
      remove,
      setQty,
      clear,
      isOpen: cartOpen,
      open: () => setCartOpen(true),
      close: () => setCartOpen(false),
      lastAdded,
    }),
    [lines, add, remove, setQty, clear, cartOpen, lastAdded],
  );

  /* favorites */
  const [favArr, setFavArr] = useLocalState<string[]>("ra-favs", []);
  const favValue = useMemo<FavCtx>(() => {
    const set = new Set(favArr);
    return {
      ids: set,
      has: (id) => set.has(id),
      toggle: (id) => setFavArr((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    };
  }, [favArr, setFavArr]);

  /* auth — fully server-side session via HttpOnly cookie */
  const [serverUser, setServerUser] = useState<User | null | undefined>(undefined);
  /**
   * Session version counter prevents a stale /api/auth/me response from overwriting a
   * fresh login/signup result that arrived later.
   */
  const sessionVersionRef = useRef(0);
  const commitServerUser = useCallback((next: User | null) => {
    sessionVersionRef.current += 1;
    setServerUser(next);
  }, []);

  useEffect(() => {
    const version = sessionVersionRef.current;
    let active = true;
    fetch("/api/auth/me", { ...SESSION_FETCH })
      .then((r) => (r.ok ? (r.json() as Promise<{ user: User | null }>) : Promise.reject()))
      .then((d) => {
        if (!active || sessionVersionRef.current !== version) return;
        setServerUser(d.user ?? null);
      })
      .catch(() => {
        if (!active || sessionVersionRef.current !== version) return;
        setServerUser(null);
      });
    return () => { active = false; };
  }, []);

  const user = serverUser === undefined ? null : serverUser;
  const authValue = useMemo<AuthCtx>(
    () => ({
      user,
      ready: serverUser !== undefined,
      login: async (email, password) => {
        if (!email.includes("@") || password.length < 4) return { ok: false, error: "invalid" };
        try {
          const r = await fetch("/api/auth/login", {
            ...SESSION_FETCH,
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const d = (await r.json()) as { ok: boolean; user?: User; error?: string };
          if (r.ok && d.ok && d.user) {
            commitServerUser(d.user);
            return { ok: true };
          }
          return { ok: false, error: d.error ?? "invalid" };
        } catch {
          return { ok: false, error: "network" };
        }
      },
      signup: async (name, email, password, role = "user", extra) => {
        if (!name || !email.includes("@") || password.length < 6) return { ok: false, error: "invalid" };
        try {
          const r = await fetch("/api/auth/signup", {
            ...SESSION_FETCH,
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, email, password, role, ...extra }),
          });
          const d = (await r.json()) as { ok: boolean; user?: User; error?: string };
          if (r.ok && d.ok && d.user) {
            commitServerUser(d.user);
            return { ok: true };
          }
          return { ok: false, error: d.error ?? "invalid" };
        } catch {
          return { ok: false, error: "network" };
        }
      },
      logout: () => {
        commitServerUser(null);
        fetch("/api/auth/logout", { ...SESSION_FETCH, method: "POST" }).catch(() => undefined);
      },
    }),
    [user, serverUser, commitServerUser],
  );

  /* search */
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const searchValue = useMemo<SearchCtx>(
    () => ({ isOpen: searchOpen, open: () => setSearchOpen(true), close: () => setSearchOpen(false) }),
    [searchOpen],
  );

  return (
    <LocaleContext.Provider value={localeValue}>
      <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
        <AuthContext.Provider value={authValue}>
          <FavContext.Provider value={favValue}>
            <CartContext.Provider value={cartValue}>
              <SearchContext.Provider value={searchValue}>{children}</SearchContext.Provider>
            </CartContext.Provider>
          </FavContext.Provider>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </LocaleContext.Provider>
  );
}
