import type { Localized } from "./i18n/types";

export type ID = string;

export interface Category {
  id: ID;
  slug: string;
  name: Localized;
  description: Localized;
  image: string;
  featured: boolean;
  order: number;
}

export interface Space {
  id: ID;
  slug: string;
  name: Localized;
  image: string;
  order: number;
}

export type ArtistStatus = "pending" | "approved" | "rejected";

export interface Artist {
  id: ID;
  slug: string;
  name: Localized;
  profession: Localized;
  bio: Localized;
  avatar: string;
  cover: string;
  location: Localized;
  social: { instagram?: string; behance?: string; website?: string };
  featured: boolean;
  followers: number;
  rating: number;
  reviewsCount: number;
  /** Free-form tags used for filtering and display (e.g. "botanical", "geometric") */
  tags?: string[];
  /** Linked user account id — set when artist registers via /creators/join */
  userId?: ID;
  /** Extra fields captured at signup time */
  signupPhone?: string;
  signupCity?: string;
  signupSpecialty?: string;
  signupPortfolioUrl?: string;
  /** Studio / brand name given by the designer at signup */
  signupStudio?: string;
  /** Years of practice, as declared at signup (free text, 1–60) */
  signupExperience?: string;
  /** Delivery formats the designer said they will upload (format ids) */
  signupFormats?: string[];
  /** Product families the designer works in (family ids) */
  signupFamilies?: string[];
  /** When the seller terms were accepted during registration */
  signupTermsAt?: string;
  /** Admin rejection note, optionally set when status → "rejected" */
  rejectionNote?: string;
  /**
   * Approval status:
   *   "pending"  — newly registered, awaiting admin review
   *   "approved" — visible on the site
   *   "rejected" — hidden; admin can re-approve
   * Seed artists and site-owned artists default to "approved".
   */
  status?: ArtistStatus;
  /** Revenue share percentage (0–100). Default: platform policy. */
  revenueSharePct?: number;
  /** License text the artist's designs are sold under */
  licenseType?: "standard" | "exclusive" | "custom";
  licenseNote?: Localized;
}

export interface PatternSpec {
  repeat: Localized;
  dpi: string;
  formats: string;
  colors: number;
  scale: Localized;
}

/**
 * A Spoonflower-style colourway: same design, different colour treatment.
 * Each colourway has its own preview image + brand hex for the swatch dot.
 */
export interface Colorway {
  id: ID;
  name: Localized;
  /** Swatch colour shown as a circle on cards */
  hex: string;
  /** Preview image for this colourway (pattern / wallpaper / fabric photo) */
  image: string;
  /** Optional extra gallery frames for this colourway */
  gallery?: string[];
  isDefault?: boolean;
}

export interface Pattern {
  id: ID;
  sku: string;
  slug: string;
  title: Localized;
  description: Localized;
  image: string;
  gallery: string[];
  categoryId: ID;
  spaceIds: ID[];
  artistId: ID | null; // null → site-owned pattern
  price: { fa: number; en: number };
  specs: PatternSpec;
  /** Accent colours inside the design (legacy / detail strip) */
  palette: string[];
  /**
   * Available colourways (Spoonflower-style). When present, cards show circular
   * swatches and the main image switches with the selected colourway.
   */
  colorways?: Colorway[];
  tags: string[];
  featured: boolean;
  trending: boolean;
  bestSeller: boolean;
  isNew: boolean;
  createdAt: string;
  likes: number;
}

export interface ColorOption {
  id: ID;
  name: Localized;
  hex: string;
  image: string;
  stock: number;
}

export interface ProductSpec {
  label: Localized;
  value: Localized;
}

export interface Product {
  id: ID;
  sku: string;
  slug: string;
  title: Localized;
  description: Localized;
  categoryId: ID;
  /**
   * Product family (see `lib/data/families.ts`) — the real surface the product is
   * made for: wallpaper, home fabric, curtain, cushion, bedspread, tablecloth,
   * upholstery fabric or wall art. Optional: products created before the taxonomy
   * exist are grouped under «سایر محصولات» in the shop.
   */
  familyId?: ID | null;
  patternId: ID | null;
  artistId: ID | null; // null → site-owned
  price: { fa: number; en: number };
  compareAt?: { fa: number; en: number };
  colors: ColorOption[];
  sizes: Localized[];
  specs: ProductSpec[];
  materials: Localized;
  featured: boolean;
  bestSeller: boolean;
  isNew: boolean;
  order: number;
}

export interface PortfolioBlock {
  type: "text" | "image" | "quote" | "pair";
  text?: Localized;
  image?: string;
  images?: string[];
  caption?: Localized;
}

export type DraftStatus = "draft" | "pending_review" | "published" | "rejected";

export interface Portfolio {
  id: ID;
  slug: string;
  title: Localized;
  subtitle: Localized;
  intro: Localized;
  story: PortfolioBlock[];
  cover: string;
  gallery: string[];
  artistId: ID | null;
  patternIds: ID[];
  productIds: ID[];
  client: Localized;
  location: Localized;
  year: number;
  scope: Localized;
  categoryId: ID;
  featured: boolean;
  isProject: boolean;
  size: "hero" | "tall" | "wide" | "square";
  /**
   * Self-service publishing workflow:
   *   draft           → saved by artist, not submitted
   *   pending_review  → submitted by artist, awaiting admin
   *   published       → approved and live on site
   *   rejected        → admin rejected (with optional rejectionNote)
   */
  draftStatus?: DraftStatus;
  rejectionNote?: string;
}

/**
 * Three distinct content types for the Academy:
 *   course   — pre-recorded instructional videos (uploaded by admin)
 *   workshop — can be online (live session link) or offline (in-person)
 *   webinar  — always online, streamed via device camera/mic
 */
export type EducationType = "course" | "workshop" | "webinar";
export type Difficulty = "beginner" | "intermediate" | "advanced";

export type ReservationStatus = "reserved" | "cancelled" | "attended";

export interface AcademyReservation {
  id: ID;
  eventSlug: string;
  /** "course" entries are self-paced enrollments; workshop/webinar entries are live-event seats. */
  eventType: "course" | "workshop" | "webinar";
  eventTitle: Localized;
  startsAt: string;
  userId?: ID;
  name: string;
  email: string;
  createdAt: string;
  status: ReservationStatus;
  reminderSentAt?: string;
}

export type LiveEventStatus = "scheduled" | "live" | "ended" | "cancelled";

/** A single uploaded video file for a course lesson */
export interface CourseVideoFile {
  id: string;
  title: Localized;
  /** Public URL of the uploaded video */
  url: string;
  /** File size in bytes */
  sizeBytes?: number;
  /** Duration in seconds */
  durationSec?: number;
  /** Whether this video is free to preview */
  free?: boolean;
  /** Upload timestamp ISO string */
  uploadedAt: string;
}

export interface LessonItem {
  id: string;
  title: Localized;
  durationMin: number;
  free?: boolean;
}

/** Webinar live-stream configuration (camera/mic based broadcast) */
export interface WebinarStreamConfig {
  /**
   * Stream source:
   *   "camera"   — admin streams directly from browser camera (WebRTC)
   *   "external" — admin provides an external RTMP/HLS stream URL
   */
  source: "camera" | "external";
  /** External RTMP ingest URL (when source = "external") */
  rtmpUrl?: string;
  /** External HLS playback URL for viewers (when source = "external") */
  hlsUrl?: string;
  /** Whether chat is enabled during the webinar */
  chatEnabled?: boolean;
  /** Whether Q&A panel is enabled */
  qaEnabled?: boolean;
  /** Max simultaneous viewers (0 = unlimited) */
  maxViewers?: number;
}

/**
 * Live / event configuration — shared by workshops and webinars.
 * For workshops: isOnline=false means in-person (no meetLink required).
 * For webinars: always online, uses webinarStream config.
 */
export interface LiveEventConfig {
  /** ISO datetime string of the event start */
  startsAt: string;
  /** Duration in minutes */
  durationMin: number;
  /** Maximum number of participants (0 = unlimited) */
  capacity: number;
  /** Current registered participants count */
  registeredCount: number;
  /**
   * Whether this event is online (true) or offline/in-person (false).
   * Webinars are always online. Workshops can be either.
   */
  isOnline: boolean;
  /** Online meeting link (Zoom, Google Meet, etc.) — required when isOnline=true for workshops */
  meetLink?: string;
  /** Platform label shown to users (e.g. "Zoom", "Google Meet") */
  platform?: string;
  /** Physical venue address — used when isOnline=false */
  venue?: Localized;
  /** Current status of the live event */
  status: LiveEventStatus;
  /** Recording URL or uploaded video URL — available after the event ends */
  recordingUrl?: string;
  /** Whether the recording is downloadable by registered users */
  recordingDownloadable?: boolean;
  /** Whether the recording is publicly available (not just for registrants) */
  recordingPublic?: boolean;
  /** Instructor / host name override (if different from author) */
  hostName?: Localized;
  /** Whether the custom instructor / host name is enabled */
  hostNameCustom?: boolean;
  /** Certificate issued after attendance */
  certificateEnabled?: boolean;
  /** Tags / topics covered in the event */
  tags?: string[];
  /** Webinar-specific stream config (only relevant for type="webinar") */
  webinarStream?: WebinarStreamConfig;
}

export interface EducationItem {
  id: ID;
  slug: string;
  type: EducationType;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  image: string;
  authorId: ID;
  difficulty: Difficulty;
  durationMin: number;
  lessons: number;
  /** Detailed lesson list — when present, replaces the auto-generated numbered list */
  lessonList?: LessonItem[];
  /**
   * Uploaded video files for courses.
   * Each entry = one lesson video. Only relevant for type="course".
   */
  videoFiles?: CourseVideoFile[];
  price?: { fa: number; en: number };
  categoryId: ID;
  patternIds: ID[];
  productIds: ID[];
  featured: boolean;
  popular: boolean;
  publishedAt: string;
  /** Live event configuration — required for type "workshop" or "webinar" */
  liveEvent?: LiveEventConfig;
  /** Same draft/publish workflow as Portfolio */
  draftStatus?: DraftStatus;
  rejectionNote?: string;
}

export interface Story {
  id: ID;
  slug: string;
  artistId: ID;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  image: string;
  publishedAt: string;
}

export interface Collection {
  id: ID;
  slug: string;
  title: Localized;
  description: Localized;
  cover: string;
  patternIds: ID[];
  productIds: ID[];
}

export type HomeSectionKey =
  | "hero"
  | "discovery"
  | "trending"
  | "bestSellers"
  | "newPatterns"
  | "artists"
  | "portfolios"
  | "styles"
  | "spaces"
  | "exclusive"
  | "projects"
  | "education"
  | "b2b"
  | "custom"
  | "stories"
  | "newsletter";

export interface HomeSection {
  key: HomeSectionKey;
  enabled: boolean;
  order: number;
}

export interface Banner {
  id: ID;
  title: Localized;
  text: Localized;
  href: string;
  enabled: boolean;
  placement: "top" | "shop" | "academy";
}

/**
 * نوار اعلان بالای سایت (announcement bar) — مستقل از رویدادهای آکادمی.
 * چهار نوع ثابت وجود دارد: وبینار، حراجی، سفارشی (custom) و غیرفعال.
 *
 * - `kind = "webinar"`:  نوار مخصوص وبینار / رویداد آموزشی با تایمر شمارش معکوس اختیاری
 * - `kind = "sale"`:     نوار حراجی / تخفیف ویژه
 * - `kind = "custom"`:   نوار آزاد برای هر اطلاعیه دیگری
 *
 * هر نوار دارای یک لینک کلیک‌پذیر `href` است که کاربر را به صفحه مورد نظر هدایت می‌کند.
 */
/**
 * انواع نوار اعلان:
 *   webinar      — نوار تبلیغ وبینار با متن دلخواه
 *   sale         — نوار حراجی / تخفیف
 *   custom       — نوار آزاد برای هر پیامی
 *   live-webinar — نوار ویژه وبینار زنده: فقط زمانی نمایش داده می‌شود که
 *                  یک رویداد آکادمی با status="live" وجود داشته باشد.
 *                  نام رویداد به صورت خودکار از آکادمی گرفته می‌شود،
 *                  ولی پیام پیشوند، دکمه CTA و رنگ‌ها قابل ویرایش هستند.
 */
export type AnnouncementBarKind = "live-webinar" | "webinar" | "sale" | "custom";

/**
 * نوع انیمیشن ورود نوار اعلان به صفحه.
 *   slide-down  — از بالا به پایین اسلاید می‌شود (پیش‌فرض)
 *   fade        — محو می‌شود
 *   blur-in     — از حالت تار به واضح
 *   bounce      — اسلاید با اثر bounce
 */
export type AnnouncementBarTransition = "slide-down" | "fade" | "blur-in" | "bounce";
export type AnnouncementBarDirection = "rtl" | "ltr";
export type AnnouncementBarMotion = "animated" | "soft" | "static";

export interface AnnouncementBarConfig {
  id: ID;
  kind: AnnouncementBarKind;
  enabled: boolean;
  /** متن نوار به دو زبان — برای live-webinar این متن قبل از نام رویداد نمایش داده می‌شود */
  message: Localized;
  /** لینک مقصد هنگام کلیک روی نوار — برای live-webinar می‌توان خالی گذاشت (لینک رویداد خودکار می‌شود) */
  href: string;
  /** برچسب دکمه CTA */
  ctaLabel?: Localized;
  /** رنگ پس‌زمینه (CSS) — اگر خالی باشد از رنگ پیش‌فرض نوع استفاده می‌شود */
  bgColor?: string;
  /** رنگ متن (CSS) */
  textColor?: string;
  /** نوع انیمیشن ورود نوار */
  transition?: AnnouncementBarTransition;
  /** جهت ورود مستقل از زبان صفحه */
  direction?: AnnouncementBarDirection;
  /** شدت حرکت: کامل، نرم یا بدون حرکت */
  motion?: AnnouncementBarMotion;
  /**
   * تاریخ پایان نمایش (ISO string اختیاری).
   * اگر تنظیم شود، نوار بعد از این زمان به صورت خودکار پنهان می‌شود.
   * برای live-webinar این فیلد نادیده گرفته می‌شود (خودکار بعد از پایان رویداد پنهان می‌شود).
   */
  expiresAt?: string;
}

export interface SeoMeta {
  path: string;
  title: Localized;
  description: Localized;
}

export interface HeroContent {
  eyebrow: Localized;
  titleA: Localized;
  titleB: Localized;
  description: Localized;
  image: string;
  images?: string[];
  video?: string;
  ctaHref: string;
  cta2Href: string;
  featuredPatternIds: ID[];
  /** اگر true باشد تصاویر پس‌زمینه به صورت اسلایدر خودکار (تایمر) نمایش داده می‌شوند */
  sliderMode?: boolean;
  /** اگر false باشد افکت پارالاکس اسکرول غیرفعال می‌شود */
  parallaxEnabled?: boolean;
  /** اگر false باشد انیمیشن‌های تعاملی (hover/scroll) غیرفعال می‌شوند */
  interactiveEnabled?: boolean;
}

export interface SiteContent {
  categories: Category[];
  spaces: Space[];
  artists: Artist[];
  patterns: Pattern[];
  products: Product[];
  portfolios: Portfolio[];
  education: EducationItem[];
  stories: Story[];
  collections: Collection[];
  homeSections: HomeSection[];
  banners: Banner[];
  seo: SeoMeta[];
  hero: HeroContent;
  /** نوارهای اعلان قابل تنظیم از پنل ادمین */
  announcementBars: AnnouncementBarConfig[];
}

export type CollectionKey = Exclude<keyof SiteContent, "hero">;
