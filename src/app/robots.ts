import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Robots are generated per build and revalidated hourly — no admin secrets, no PII, no API. */
export const revalidate = 3600;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/fa/admin", "/en/admin", "/fa/checkout", "/en/checkout", "/fa/account", "/en/account", "/fa/login", "/en/login", "/fa/signup", "/en/signup"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
