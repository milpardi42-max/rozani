import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/types";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";

function isOwnerEmail(email: string): boolean {
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail) return false;
  return email.toLowerCase() === ownerEmail;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* -------- مسیرهای پنل ادمین (/admin/[locale]/) -------- */
  // این مسیرها از layout سایت جدا هستند
  const adminMatch = pathname.match(/^\/admin\/([^/]+)(\/.*)?$/);
  if (adminMatch) {
    const rest = adminMatch[2] ?? "";

    // صفحه لاگین ادمین نیازی به بررسی نشست ندارد
    if (rest === "/login" || rest === "/login/") return NextResponse.next();

    // بقیه مسیرهای ادمین نیاز به نقش admin دارند
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    const session = await readSessionToken(sessionToken);
    if (!session || session.role !== "admin") {
      const locale = adminMatch[1];
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/admin/${locale}/login`;
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  /* -------- i18n locale prefix (برای مسیرهای سایت اصلی) -------- */
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (!hasLocale) {
    const cookie = req.cookies.get("ra-locale")?.value;
    const locale = LOCALES.includes(cookie as never) ? cookie : DEFAULT_LOCALE;
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  /* -------- Protected routes (سایت اصلی) -------- */
  const segments = pathname.split("/").filter(Boolean);
  const rest = segments.slice(1).join("/");

  const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(sessionToken);

  /*
   * /[locale]/artist — the seller area.
   *
   * Signed-out visitors go to the login page. A signed-in *buyer* is let
   * through on purpose: both /artist and /artist/marketplace explain that the
   * area is for artists and point at the designer registration, which is far
   * friendlier than a login form for an account that cannot open it. The
   * artist APIs keep enforcing the role themselves.
   */
  if (rest === "artist" || rest.startsWith("artist/")) {
    if (!session) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${segments[0]}/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // /[locale]/owner/* — requires owner email or admin role
  if (rest === "owner" || rest.startsWith("owner/")) {
    const isOwnerSession =
      session && (session.role === "admin" || isOwnerEmail(session.email));
    if (!isOwnerSession) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${segments[0]}/login`;
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|fonts|images|favicon.ico|.*\\..*).*)"],
};
