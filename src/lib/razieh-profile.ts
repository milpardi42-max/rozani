/**
 * The founder's profile — the content of the introduction that opens the
 * portfolio page (/{locale}/portfolio).
 *
 * Kept as plain data (not dictionaries) so both the portfolio page and any
 * future surface can render it, and so the copy lives in one editable place.
 * Every string is bilingual: `fa` is the primary voice, `en` its translation.
 */
import type { Localized } from "@/lib/i18n/types";

const L = (fa: string, en: string): Localized => ({ fa, en });

export interface ProfileStat {
  value: Localized;
  label: Localized;
}

export interface ProfileFact {
  label: Localized;
  value: Localized;
}

export interface ProfileMilestone {
  period: Localized;
  title: Localized;
  text: Localized;
}

export const RAZIEH_PROFILE = {
  eyebrow: L("معرفی بنیان‌گذار", "About the founder"),

  name: L("راضیه خیری‌پور", "Razieh Kheiripour"),
  latin: "Razieh Kheiripour",

  role: L(
    "طراح الگو، کاغذدیواری، پارچه و پرده · استادیار هنرهای تزئینی",
    "Pattern, wallpaper, textile & drapery designer · Assistant professor of decorative arts",
  ),

  portraitAlt: L(
    "میز کار راضیه خیری‌پور؛ اسکچ‌های بوته‌جقه، پالت آبرنگ و نمونه‌پارچه‌ها",
    "Razieh Kheiripour's worktable — boteh sketches, a watercolour palette and fabric swatches",
  ),

  since: L("از سال ۱۳۸۸", "Studio practice since 2009"),

  /** The complete introduction, in order. */
  bio: [
    L(
      "راضیه خیری‌پور طراح الگو، کاغذدیواری، پارچه و پرده است؛ طراحی که کارش را از دل نقوش ایرانی و منطق تکرار آغاز می‌کند و آن را تا کف کارگاه‌های تولید امروز پیش می‌برد. بیش از پانزده سال است که در فاصله‌ی میان دو جهان کار می‌کند: از یک‌سو پژوهش و آموزش آکادمیک هنرهای تزئینی، و از سوی دیگر طراحیِ کاربردی برای دیوار، پارچه و فضا.",
      "Razieh Kheiripour is a pattern, wallpaper, textile and drapery designer who begins her work inside Iranian ornament and the logic of repetition, and takes it all the way to the floor of today's production workshops. For more than fifteen years she has worked in the space between two worlds: academic research and teaching in the decorative arts on one side, and applied design for walls, textiles and space on the other.",
    ),
    L(
      "نقطه‌ی شروع کار او همیشه نقش‌مایه است: بوته، اسلیمی، گل و مرغ، ترنج و هندسه‌های اسلامی. این نقش‌مایه‌ها در استودیوی او بازخوانی می‌شوند — ساده‌تر، سبک‌تر و آماده‌ی تکرار بی‌پایان؛ تا جایی که از یک اسکچ روی کاغذ به یک الگوی بی‌درزِ آماده‌ی چاپ دیجیتال، یک رول کاغذدیواری یا یک پرده‌ی دوخته‌شده تبدیل شوند.",
      "Her starting point is always the motif itself: boteh, arabesque, gol-o-morgh, medallion and Islamic geometry. In her studio those motifs are re-read — lighter, simpler, ready for endless repetition — until a sketch on paper becomes a seamless digital print file, a roll of wallpaper, or a finished drapery panel.",
    ),
    L(
      "روش او تکنیک‌محور است: طراحی و اسکچ دستی، رنگ‌آمیزی با گواش و آبرنگ، دیجیتالی‌کردن و ساخت تکرار هندسی، آماده‌سازی فایل‌های رزولوشن بالا و اصلاح رنگ بر اساس روش تولید — از چاپ دیجیتال تا بافت پارچه. برای او خروجی نهایی یک تصویر قشنگ نیست؛ یک محصولِ قابل تولید است که باید هم روی دیوار درست بنشیند و هم در انبار و کارگاه قابل تکرار باشد.",
      "Her method is technique-led: hand sketching, gouache and watercolour studies, digitising and building the repeating geometry, preparing high-resolution deliverables and colour-correcting for each production route — from digital printing to woven texture. To her the outcome is never just a pretty image; it is a manufacturable product that must sit right on the wall and repeat reliably in the workshop.",
    ),
    L(
      "تدریس و پژوهش بخش جدانشدنی کار اوست: انتقال تجربه‌ی کارگاه طراحی الگو به دانشجویان هنرهای تزئینی و همراهی پروژه‌های عملی تا مرحله‌ی تولید. همین تجربه در آکادمی رزی به‌شکل درس، کارگاه و جلسه‌ی زنده در اختیار طراحان جوان‌تر قرار می‌گیرد.",
      "Teaching and research are inseparable from her practice: carrying the pattern-design workshop into the classroom for decorative-arts students, and following practical projects through to production. That same experience is what the Rosie Academy offers younger designers today as courses, workshops and live sessions.",
    ),
    L(
      "رزی آتلیه حاصل همین نگاه است؛ جایی که آثار او در کنار آثار طراحان مستقل دیگر عرضه می‌شود، سفارش‌های سازمانی و تولید سفارشی پذیرفته می‌شود و مسیرِ دیده‌شدن و درآمد منصفانه برای طراحان باز می‌ماند. این صفحه، پنجره‌ی ورود به همان مسیر است.",
      "Rosie Atelier is the product of that view: a place where her own works sit beside those of independent designers, where institutional commissions and custom production are accepted, and where the path to being seen and paid fairly stays open. This page is the doorway into that path.",
    ),
  ] as Localized[],

  /** Small chips under the role line. */
  disciplines: [
    L("الگو", "Pattern"),
    L("کاغذدیواری", "Wallpaper"),
    L("پارچه", "Textile"),
    L("پرده", "Drapery"),
    L("نقوش سنتی", "Traditional motifs"),
    L("طراحی برای تولید", "Design for production"),
  ] as Localized[],

  stats: [
    { value: L("+۱۵", "15+"), label: L("سال تجربه‌ی طراحی", "Years of design practice") },
    { value: L("+۲۰۰", "200+"), label: L("الگو و طرح خلق‌شده", "Patterns and surface designs") },
    { value: L("۱۲", "12"), label: L("نمایشگاه داخلی و بین‌المللی", "National & international exhibitions") },
    { value: L("+۱٫۲k", "1.2k+"), label: L("دانشجو و همراه آکادمی", "Students and academy members") },
  ] as ProfileStat[],

  timelineTitle: L("مسیر حرفه‌ای", "Professional path"),
  timeline: [
    {
      period: L("۱۳۸۸ · ۲۰۰۹", "2009"),
      title: L("آغاز فعالیت حرفه‌ای", "A studio of her own"),
      text: L(
        "شروع کار مستقل در طراحی الگو و سطح؛ سالی که استودیوی شخصی با نام R.K شکل گرفت و نخستین مجموعه‌های نقش‌مایه‌محور طراحی شدند.",
        "She began working independently in pattern and surface design — the year the R.K studio took shape and the first motif-led collections were drawn.",
      ),
    },
    {
      period: L("۱۳۹۰ تا امروز", "Since the 2010s"),
      title: L("تدریس و پژوهش دانشگاهی", "Teaching and academic research"),
      text: L(
        "آموزش طراحی الگو و منسوجات در گروه هنرهای تزئینی، و پژوهش در بازخوانی نقوش ایرانی برای تولید معاصر.",
        "Teaching pattern and textile design in the decorative arts, and researching how Iranian motifs can be re-read for contemporary production.",
      ),
    },
    {
      period: L("۱۴۰۲ · ۲۰۲۳", "2023"),
      title: L("تأسیس رزی آتلیه", "Rosie Atelier is founded"),
      text: L(
        "راه‌اندازی اکوسیستمی از مارکت‌پلیس الگو، فروشگاه محصولات اختصاصی، گالری پورتفولیو و آکادمی — با این ایده که الگوهای خوب باید راهی مستقیم به دیوار و پارچه داشته باشند.",
        "An ecosystem of a pattern marketplace, an exclusive product store, a portfolio gallery and an academy — built on the idea that good patterns deserve a direct path to walls and textiles.",
      ),
    },
    {
      period: L("امروز", "Today"),
      title: L("آتلیه، آکادمی و همکاری با صنعت", "Studio, academy and industry work"),
      text: L(
        "همکاری با معماران، برندهای دکوراسیون و مجموعه‌های مهمان‌نوازی؛ پذیرش سفارش سازمانی، تولید سفارشی و برگزاری کارگاه و جلسه‌ی زنده.",
        "Working with architects, décor brands and hospitality projects — institutional commissions, custom production, workshops and live sessions.",
      ),
    },
  ] as ProfileMilestone[],

  factsTitle: L("در یک نگاه", "At a glance"),
  facts: [
    { label: L("جایگاه دانشگاهی", "Academic role"), value: L("استادیار گروه هنرهای تزئینی", "Assistant professor, decorative arts") },
    { label: L("حوزه‌ی کار", "Field of work"), value: L("الگو · کاغذدیواری · پارچه · پرده", "Pattern · wallpaper · textile · drapery") },
    { label: L("مستقر در", "Based in"), value: L("تهران، ایران", "Tehran, Iran") },
    { label: L("زبان‌ها", "Languages"), value: L("فارسی · انگلیسی", "Persian · English") },
  ] as ProfileFact[],

  signatureRole: L("بنیان‌گذار رزی آتلیه · طراح الگو", "Founder of Rosie Atelier · Pattern designer"),
  monogram: "R.K",

  ctaWorks: L("آثار و پروژه‌های اجراشده", "Works & realised projects"),
  ctaPersonal: L("پورتفولیوی شخصی راضیه", "Razieh's personal portfolio"),

  collaboration: {
    title: L("همکاری، سفارش سازمانی یا کارگاه", "Collaboration, commissions or workshops"),
    text: L(
      "برای پروژه‌های سفارشی، تولید اختصاصی، همکاری با برندها یا برگزاری کارگاه و جلسه‌ی زنده در آکادمی رزی، راه‌های زیر باز است.",
      "For custom projects, exclusive production, brand collaborations or hosting a workshop and live session at Rosie Academy, these are the ways in.",
    ),
    links: [
      { label: L("تماس با ما", "Contact us"), path: "/contact" },
      { label: L("آکادمی رزی", "Rosie Academy"), path: "/academy" },
      { label: L("درباره‌ی آتلیه", "About the atelier"), path: "/about" },
      { label: L("همکاری به‌عنوان طراح", "Join as a designer"), path: "/creators/join" },
    ] as { label: Localized; path: string }[],
  },

  /** Where the introduction goes on to: the artist's own portfolio page. */
  personalPortfolio: {
    label: L("پورتفولیوی شخصی", "Personal portfolio"),
    href: "/razieh",
    note: L(
      "صفحه‌ی اختصاصی راضیه: هیرو، نمونه‌کارها، فلسفه، بخش آکادمیک و تماس — با امکان جابه‌جایی زبان.",
      "Razieh's own page: hero, works, philosophy, academic section and contact — with a language switch.",
    ),
  },
} as const;

export type RaziehProfile = typeof RAZIEH_PROFILE;
