/** Bilingual translations for Razieh Kheiripour portfolio */

export type Lang = "fa" | "en";
export type Bilingual = { fa: string; en: string };

export const tr: Record<string, Bilingual> = {
  /* ---------- nav ---------- */
  about:       { fa: "درباره",        en: "About" },
  works:       { fa: "نمونه‌کارها",   en: "Works" },
  academic:    { fa: "آکادمیک",       en: "Academic" },
  contact:     { fa: "تماس",          en: "Contact" },
  atelier:     { fa: "رزی آتلیه",     en: "Rosie Atelier" },
  founded:     { fa: "تأسیس ۱۳۸۸",   en: "Est. 2009" },

  /* ---------- hero ---------- */
  heroSub:     { fa: "طراح الگو · پارچه · پرده · کاغذ دیواری", en: "Pattern · Textile · Drapery · Wallpaper" },
  heroName1:   { fa: "راضیه",         en: "Razieh" },
  heroName2:   { fa: "خیری‌پور",      en: "Kheiripour" },
  heroDesc:    {
    fa: "خلق زبانِ بصری در بافت‌ها و سطوح — جایی که هنر ایرانی با طراحی معاصر پیوند می‌خورد.",
    en: "Creating a visual language in textures and surfaces — where Iranian art meets contemporary design.",
  },
  scrollDown:  { fa: "اسکرول",        en: "Scroll" },
  tagPattern:  { fa: "الگو",           en: "Pattern" },
  tagWallpaper:{ fa: "کاغذ دیواری",   en: "Wallpaper" },
  tagTextile:  { fa: "پارچه",          en: "Textile" },
  tagDrapery:  { fa: "پرده",           en: "Drapery" },

  /* ---------- about ---------- */
  aboutLabel:  { fa: "درباره هنرمند",  en: "About the Artist" },
  aboutTitle:  { fa: "از الگو تا فضا", en: "From Pattern to Space" },
  aboutBio1:   {
    fa: "راضیه خیری‌پور، استادیار گروه هنرهای تزئینی، بیش از پانزده سال است که در تقاطع هنر سنتی ایران و طراحی معاصر آثار می‌آفریند. پژوهش‌ها و آثار او به طراحی الگو، کاغذ دیواری، پارچه و پرده اختصاص دارد.",
    en: "Razieh Kheiripour, assistant professor in decorative arts, has been creating works at the intersection of traditional Iranian art and contemporary design for over fifteen years. Her research and works focus on pattern design, wallpaper, textile and drapery.",
  },
  aboutBio2:   {
    fa: "رویکرد او در آموزش و خلق اثر بر باز‌خوانی نقوش بومی و ادغام آن‌ها با روش‌های تولید امروزی استوار است. این پیوند، زبانی بصری می‌سازد که هم ریشه دارد و هم در گفتگو با دنیای مدرن است.",
    en: "Her approach in both teaching and creating rests on reinterpreting indigenous motifs and integrating them with contemporary production methods, forging a visual language that is both rooted and in dialogue with the modern world.",
  },
  aboutBio3:   {
    fa: "آثار او در دوازده نمایشگاه داخلی و بین‌المللی به نمایش درآمده‌اند و مجموعه‌های خصوصی و عمومی متعددی این آثار را در برمی‌گیرند.",
    en: "Her works have been shown in twelve national and international exhibitions, with multiple private and public collections holding her pieces.",
  },
  experience:  { fa: "+۱۵ سال تجربه", en: "15+ Years Experience" },
  stat1Val:    { fa: "+۲۰۰",          en: "200+" },
  stat1Label:  { fa: "الگوی خلق‌شده", en: "Patterns Created" },
  stat2Val:    { fa: "۱۲",            en: "12" },
  stat2Label:  { fa: "نمایشگاه",      en: "Exhibitions" },
  stat3Val:    { fa: "+۱.۲k",         en: "1.2k+" },
  stat3Label:  { fa: "دانشجو",        en: "Students" },

  /* ---------- portfolio ---------- */
  portfolioLabel: { fa: "آثار",           en: "Works" },
  portfolioTitle: { fa: "نمونه‌کارها",    en: "Portfolio" },
  portfolioDesc:  {
    fa: "گزیده‌ای از پروژه‌های طراحی الگو، کاغذ دیواری، پارچه و پرده.",
    en: "A selection of pattern design, wallpaper, textile, and drapery projects.",
  },
  filterAll:      { fa: "همه",            en: "All" },
  filterPattern:  { fa: "الگو",           en: "Pattern" },
  filterWallpaper:{ fa: "کاغذ دیواری",   en: "Wallpaper" },
  filterTextile:  { fa: "پارچه",          en: "Textile" },
  filterDrapery:  { fa: "پرده",           en: "Drapery" },
  viewDetails:    { fa: "مشاهده جزئیات", en: "View Details" },
  close:          { fa: "بستن",          en: "Close" },

  /* ---------- philosophy ---------- */
  quote: {
    fa: "«الگو، زبانِ سکوتِ سطح است — هر خط، روایتی از زمین و آسمان.»",
    en: "«Pattern is the silent language of surfaces — every line, a narrative of earth and sky.»",
  },

  /* ---------- academic ---------- */
  academicLabel:    { fa: "آموزش",              en: "Teaching" },
  academicTitle:    { fa: "آموزش زبان الگو",    en: "Teaching the Language of Pattern" },
  academicDesc:     {
    fa: "تدریس در دانشگاه هنر با تمرکز بر طراحی الگو و هنرهای تزئینی.",
    en: "Teaching at the University of Art with a focus on pattern design and decorative arts.",
  },
  deptLabel:   { fa: "گروه هنرهای تزئینی", en: "Decorative Arts Department" },
  rankLabel:   { fa: "استادیار",            en: "Assistant Professor" },
  ach1Val:     { fa: "+۲۰۰",               en: "200+" },
  ach1Label:   { fa: "الگوی آموزشی",       en: "Teaching Patterns" },
  ach2Val:     { fa: "۱۲",                 en: "12" },
  ach2Label:   { fa: "نمایشگاه",           en: "Exhibitions" },
  ach3Val:     { fa: "+۱.۲k",              en: "1.2k+" },
  ach3Label:   { fa: "دانشجو فارغ‌التحصیل", en: "Graduates" },
  ach4Val:     { fa: "۱۵+",               en: "15+" },
  ach4Label:   { fa: "سال تدریس",          en: "Years Teaching" },
  coursesTitle:{ fa: "دروس",               en: "Courses" },

  /* ---------- contact ---------- */
  contactLabel: { fa: "تماس با من",          en: "Get in Touch" },
  contactTitle: { fa: "بیایید همکاری کنیم", en: "Let's Collaborate" },
  contactDesc:  {
    fa: "برای پروژه‌های سفارشی، کارگاه‌ها یا همکاری آکادمیک با من در تماس باشید.",
    en: "For custom projects, workshops, or academic collaboration, feel free to reach out.",
  },
  emailLabel:  { fa: "ایمیل",   en: "Email" },
  addressLabel:{ fa: "آدرس",    en: "Address" },
  addressVal:  { fa: "تهران، دانشگاه هنر", en: "Tehran, University of Art" },
  nameField:   { fa: "نام",     en: "Name" },
  emailField:  { fa: "ایمیل",  en: "Email" },
  subjectField:{ fa: "موضوع",  en: "Subject" },
  messageField:{ fa: "پیام",   en: "Message" },
  sendBtn:     { fa: "ارسال",   en: "Send" },
  successMsg:  {
    fa: "پیام شما با موفقیت ارسال شد. به زودی پاسخ می‌دهم.",
    en: "Your message was sent successfully. I'll get back to you soon.",
  },
};

export function T(key: string, lang: Lang): string {
  return tr[key]?.[lang] ?? key;
}

/* ---- Portfolio works data ---- */
export interface Work {
  id: string;
  title: Bilingual;
  category: "pattern" | "wallpaper" | "textile" | "drapery";
  year: string;
  image: string;
  layout: "tall" | "wide" | "normal";
  description: Bilingual;
}

export const WORKS: Work[] = [
  {
    id: "w01",
    title: { fa: "بوته جان", en: "Boteh Jan" },
    category: "pattern",
    year: "1402",
    image: "/images/patterns/p01.jpg",
    layout: "tall",
    description: { fa: "الگوی بوته‌جقه الهام‌گرفته از نقوش قاجاری با زبانی معاصر.", en: "Boteh pattern inspired by Qajar motifs with a contemporary language." },
  },
  {
    id: "w02",
    title: { fa: "گل مرغ", en: "Gol Morgh" },
    category: "wallpaper",
    year: "1401",
    image: "/images/patterns/p02.jpg",
    layout: "wide",
    description: { fa: "کاغذ دیواری با نقش گل و مرغ، ترکیب سنت و مدرنیته.", en: "Wallpaper with flower-and-bird motif, blending tradition and modernity." },
  },
  {
    id: "w03",
    title: { fa: "شبکه آبی", en: "Blue Lattice" },
    category: "textile",
    year: "1402",
    image: "/images/patterns/p03.jpg",
    layout: "normal",
    description: { fa: "پارچه با الگوی هندسی شبکه‌ای در رنگ‌های آبی و نقره‌ای.", en: "Textile with geometric lattice pattern in blue and silver tones." },
  },
  {
    id: "w04",
    title: { fa: "اسلیمی معاصر", en: "Contemporary Arabesque" },
    category: "pattern",
    year: "1400",
    image: "/images/patterns/p04.jpg",
    layout: "tall",
    description: { fa: "بازخوانی نقش اسلیمی با رویکرد مینیمال و معاصر.", en: "Reinterpretation of arabesque with a minimal and contemporary approach." },
  },
  {
    id: "w05",
    title: { fa: "گلستان", en: "Golestan" },
    category: "drapery",
    year: "1401",
    image: "/images/patterns/p05.jpg",
    layout: "normal",
    description: { fa: "پرده با نقش گلستانی، بافت‌های دست‌باف ابریشم.", en: "Drapery with garden motif, hand-woven silk textures." },
  },
  {
    id: "w06",
    title: { fa: "شطرنج طلایی", en: "Golden Chess" },
    category: "wallpaper",
    year: "1399",
    image: "/images/patterns/p06.jpg",
    layout: "wide",
    description: { fa: "کاغذ دیواری هندسی با الگوی شطرنجی طلایی و مشکی.", en: "Geometric wallpaper with a golden and black chess pattern." },
  },
  {
    id: "w07",
    title: { fa: "خط کوفی", en: "Kufic Line" },
    category: "pattern",
    year: "1402",
    image: "/images/patterns/p07.jpg",
    layout: "normal",
    description: { fa: "الگویی برگرفته از خط کوفی، تبدیل به نقش تزئینی هندسی.", en: "Pattern derived from Kufic script, transformed into geometric decoration." },
  },
  {
    id: "w08",
    title: { fa: "دماوند", en: "Damavand" },
    category: "textile",
    year: "1400",
    image: "/images/patterns/p08.jpg",
    layout: "tall",
    description: { fa: "پارچه‌ای با نقش‌های کوهستانی الهام‌گرفته از طبیعت ایران.", en: "Textile with mountain motifs inspired by Iranian nature." },
  },
];

/* ---- Courses data ---- */
export interface Course {
  id: string;
  level: Bilingual;
  title: Bilingual;
  desc: Bilingual;
}

export const COURSES: Course[] = [
  {
    id: "c01",
    level: { fa: "کارشناسی", en: "Undergraduate" },
    title: { fa: "طراحی الگو ۱ و ۲", en: "Pattern Design I & II" },
    desc: { fa: "مبانی طراحی الگوهای تکرارشونده و کاربردهای صنعتی.", en: "Fundamentals of repeating pattern design and industrial applications." },
  },
  {
    id: "c02",
    level: { fa: "کارشناسی", en: "Undergraduate" },
    title: { fa: "طراحی منسوجات", en: "Textile Design" },
    desc: { fa: "طراحی برای بافت‌های مختلف پارچه و کاربرد در صنعت نساجی.", en: "Design for various textile weaves and applications in the textile industry." },
  },
  {
    id: "c03",
    level: { fa: "کارشناسی ارشد", en: "Graduate" },
    title: { fa: "پژوهش در هنرهای تزئینی", en: "Research in Decorative Arts" },
    desc: { fa: "روش‌شناسی پژوهش در هنرهای کاربردی و تزئینی ایران.", en: "Research methodology in Iranian applied and decorative arts." },
  },
  {
    id: "c04",
    level: { fa: "کارشناسی ارشد", en: "Graduate" },
    title: { fa: "طراحی کاغذ دیواری معاصر", en: "Contemporary Wallpaper Design" },
    desc: { fa: "طراحی کاغذ دیواری با ادغام نقوش ایرانی و فناوری دیجیتال.", en: "Wallpaper design integrating Iranian motifs with digital technology." },
  },
];
