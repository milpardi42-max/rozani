import { ArtistDashboardView } from "@/components/artist/ArtistDashboardView";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { getArtistDashboard } from "@/lib/artist/dashboard";
import type { Locale } from "@/lib/i18n/types";
import { href } from "@/lib/utils";

/**
 * The artist dashboard itself — one component for every route that shows it.
 *
 * `/{locale}/artist` is the canonical page, and `/{locale}/account` renders this
 * same panel for artists / designers, so the profile page of a designer *is* the
 * artist dashboard and nothing else: no buyer sidebar sections, no orders,
 * no reservations — the two routes carry byte-for-byte the same content.
 */
export async function ArtistDashboardPanel({
  locale,
  userId,
  artistId,
}: {
  locale: Locale;
  userId: string;
  artistId?: string | null;
}) {
  const fa = locale === "fa";
  const data = await getArtistDashboard({ artistId: artistId ?? null, userId });

  return (
    <div className="container-x pt-[calc(var(--header-h)+1.5rem)] pb-24">
      <Breadcrumb
        items={[
          { label: fa ? "خانه" : "Home", href: href(locale, "/") },
          { label: fa ? "پنل هنرمند" : "Artist" },
          { label: fa ? "داشبورد" : "Dashboard" },
        ]}
        locale={locale}
        className="mb-6"
      />
      <ArtistDashboardView locale={locale} data={data} />
    </div>
  );
}
