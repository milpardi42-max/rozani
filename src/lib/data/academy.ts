import "server-only";
import type { AcademyReservation, CourseVideoFile, EducationItem, SiteContent } from "../types";
import { getAllReservations } from "./reservations";

/**
 * Real academy numbers.
 *
 * Everything the academy page shows as a metric is computed here from content the
 * admin actually published (courses, lessons, uploaded videos, live events) plus
 * the registrations that actually happened (`data/reservations.json`). Nothing is
 * estimated: if there is no data for a metric, the metric reports 0 and the UI
 * hides it instead of inventing a number.
 */

export interface AcademyItemStats {
  enrollments: number;
  /** Seat cap for live events (0 = unlimited). */
  capacity: number;
  seatsLeft: number | null;
  videos: number;
  freeVideos: number;
  lessons: number;
  minutes: number;
}

export interface AcademyInstructorStats {
  authorId: string;
  items: number;
  courses: number;
  events: number;
  lessons: number;
  videos: number;
}

export interface AcademyOverview {
  items: number;
  courses: number;
  workshops: number;
  webinars: number;
  lessons: number;
  minutes: number;
  videos: number;
  freeVideos: number;
  filesizeBytes: number;
  instructors: number;
  categories: number;
  enrollments: number;
  students: number;
  upcomingEvents: number;
  liveNow: number;
  bySlug: Record<string, AcademyItemStats>;
  instructorStats: AcademyInstructorStats[];
}

export function lessonCount(item: EducationItem): number {
  return item.lessonList?.length || item.lessons || 0;
}

export function lessonMinutes(item: EducationItem): number {
  const listed = item.lessonList?.reduce((sum, lesson) => sum + (lesson.durationMin ?? 0), 0) ?? 0;
  return listed || item.durationMin || 0;
}

/** The video the hero plays: a free preview if one was uploaded, otherwise the first video. */
export function previewVideoOf(item: EducationItem | null | undefined): CourseVideoFile | null {
  if (!item?.videoFiles?.length) return null;
  return item.videoFiles.find((video) => video.free) ?? item.videoFiles[0];
}

export function academyOverview(site: SiteContent, reservations: AcademyReservation[]): AcademyOverview {
  const active = reservations.filter((reservation) => reservation.status !== "cancelled");
  const bySlug: Record<string, AcademyItemStats> = {};

  for (const item of site.education) {
    const registered = active.filter((reservation) => reservation.eventSlug === item.slug).length;
    const capacity = item.type === "course" ? 0 : item.liveEvent?.capacity ?? 0;
    bySlug[item.slug] = {
      enrollments: registered,
      capacity,
      seatsLeft: capacity > 0 ? Math.max(0, capacity - registered) : null,
      videos: item.videoFiles?.length ?? 0,
      freeVideos: item.videoFiles?.filter((video) => video.free).length ?? 0,
      lessons: lessonCount(item),
      minutes: lessonMinutes(item),
    };
  }

  const instructors = new Map<string, AcademyInstructorStats>();
  for (const item of site.education) {
    const stats = instructors.get(item.authorId) ?? {
      authorId: item.authorId,
      items: 0,
      courses: 0,
      events: 0,
      lessons: 0,
      videos: 0,
    };
    stats.items += 1;
    if (item.type === "course") stats.courses += 1;
    else stats.events += 1;
    stats.lessons += lessonCount(item);
    stats.videos += item.videoFiles?.length ?? 0;
    instructors.set(item.authorId, stats);
  }

  const videoFiles = site.education.flatMap((item) => item.videoFiles ?? []);
  const categoriesUsed = new Set(site.education.map((item) => item.categoryId));

  return {
    items: site.education.length,
    courses: site.education.filter((item) => item.type === "course").length,
    workshops: site.education.filter((item) => item.type === "workshop").length,
    webinars: site.education.filter((item) => item.type === "webinar").length,
    lessons: site.education.reduce((sum, item) => sum + lessonCount(item), 0),
    minutes: site.education.reduce((sum, item) => sum + lessonMinutes(item), 0),
    videos: videoFiles.length,
    freeVideos: videoFiles.filter((video) => video.free).length,
    filesizeBytes: videoFiles.reduce((sum, video) => sum + (video.sizeBytes ?? 0), 0),
    instructors: instructors.size,
    categories: categoriesUsed.size,
    enrollments: active.length,
    students: new Set(active.map((reservation) => reservation.email)).size,
    upcomingEvents: site.education.filter((item) => item.liveEvent?.status === "scheduled").length,
    liveNow: site.education.filter((item) => item.liveEvent?.status === "live").length,
    bySlug,
    instructorStats: [...instructors.values()].sort((a, b) => b.lessons - a.lessons || b.items - a.items),
  };
}

/** Reservations for one item, newest first — used by the course page and the admin console. */
export async function reservationsFor(slug: string): Promise<AcademyReservation[]> {
  const all = await getAllReservations();
  return all
    .filter((reservation) => reservation.eventSlug === slug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function formatHours(minutes: number): { fa: string; en: string } {
  const hours = minutes / 60;
  const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
  return { fa: `${rounded.toLocaleString("fa-IR")} ساعت`, en: `${rounded} h` };
}
