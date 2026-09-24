import { unstable_noStore as noStore } from "next/cache";
import { getSite } from "@/lib/data/queries";
import { AnnouncementBar } from "./AnnouncementBar";
import type { EducationItem } from "@/lib/types";

function pickEvent(education: EducationItem[]): EducationItem | null {
  const live = education.find(
    (e) =>
      (e.type === "webinar" || e.type === "workshop") &&
      e.liveEvent?.status === "live"
  );
  if (live) return live;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  return (
    education
      .filter((e) => {
        if (e.type !== "webinar" && e.type !== "workshop") return false;
        if (!e.liveEvent?.startsAt) return false;
        if (e.liveEvent.status !== "scheduled") return false;
        const ms = new Date(e.liveEvent.startsAt).getTime() - now;
        return ms > 0 && ms <= thirtyDays;
      })
      .sort(
        (a, b) =>
          new Date(a.liveEvent!.startsAt).getTime() -
          new Date(b.liveEvent!.startsAt).getTime()
      )[0] ?? null
  );
}

export async function AnnouncementBarServer() {
  // Opt out of caching so bar changes from admin take effect immediately
  noStore();

  const site = await getSite();
  const event = pickEvent(site.education);

  return (
    <AnnouncementBar
      event={event}
      configBars={site.announcementBars ?? []}
    />
  );
}
