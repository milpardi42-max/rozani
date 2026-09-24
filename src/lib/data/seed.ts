import type {
  AnnouncementBarConfig,
  Artist,
  Banner,
  Category,
  Collection,
  EducationItem,
  HeroContent,
  HomeSection,
  LiveEventConfig,
  Pattern,
  Portfolio,
  Product,
  SeoMeta,
  SiteContent,
  Space,
  Story,
} from "../types";

const L = (fa: string, en: string) => ({ fa, en });

/* ------------------------------------------------------------------ */
/* Categories (Styles) — manageable from Admin                          */
/* ------------------------------------------------------------------ */
export const categories: Category[] = [
  { id: "cat-minimal", slug: "minimal", name: L("مینیمال", "Minimal"), description: L("خطوط آرام، فضای خالی، جزئیات ظریف.", "Quiet lines, open space, fine detail."), image: "/images/collections/s06.jpg", featured: true, order: 1 },
  { id: "cat-botanical", slug: "botanical", name: L("گیاهی", "Botanical"), description: L("برگ، سرخس و باغ‌های نقاشی‌شده.", "Leaves, ferns and painted gardens."), image: "/images/collections/s01.jpg", featured: true, order: 2 },
  { id: "cat-geometric", slug: "geometric", name: L("هندسی", "Geometric"), description: L("ریتم، تقارن و ساختار.", "Rhythm, symmetry and structure."), image: "/images/collections/s02.jpg", featured: true, order: 3 },
  { id: "cat-floral", slug: "floral", name: L("گل‌دار", "Floral"), description: L("گل‌های آبرنگی در مقیاس بزرگ.", "Large-scale watercolour blooms."), image: "/images/collections/s03.jpg", featured: true, order: 4 },
  { id: "cat-abstract", slug: "abstract", name: L("انتزاعی", "Abstract"), description: L("فرم‌های آزاد و بافت دست.", "Free forms and hand texture."), image: "/images/collections/s05.jpg", featured: true, order: 5 },
  { id: "cat-persian", slug: "persian-inspired", name: L("ایرانی", "Persian Inspired"), description: L("اسلیمی، بته‌جقه و کاشی؛ بازخوانی معاصر.", "Eslimi, boteh and tile — reinterpreted."), image: "/images/collections/s04.jpg", featured: true, order: 6 },
  { id: "cat-luxury", slug: "luxury", name: L("لوکس", "Luxury"), description: L("داماسک، فلز و عمق.", "Damask, metal and depth."), image: "/images/collections/s08.jpg", featured: true, order: 7 },
  { id: "cat-kids", slug: "kids", name: L("کودک", "Kids"), description: L("ماه، ابر و بالن‌های کوچک.", "Moons, clouds and little balloons."), image: "/images/collections/s07.jpg", featured: true, order: 8 },
  { id: "cat-nature", slug: "nature", name: L("طبیعت", "Nature"), description: L("الهام از زمین، سنگ و آب.", "Earth, stone and water."), image: "/images/collections/s01.jpg", featured: false, order: 9 },
  { id: "cat-contemporary", slug: "contemporary", name: L("معاصر", "Contemporary"), description: L("زبان امروز طراحی سطح.", "Today's language of surface design."), image: "/images/collections/s05.jpg", featured: false, order: 10 },
];

export const spaces: Space[] = [
  { id: "space-living-room", slug: "living-room", name: L("نشیمن", "Living room"), image: "/images/products/wallpaper-botanical.jpg", order: 1 },
  { id: "space-bedroom", slug: "bedroom", name: L("اتاق خواب", "Bedroom"), image: "/images/portfolios/pf-bedroom.jpg", order: 2 },
  { id: "space-kids-room", slug: "kids-room", name: L("اتاق کودک", "Kids room"), image: "/images/portfolios/pf-kids.jpg", order: 3 },
  { id: "space-office", slug: "office", name: L("دفتر کار", "Office"), image: "/images/portfolios/pf-office.jpg", order: 4 },
  { id: "space-hospitality", slug: "hospitality", name: L("هتل و رستوران", "Hospitality"), image: "/images/portfolios/pf-hotel.jpg", order: 5 },
  { id: "space-cafe", slug: "cafe", name: L("کافه", "Café"), image: "/images/portfolios/pf-cafe.jpg", order: 6 },
];

/* ------------------------------------------------------------------ */
/* Artists                                                              */
/* ------------------------------------------------------------------ */
export const artists: Artist[] = [
  {
    id: "artist-razieh-khairipour", slug: "razieh-khairipour",
    name: L("راضیه خیری پور", "Razieh Khairipour"),
    profession: L("مدرس و میزبان آکادمی", "Academy instructor and host"),
    bio: L("مدرس و میزبان ورکشاپ‌ها و وبینارهای آکادمی رزی.", "Instructor and host of Rosie Academy workshops and webinars."),
    avatar: "/images/education/e01.jpg", cover: "/images/education/e01.jpg",
    location: L("تهران", "Tehran"),
    social: {},
    featured: false, followers: 0, rating: 5, reviewsCount: 0,
    tags: ["academy", "workshop", "webinar"],
    status: "approved", revenueSharePct: 35, licenseType: "standard",
  },
  {
    id: "artist-niloufar-rad", slug: "niloufar-rad",
    name: L("نیلوفر راد", "Niloufar Rad"),
    profession: L("طراح کاغذدیواری و پارچه", "Wallpaper & textile designer"),
    bio: L("نیلوفر با گواش و مرکب کار می‌کند؛ باغ‌های نقاشی‌شده‌اش روی کاغذدیواری و پارچه در بیش از چهل پروژه مسکونی اجرا شده‌اند.", "Niloufar works in gouache and ink; her painted gardens live on wallpaper and fabric across forty-plus residential projects."),
    avatar: "/images/artists/niloufar-rad.jpg", cover: "/images/artists/cover-niloufar.jpg",
    location: L("تهران", "Tehran"),
    social: { instagram: "niloufar.rad", behance: "niloufarrad" },
    featured: true, followers: 12800, rating: 4.9, reviewsCount: 143,
    tags: ["botanical", "gouache", "residential"],
    status: "approved", revenueSharePct: 35, licenseType: "standard",
  },
  {
    id: "artist-arman-kian", slug: "arman-kian",
    name: L("آرمان کیان", "Arman Kian"),
    profession: L("طراح الگوی هندسی و پرده", "Geometric pattern & curtain designer"),
    bio: L("آرمان با ساختار، تکرار و خط نازک کار می‌کند. الگوهایش برای کاغذدیواری هتل‌ها، پرده و فضاهای کاری طراحی شده‌اند.", "Arman works with structure, repetition and the thin line. His patterns are designed for hotel wallpaper, curtains and workplaces."),
    avatar: "/images/artists/arman-kian.jpg", cover: "/images/artists/cover-arman.jpg",
    location: L("اصفهان", "Isfahan"),
    social: { instagram: "arman.kian", website: "armankian.studio" },
    featured: true, followers: 8400, rating: 4.8, reviewsCount: 96,
    tags: ["geometric", "hospitality", "curtain"],
    status: "approved", revenueSharePct: 35, licenseType: "standard",
  },
  {
    id: "artist-sara-mehr", slug: "sara-mehr",
    name: L("سارا مهر", "Sara Mehr"),
    profession: L("تصویرگر · پارچه و دکور", "Illustrator · fabric & décor"),
    bio: L("سارا داستان‌های کوچک را در کاغذدیواری کودک، پارچه گل‌دار و اشیاء دکور روایت می‌کند؛ نرم، صمیمی و دقیق.", "Sara tells small stories through kids' wallpaper, floral textiles and décor objects — soft, warm and precise."),
    avatar: "/images/artists/sara-mehr.jpg", cover: "/images/artists/cover-sara.jpg",
    location: L("شیراز", "Shiraz"),
    social: { instagram: "sara.mehr.art" },
    featured: true, followers: 15200, rating: 4.9, reviewsCount: 211,
    tags: ["floral", "kids", "illustration"],
    status: "approved", revenueSharePct: 35, licenseType: "standard",
  },
  {
    id: "artist-hossein-tabrizi", slug: "hossein-tabrizi",
    name: L("حسین تبریزی", "Hossein Tabrizi"),
    profession: L("استاد نقش · کاغذدیواری لوکس", "Master of ornament · luxury wallpaper"),
    bio: L("حسین چهار دهه در نقش سنتی کار کرده و امروز اسلیمی را برای کاغذدیواری، پرده و دکور معاصر بازخوانی می‌کند.", "Hossein has worked four decades in traditional ornament and today reinterprets eslimi for contemporary wallpaper, curtains and décor."),
    avatar: "/images/artists/hossein-tabrizi.jpg", cover: "/images/artists/cover-hossein.jpg",
    location: L("تبریز", "Tabriz"),
    social: { website: "tabrizi-atelier.ir" },
    featured: true, followers: 6100, rating: 5, reviewsCount: 58,
    tags: ["persian", "ornament", "luxury"],
    status: "approved", revenueSharePct: 40, licenseType: "exclusive",
  },
];

/* ------------------------------------------------------------------ */
/* Patterns                                                             */
/* ------------------------------------------------------------------ */
const spec = (repeatFa: string, repeatEn: string, colors: number, scaleFa: string, scaleEn: string) => ({
  repeat: L(repeatFa, repeatEn), dpi: "300 DPI", formats: "AI · PDF · TIFF", colors, scale: L(scaleFa, scaleEn),
});

export const patterns: Pattern[] = [
  { id: "pattern-quiet-garden", sku: "RA-PT-0101", slug: "quiet-garden", title: L("باغ آرام", "Quiet Garden"), description: L("برگ‌های سرخس و سایه‌های گواشی روی زمینه‌ی عاجی؛ الگویی برای نشیمن‌های روشن.", "Fern fronds and gouache shadows on ivory — a pattern for bright living rooms."), image: "/images/colorways/qg-ivory.jpg", gallery: ["/images/hero/hero-preview-01.jpg", "/images/hero/hero-bg-01.jpg", "/images/patterns/p01.jpg"], categoryId: "cat-botanical", spaceIds: ["space-living-room", "space-bedroom"], artistId: "artist-niloufar-rad", price: { fa: 1850000, en: 49 }, specs: spec("۶۴ سانتی‌متر", "64 cm", 5, "بزرگ", "Large"), palette: ["#5b6f8a", "#8fa08e", "#efe9dd"], colorways: [ { id: "qg-ivory", name: L("عاجی", "Ivory"), hex: "#efe9dd", image: "/images/colorways/qg-ivory.jpg", isDefault: true }, { id: "qg-sage", name: L("سبز مریم", "Sage"), hex: "#8fa08e", image: "/images/colorways/qg-sage.jpg" }, { id: "qg-slate", name: L("سنگ‌آبی", "Slate"), hex: "#5b6f8a", image: "/images/colorways/qg-slate.jpg" }, { id: "qg-room", name: L("نشیمن روشن", "Bright room"), hex: "#c9b8a0", image: "/images/hero/hero-bg-01.jpg" }, { id: "qg-classic", name: L("کلاسیک", "Classic"), hex: "#6b7c6a", image: "/images/new/new-curtain-room.jpg" } ], tags: ["botanical", "calm"], featured: true, trending: true, bestSeller: true, isNew: false, createdAt: "2026-05-02", likes: 1240 },
  { id: "pattern-arc-lattice", sku: "RA-PT-0102", slug: "arc-lattice", title: L("شبکه‌ی کمان", "Arc Lattice"), description: L("شش‌ضلعی‌ها و کمان‌های مسی روی سرمه‌ای؛ ریتم آرت‌دکو برای فضاهای عمومی.", "Hexagons and copper arcs on navy — an art-deco rhythm for public spaces."), image: "/images/colorways/al-navy.jpg", gallery: ["/images/patterns/p02.jpg", "/images/portfolios/pf-hotel.jpg"], categoryId: "cat-geometric", spaceIds: ["space-hospitality", "space-office"], artistId: "artist-arman-kian", price: { fa: 2100000, en: 55 }, specs: spec("۳۲ سانتی‌متر", "32 cm", 3, "متوسط", "Medium"), palette: ["#1b2e4b", "#b5713a", "#f4f1ea"], colorways: [ { id: "al-navy", name: L("سرمه‌ای", "Navy"), hex: "#1b2e4b", image: "/images/colorways/al-navy.jpg", isDefault: true }, { id: "al-copper", name: L("مسی", "Copper"), hex: "#b5713a", image: "/images/new/new-fabric-geometric.jpg" }, { id: "al-ivory", name: L("عاجی", "Ivory"), hex: "#f4f1ea", image: "/images/products/fabric-geometric.jpg" }, { id: "al-hotel", name: L("هتل", "Hotel"), hex: "#3b4658", image: "/images/portfolios/pf-hotel.jpg" } ], tags: ["geometric", "deco"], featured: true, trending: true, bestSeller: false, isNew: false, createdAt: "2026-04-11", likes: 980 },
  { id: "pattern-dusty-bloom", sku: "RA-PT-0103", slug: "dusty-bloom", title: L("شکوفه‌ی غبارآلود", "Dusty Bloom"), description: L("گل‌های صدتومانی آبرنگی در مقیاس بزرگ؛ نرم و سینمایی.", "Large-scale watercolour peonies — soft and cinematic."), image: "/images/colorways/db-rose.jpg", gallery: ["/images/hero/hero-preview-04.jpg", "/images/hero/hero-bg-04.jpg", "/images/patterns/p03.jpg"], categoryId: "cat-floral", spaceIds: ["space-bedroom", "space-living-room"], artistId: "artist-sara-mehr", price: { fa: 1950000, en: 52 }, specs: spec("۹۶ سانتی‌متر", "96 cm", 6, "بزرگ", "Large"), palette: ["#c99a92", "#b86b4b", "#6b7280"], colorways: [ { id: "db-rose", name: L("رز غبارآلود", "Dusty rose"), hex: "#c99a92", image: "/images/colorways/db-rose.jpg", isDefault: true }, { id: "db-terra", name: L("تراکوتا", "Terracotta"), hex: "#b86b4b", image: "/images/colorways/db-terra.jpg" }, { id: "db-ivory", name: L("عاجی", "Ivory"), hex: "#f4f1ea", image: "/images/products/fabric-floral.jpg" }, { id: "db-bedroom", name: L("اتاق خواب", "Bedroom"), hex: "#d4a59a", image: "/images/hero/hero-bg-04.jpg" }, { id: "db-soft", name: L("صورتی ملایم", "Soft blush"), hex: "#e8c4bc", image: "/images/products/fabric-floral-2.jpg" } ], tags: ["floral", "watercolour"], featured: true, trending: false, bestSeller: true, isNew: false, createdAt: "2026-03-20", likes: 2130 },
  { id: "pattern-lapis-eslimi", sku: "RA-PT-0104", slug: "lapis-eslimi", title: L("اسلیمی لاجورد", "Lapis Eslimi"), description: L("بازخوانی مینیمال نقش کاشی ایرانی با لاجورد و طلای کهنه.", "A minimal reinterpretation of Persian tile ornament in lapis and antique gold."), image: "/images/colorways/le-lapis.jpg", gallery: ["/images/hero/hero-preview-02.jpg", "/images/hero/hero-bg-02.jpg", "/images/patterns/p04.jpg"], categoryId: "cat-persian", spaceIds: ["space-cafe", "space-hospitality"], artistId: "artist-hossein-tabrizi", price: { fa: 2400000, en: 64 }, specs: spec("۴۸ سانتی‌متر", "48 cm", 4, "متوسط", "Medium"), palette: ["#1f3a8a", "#c8a24a", "#f2ede2"], colorways: [ { id: "le-lapis", name: L("لاجورد", "Lapis"), hex: "#1f3a8a", image: "/images/colorways/le-lapis.jpg", isDefault: true }, { id: "le-gold", name: L("طلای کهنه", "Antique gold"), hex: "#c8a24a", image: "/images/colorways/le-gold.jpg" }, { id: "le-ivory", name: L("عاجی", "Ivory"), hex: "#f2ede2", image: "/images/collections/s04.jpg" }, { id: "le-corridor", name: L("راهرو", "Corridor"), hex: "#2a4494", image: "/images/hero/hero-bg-02.jpg" }, { id: "le-deep", name: L("آبی عمیق", "Deep blue"), hex: "#0f2460", image: "/images/patterns/p04.jpg" } ], tags: ["persian", "tile"], featured: true, trending: true, bestSeller: true, isNew: false, createdAt: "2026-02-14", likes: 1760 },
  { id: "pattern-torn-paper", sku: "RA-PT-0105", slug: "torn-paper", title: L("کاغذدیواری — کاغذ پاره", "Wallpaper — Torn Paper"), description: L("کاغذدیواری انتزاعی با ضربه‌قلم‌های آزاد؛ حس گالری معاصر برای نشیمن و دفتر.", "Abstract wallpaper with free brush forms — a contemporary gallery feel for living rooms and offices."), image: "/images/new/new-wallpaper-abstract.jpg", gallery: ["/images/new/new-wallpaper-abstract.jpg", "/images/patterns/p05.jpg"], categoryId: "cat-abstract", spaceIds: ["space-office", "space-living-room"], artistId: null, price: { fa: 1650000, en: 44 }, specs: spec("۶۴ سانتی‌متر", "64 cm", 4, "بزرگ", "Large"), palette: ["#2b2b2b", "#d9c7ad", "#b5713a"], colorways: [ { id: "tp-charcoal", name: L("زغالی", "Charcoal"), hex: "#2b2b2b", image: "/images/new/new-wallpaper-abstract.jpg", isDefault: true }, { id: "tp-sand", name: L("شنی", "Sand"), hex: "#d9c7ad", image: "/images/patterns/p05.jpg" }, { id: "tp-copper", name: L("مسی", "Copper"), hex: "#b5713a", image: "/images/portfolios/pf-cafe.jpg" }, { id: "tp-ink", name: L("مرکب", "Ink"), hex: "#1a1a1a", image: "/images/collections/s05.jpg" } ], tags: ["abstract"], featured: false, trending: false, bestSeller: false, isNew: true, createdAt: "2026-08-12", likes: 310 },
  { id: "pattern-hairline-grid", sku: "RA-PT-0106", slug: "hairline-grid", title: L("کاغذدیواری — شبکه‌ی مویی", "Wallpaper — Hairline Grid"), description: L("کاغذدیواری مینیمال با شبکه‌ی ظریف؛ نظم بصری برای اتاق خواب و دفتر کار.", "Minimal wallpaper with a fine hairline grid — visual calm for bedrooms and offices."), image: "/images/new/new-wallpaper-minimal.jpg", gallery: ["/images/new/new-wallpaper-minimal.jpg", "/images/patterns/p06.jpg", "/images/portfolios/pf-office.jpg"], categoryId: "cat-minimal", spaceIds: ["space-office", "space-bedroom"], artistId: null, price: { fa: 1200000, en: 32 }, specs: spec("۱۶ سانتی‌متر", "16 cm", 2, "کوچک", "Small"), palette: ["#9aa0a6", "#ffffff"], colorways: [ { id: "hg-white", name: L("سفید", "White"), hex: "#ffffff", image: "/images/new/new-wallpaper-minimal.jpg", isDefault: true }, { id: "hg-grey", name: L("خاکستری", "Grey"), hex: "#9aa0a6", image: "/images/patterns/p06.jpg" }, { id: "hg-office", name: L("دفتر", "Office"), hex: "#e8eaed", image: "/images/portfolios/pf-office.jpg" }, { id: "hg-warm", name: L("گرم", "Warm grey"), hex: "#c5c0b8", image: "/images/products/fabric-linen-minimal.jpg" } ], tags: ["minimal", "grid"], featured: false, trending: false, bestSeller: true, isNew: true, createdAt: "2026-08-20", likes: 540 },
  { id: "pattern-little-moons", sku: "RA-PT-0107", slug: "little-moons", title: L("کاغذدیواری کودک — ماه‌های کوچک", "Kids wallpaper — Little Moons"), description: L("کاغذدیواری پاستلی با ماه و بالن؛ مناسب اتاق کودک با جوهر پایه آب.", "Pastel kids wallpaper with moons and balloons — water-based inks for nurseries."), image: "/images/new/new-kids-wallpaper.jpg", gallery: ["/images/new/new-kids-wallpaper.jpg", "/images/patterns/p07.jpg", "/images/portfolios/pf-kids.jpg"], categoryId: "cat-kids", spaceIds: ["space-kids-room"], artistId: "artist-sara-mehr", price: { fa: 1450000, en: 39 }, specs: spec("۳۲ سانتی‌متر", "32 cm", 5, "متوسط", "Medium"), palette: ["#a9c1d9", "#d9a441", "#f3d9d2"], colorways: [ { id: "lm-cream", name: L("کرم", "Cream"), hex: "#f3d9d2", image: "/images/new/new-kids-wallpaper.jpg", isDefault: true }, { id: "lm-blue", name: L("آبی پودری", "Powder blue"), hex: "#a9c1d9", image: "/images/patterns/p07.jpg" }, { id: "lm-mustard", name: L("خردلی", "Mustard"), hex: "#d9a441", image: "/images/portfolios/pf-kids.jpg" }, { id: "lm-soft", name: L("صورتی ملایم", "Blush"), hex: "#f6c9c0", image: "/images/collections/s07.jpg" } ], tags: ["kids"], featured: true, trending: true, bestSeller: false, isNew: true, createdAt: "2026-08-01", likes: 890 },
  { id: "pattern-copper-damask", sku: "RA-PT-0108", slug: "copper-damask", title: L("داماسک مسی", "Copper Damask"), description: L("نقش داماسک با مس براق روی سنگ‌آبی تیره؛ برای فضاهای شبانه.", "Damask in burnished copper on deep slate — for evening spaces."), image: "/images/colorways/cd-slate.jpg", gallery: ["/images/hero/hero-preview-03.jpg", "/images/hero/hero-bg-03.jpg", "/images/patterns/p08.jpg"], categoryId: "cat-luxury", spaceIds: ["space-hospitality"], artistId: "artist-arman-kian", price: { fa: 2800000, en: 74 }, specs: spec("۶۴ سانتی‌متر", "64 cm", 3, "بزرگ", "Large"), palette: ["#1c1f26", "#b5713a", "#3b4658"], colorways: [ { id: "cd-slate", name: L("اسلیت", "Slate"), hex: "#1c1f26", image: "/images/colorways/cd-slate.jpg", isDefault: true }, { id: "cd-copper", name: L("مسی", "Copper"), hex: "#b5713a", image: "/images/products/wallpaper-damask.jpg" }, { id: "cd-navy", name: L("سرمه‌ای", "Navy"), hex: "#1b2e4b", image: "/images/colorways/cd-navy.jpg" }, { id: "cd-lobby", name: L("لابی", "Lobby"), hex: "#3b4658", image: "/images/products/wallpaper-damask-2.jpg" }, { id: "cd-velvet", name: L("مخمل", "Velvet night"), hex: "#0e1118", image: "/images/products/curtain-velvet.jpg" } ], tags: ["luxury", "damask"], featured: true, trending: false, bestSeller: true, isNew: false, createdAt: "2026-01-30", likes: 1420 },
];

/* ------------------------------------------------------------------ */
/* Products — wallpaper · fabric · curtain · décor                      */
/* ------------------------------------------------------------------ */
const color = (id: string, fa: string, en: string, hex: string, image: string, stock = 12) => ({ id, name: L(fa, en), hex, image, stock });

export const products: Product[] = [
  {
    id: "product-wallpaper-quiet-garden", sku: "RA-WP-2001", slug: "wallpaper-quiet-garden",
    title: L("کاغذدیواری — باغ آرام", "Wallpaper — Quiet Garden"),
    description: L("کاغذدیواری نان‌وون پریمیوم با الگوی گیاهی باغ آرام؛ مناسب نشیمن و اتاق خواب روشن.", "Premium non-woven wallpaper with the Quiet Garden botanical — ideal for bright living rooms and bedrooms."),
    categoryId: "cat-botanical", familyId: "fam-wallpaper", patternId: "pattern-quiet-garden", artistId: "artist-niloufar-rad",
    price: { fa: 2450000, en: 89 }, compareAt: { fa: 2750000, en: 99 },
    colors: [
      color("ivory", "عاجی", "Ivory", "#efe9dd", "/images/colorways/qg-ivory.jpg"),
      color("sage", "سبز مریم", "Sage", "#8fa08e", "/images/colorways/qg-sage.jpg", 6),
      color("slate", "سنگ‌آبی", "Slate", "#5b6f8a", "/images/colorways/qg-slate.jpg", 4),
      color("room", "نشیمن", "Living room", "#c9b8a0", "/images/hero/hero-bg-01.jpg", 5),
    ],
    sizes: [L("رول ۱۰٫۰۵×۰٫۵۳ م", "Roll 10.05×0.53 m"), L("متر مربع", "Per m²")],
    specs: [
      { label: L("متریال", "Material"), value: L("نان‌وون ۲۰۰ گرم", "200 gsm non-woven") },
      { label: L("تکرار", "Repeat"), value: L("۶۴ سانتی‌متر", "64 cm") },
      { label: L("نصب", "Install"), value: L("چسب روی دیوار", "Paste the wall") },
    ],
    materials: L("نان‌وون پریمیوم، جوهر پایه آب، قابل شست‌وشوی ملایم", "Premium non-woven, water-based ink, gently washable"),
    featured: true, bestSeller: true, isNew: false, order: 1,
  },
  {
    id: "product-wallpaper-copper-damask", sku: "RA-WP-2002", slug: "wallpaper-copper-damask",
    title: L("کاغذدیواری — داماسک مسی", "Wallpaper — Copper Damask"),
    description: L("کاغذدیواری لوکس با نقش داماسک مسی روی اسلیت تیره؛ برای لابی، هتل و فضاهای شبانه.", "Luxury wallpaper with copper damask on deep slate — for lobbies, hotels and evening spaces."),
    categoryId: "cat-luxury", familyId: "fam-wallpaper", patternId: "pattern-copper-damask", artistId: "artist-arman-kian",
    price: { fa: 3200000, en: 118 },
    colors: [
      color("slate", "اسلیت", "Slate", "#1c1f26", "/images/colorways/cd-slate.jpg"),
      color("navy", "سرمه‌ای", "Navy", "#1b2e4b", "/images/colorways/cd-navy.jpg", 5),
      color("copper", "مسی", "Copper", "#b5713a", "/images/products/wallpaper-damask.jpg", 3),
      color("lobby", "لابی", "Lobby", "#3b4658", "/images/hero/hero-bg-03.jpg", 4),
    ],
    sizes: [L("رول ۱۰٫۰۵×۰٫۵۳ م", "Roll 10.05×0.53 m"), L("متر مربع", "Per m²")],
    specs: [
      { label: L("متریال", "Material"), value: L("وینیل تجاری B1", "Commercial vinyl B1") },
      { label: L("تکرار", "Repeat"), value: L("۶۴ سانتی‌متر", "64 cm") },
      { label: L("مقاومت", "Durability"), value: L("ضدخش · scrubbable", "Anti-scratch · scrubbable") },
    ],
    materials: L("وینیل تجاری کلاس B1، چاپ دیجیتال ۱۲ رنگ", "Class B1 commercial vinyl, 12-ink digital print"),
    featured: true, bestSeller: true, isNew: false, order: 2,
  },
  {
    id: "product-fabric-dusty-bloom", sku: "RA-FB-2003", slug: "fabric-dusty-bloom",
    title: L("طراحی پارچه — شکوفه‌ی غبارآلود", "Fabric design — Dusty Bloom"),
    description: L("پارچه کتان چاپی با گل‌های صدتومانی آبرنگی؛ مناسب روکش مبل، کوسن و لباس خانگی.", "Printed linen with watercolour peonies — for upholstery, cushions and home apparel."),
    categoryId: "cat-floral", familyId: "fam-home-fabric", patternId: "pattern-dusty-bloom", artistId: "artist-sara-mehr",
    price: { fa: 980000, en: 48 },
    colors: [
      color("rose", "رز غبارآلود", "Dusty rose", "#c99a92", "/images/colorways/db-rose.jpg"),
      color("terracotta", "تراکوتا", "Terracotta", "#b86b4b", "/images/colorways/db-terra.jpg", 7),
      color("ivory", "عاجی", "Ivory", "#f4f1ea", "/images/new/new-fabric-roll.jpg", 4),
      color("soft", "صورتی ملایم", "Blush", "#e8c4bc", "/images/products/fabric-floral.jpg", 6),
    ],
    sizes: [L("عرض ۱۴۰ سانتی‌متر", "140 cm width"), L("هر متر طولی", "Per linear metre")],
    specs: [
      { label: L("جنس", "Fabric"), value: L("کتان اروپایی", "European linen") },
      { label: L("وزن", "Weight"), value: L("۲۲۰ گرم/م²", "220 gsm") },
      { label: L("چاپ", "Print"), value: L("پیگمنت ماندگار", "Durable pigment") },
    ],
    materials: L("کتان ۱۰۰٪، چاپ پیگمنت، نرم‌شو با آب سرد", "100% linen, pigment print, cold wash"),
    featured: true, bestSeller: true, isNew: true, order: 3,
  },
  {
    id: "product-fabric-arc-lattice", sku: "RA-FB-2004", slug: "fabric-arc-lattice",
    title: L("طراحی پارچه — شبکه‌ی کمان", "Fabric design — Arc Lattice"),
    description: L("پارچه مبلی با الگوی هندسی آرت‌دکو؛ مس و سرمه‌ای برای مبلمان و پنل دیواری.", "Upholstery fabric with art-deco geometry — copper and navy for seating and wall panels."),
    categoryId: "cat-geometric", familyId: "fam-home-fabric", patternId: "pattern-arc-lattice", artistId: "artist-arman-kian",
    price: { fa: 1250000, en: 58 },
    colors: [
      color("navy", "سرمه‌ای", "Navy", "#1b2e4b", "/images/colorways/al-navy.jpg"),
      color("copper", "مسی", "Copper", "#b5713a", "/images/new/new-fabric-geometric.jpg"),
      color("ivory", "عاجی", "Ivory", "#f4f1ea", "/images/products/fabric-geometric.jpg", 5),
      color("hotel", "هتل", "Hotel", "#3b4658", "/images/portfolios/pf-hotel.jpg", 4),
    ],
    sizes: [L("عرض ۱۵۰ سانتی‌متر", "150 cm width"), L("هر متر طولی", "Per linear metre")],
    specs: [
      { label: L("جنس", "Fabric"), value: L("پلی‌کتان مبلی", "Upholstery poly-linen") },
      { label: L("مقاومت", "Martindale"), value: L("۴۰٬۰۰۰ دور", "40,000 cycles") },
      { label: L("کاربرد", "Use"), value: L("مبل · پنل", "Seating · panel") },
    ],
    materials: L("پلی‌کتان با دوام بالا، چاپ دیجیتال", "High-durability poly-linen, digital print"),
    featured: true, bestSeller: false, isNew: true, order: 4,
  },
  {
    id: "product-curtain-quiet-garden", sku: "RA-CR-2005", slug: "curtain-quiet-garden",
    title: L("پرده — باغ آرام", "Curtain — Quiet Garden"),
    description: L("پرده کتان دو‌لایه با چاپ گیاهی ظریف؛ نور ملایم، آستر مات و دوخت سفارشی.", "Double-layer linen curtain with a soft botanical print; gentle light, blackout lining, made to measure."),
    categoryId: "cat-botanical", familyId: "fam-curtain", patternId: "pattern-quiet-garden", artistId: null,
    price: { fa: 4200000, en: 195 },
    colors: [
      color("ivory", "عاجی", "Ivory", "#efe9dd", "/images/new/new-curtain-room.jpg"),
      color("sage", "سبز مریم", "Sage", "#8fa08e", "/images/products/curtain-linen-2.jpg", 6),
      color("sheer", "شفاف", "Sheer", "#f7f3ea", "/images/products/curtain-sheer.jpg", 8),
    ],
    sizes: [L("عرض ۲٫۵ م", "W 2.5 m"), L("عرض ۳٫۵ م", "W 3.5 m"), L("سفارشی", "Custom")],
    specs: [
      { label: L("جنس", "Fabric"), value: L("کتان + آستر", "Linen + lining") },
      { label: L("ارتفاع", "Drop"), value: L("تا ۳٫۲۰ م", "Up to 3.20 m") },
      { label: L("دوخت", "Finish"), value: L("پلیسه · حلقه", "Pinch · eyelet") },
    ],
    materials: L("کتان اروپایی، آستر مات، نوار پرده پنبه‌ای", "European linen, blackout lining, cotton heading tape"),
    featured: true, bestSeller: true, isNew: true, order: 5,
  },
  {
    id: "product-curtain-copper-damask", sku: "RA-CR-2006", slug: "curtain-copper-damask",
    title: L("پرده مخمل — داماسک مسی", "Velvet curtain — Copper Damask"),
    description: L("پرده مخمل سنگین با نقش داماسک؛ عمق شبانه برای اتاق خواب و سالن پذیرایی لوکس.", "Heavy velvet curtain with damask motif — nocturnal depth for bedrooms and formal lounges."),
    categoryId: "cat-luxury", familyId: "fam-curtain", patternId: "pattern-copper-damask", artistId: null,
    price: { fa: 5800000, en: 265 },
    colors: [
      color("navy", "سرمه‌ای", "Navy", "#1b2e4b", "/images/products/curtain-velvet.jpg"),
      color("slate", "اسلیت", "Slate", "#3b4658", "/images/products/curtain-velvet-2.jpg", 4),
      color("black", "مشکی", "Black", "#1c1f26", "/images/products/lamp-1.jpg", 3),
    ],
    sizes: [L("عرض ۲٫۸ م", "W 2.8 m"), L("عرض ۳٫۶ م", "W 3.6 m"), L("سفارشی", "Custom")],
    specs: [
      { label: L("جنس", "Fabric"), value: L("مخمل ۳۲۰ گرم", "320 gsm velvet") },
      { label: L("آستر", "Lining"), value: L("مات کامل", "Full blackout") },
      { label: L("دوخت", "Finish"), value: L("پلیسه سه‌تایی", "Triple pinch") },
    ],
    materials: L("مخمل پلی‌استر پریمیوم، آستر مات، وزنه‌ی سربی", "Premium poly velvet, blackout lining, lead-weight hem"),
    featured: true, bestSeller: false, isNew: false, order: 6,
  },
  {
    id: "product-decor-cushion-set", sku: "RA-DC-2007", slug: "decor-cushion-set",
    title: L("ست دکور — کوسن‌های الگو", "Décor set — Pattern cushions"),
    description: L("ست سه‌تایی کوسن با الگوهای گیاهی و داماسک؛ ترکیب کتان و مخمل برای نشیمن کلاسیک.", "Set of three cushions in botanical and damask patterns — linen and velvet mix for a classical lounge."),
    categoryId: "cat-botanical", familyId: "fam-cushion", patternId: "pattern-quiet-garden", artistId: null,
    price: { fa: 1890000, en: 86 }, compareAt: { fa: 2200000, en: 98 },
    colors: [
      color("mixed", "ترکیبی", "Mixed", "#c99a92", "/images/new/new-decor-set.jpg"),
      color("ivory", "عاجی", "Ivory", "#efe9dd", "/images/products/cushion-0.jpg"),
      color("sage", "سبز مریم", "Sage", "#8fa08e", "/images/products/decor-vase.jpg", 5),
    ],
    sizes: [L("۴۵×۴۵ ×۳", "45×45 ×3"), L("۵۰×۵۰ ×۳", "50×50 ×3")],
    specs: [
      { label: L("تعداد", "Pieces"), value: L("۳ کوسن", "3 cushions") },
      { label: L("جنس", "Fabric"), value: L("کتان · مخمل", "Linen · velvet") },
      { label: L("پر", "Fill"), value: L("الیاف طبیعی", "Natural fibre") },
    ],
    materials: L("کتان و مخمل، زیپ نامرئی، پر الیاف طبیعی", "Linen & velvet, invisible zip, natural fibre fill"),
    featured: true, bestSeller: true, isNew: true, order: 7,
  },
  {
    id: "product-decor-lapis-rug", sku: "RA-DC-2008", slug: "decor-lapis-rug",
    title: L("دکور — فرش اسلیمی لاجورد", "Décor — Lapis Eslimi rug"),
    description: L("فرش تافتینگ با نقش اسلیمی لاجورد؛ قطعه‌ی دکوراتیو برای ورودی، نشیمن و فضاهای لوکس.", "Tufted rug with lapis eslimi motif — a décor centrepiece for entries, lounges and luxury spaces."),
    categoryId: "cat-persian", patternId: "pattern-lapis-eslimi", artistId: "artist-hossein-tabrizi",
    price: { fa: 6800000, en: 320 },
    colors: [
      color("lapis", "لاجورد", "Lapis", "#1f3a8a", "/images/products/decor-rug.jpg"),
      color("gold", "طلای کهنه", "Antique gold", "#c8a24a", "/images/products/rug-1.jpg", 2),
      color("ivory", "عاجی", "Ivory", "#f2ede2", "/images/products/rug-2.jpg"),
    ],
    sizes: [L("۱۲۰×۱۸۰", "120×180"), L("۱۶۰×۲۳۰", "160×230")],
    specs: [
      { label: L("جنس", "Material"), value: L("پشم ۸۰٪ / پنبه ۲۰٪", "80% wool / 20% cotton") },
      { label: L("پرز", "Pile"), value: L("۱۲ میلی‌متر", "12 mm") },
      { label: L("ساخت", "Made in"), value: L("تبریز", "Tabriz") },
    ],
    materials: L("پشم دستریس، پنبه، زیره‌ی نمدی", "Hand-spun wool, cotton, felt backing"),
    featured: true, bestSeller: false, isNew: false, order: 8,
  },
  {
    id: "product-wallpaper-lapis-eslimi", sku: "RA-WP-2009", slug: "wallpaper-lapis-eslimi",
    title: L("کاغذدیواری — اسلیمی لاجورد", "Wallpaper — Lapis Eslimi"),
    description: L("کاغذدیواری با بازخوانی مینیمال نقش کاشی ایرانی؛ لاجورد و طلای کهنه برای فضاهای خاص.", "Wallpaper reinterpreting Persian tile ornament in lapis and antique gold — for distinctive interiors."),
    categoryId: "cat-persian", familyId: "fam-wallpaper", patternId: "pattern-lapis-eslimi", artistId: "artist-hossein-tabrizi",
    price: { fa: 2900000, en: 108 },
    colors: [
      color("lapis", "لاجورد", "Lapis", "#1f3a8a", "/images/colorways/le-lapis.jpg"),
      color("gold", "طلای کهنه", "Antique gold", "#c8a24a", "/images/colorways/le-gold.jpg", 4),
      color("ivory", "عاجی", "Ivory", "#f2ede2", "/images/collections/s04.jpg", 6),
      color("deep", "آبی عمیق", "Deep blue", "#0f2460", "/images/hero/hero-bg-02.jpg", 3),
    ],
    sizes: [L("رول ۱۰٫۰۵×۰٫۵۳ م", "Roll 10.05×0.53 m"), L("متر مربع", "Per m²")],
    specs: [
      { label: L("متریال", "Material"), value: L("نان‌وون بافت‌دار", "Textured non-woven") },
      { label: L("تکرار", "Repeat"), value: L("۴۸ سانتی‌متر", "48 cm") },
      { label: L("نصب", "Install"), value: L("چسب روی دیوار", "Paste the wall") },
    ],
    materials: L("نان‌وون بافت‌دار، جوهر پایه آب، مات", "Textured non-woven, water-based ink, matte"),
    featured: true, bestSeller: true, isNew: false, order: 9,
  },
  {
    id: "product-decor-atelier-lamp", sku: "RA-DC-2010", slug: "decor-atelier-lamp",
    title: L("دکور — آباژور داماسک", "Décor — Damask lamp"),
    description: L("آباژور رومیزی با کلاهک پارچه‌ای داماسک و پایه‌ی برنجی مات؛ قطعه‌ی نهایی برای کنار مبل یا پاتختی.", "Table lamp with damask fabric shade and matte brass base — the finishing piece beside a sofa or bed."),
    categoryId: "cat-luxury", patternId: "pattern-copper-damask", artistId: null,
    price: { fa: 3200000, en: 145 },
    colors: [
      color("slate", "سنگ‌آبی", "Slate", "#3b4658", "/images/new/new-lamp-decor.jpg"),
      color("black", "مشکی", "Black", "#1c1f26", "/images/products/lamp-1.jpg", 5),
      color("copper", "مسی", "Copper", "#b5713a", "/images/products/lamp-2.jpg"),
    ],
    sizes: [L("۴۵ سانتی‌متر", "45 cm")],
    specs: [
      { label: L("پایه", "Base"), value: L("برنج مات", "Matte brass") },
      { label: L("کلاهک", "Shade"), value: L("پارچه داماسک", "Damask fabric") },
      { label: L("سرپیچ", "Socket"), value: L("E27", "E27") },
    ],
    materials: L("برنج، پارچه پلی‌کتان، کابل پارچه‌ای", "Brass, poly-linen, fabric cord"),
    featured: true, bestSeller: false, isNew: true, order: 10,
  },
];

/* ------------------------------------------------------------------ */
/* Portfolios                                                           */
/* ------------------------------------------------------------------ */
export const portfolios: Portfolio[] = [
  {
    id: "portfolio-penthouse-elaheye",
    slug: "penthouse-elaheye",
    title: L("پنت‌هاوس الهیه؛ روایت مس روی اسلیت", "Elahieh Penthouse — Copper on Slate"),
    subtitle: L("الگوی گیاهی با خطوط مسی برای پنجره‌های قوسی", "A botanical with copper linework for arched windows"),
    intro: L("برای این پنت‌هاوس ۲۸۰ متری، یک الگوی گیاهی با خطوط مسی روی زمینه‌ی اسلیت طراحی شد تا نور صبحگاهی پنجره‌های قوسی را بازتاب دهد.", "For this 280 m² penthouse, a bespoke botanical with copper linework on a slate ground was colour-matched to the morning light of the arched windows."),
    story: [
      { type: "text", text: L("رنگ‌بندی اختصاصی در سه مرحله نمونه‌گیری نهایی شد تا با نور طبیعی پنجره‌های قوسی هماهنگ شود.", "The custom colourway was finalised across three sampling rounds to harmonise with the natural light of the arched windows.") },
      { type: "image", image: "/images/portfolios/pf-penthouse.jpg", caption: L("نمای کلی فضا پس از نصب", "Space overview after installation") },
      { type: "quote", text: L("الگو نباید فریاد بزند؛ باید مثل نور صبح وارد فضا شود.", "A pattern shouldn't shout — it should enter the room like morning light.") },
      { type: "text", text: L("متریال نان‌وون پریمیوم ۲۰۰ گرم انتخاب شد و نصب در ۱۸ روز به پایان رسید.", "A 200 gsm premium non-woven substrate was chosen; installation was completed in 18 days.") },
    ],
    cover: "/images/portfolios/pf-penthouse.jpg",
    gallery: ["/images/portfolios/pf-penthouse.jpg", "/images/patterns/p01.jpg"],
    artistId: "artist-niloufar-rad", patternIds: ["pattern-quiet-garden"], productIds: ["product-wallpaper-quiet-garden", "product-curtain-quiet-garden"],
    client: L("خصوصی", "Private"), location: L("تهران، الهیه", "Tehran, Elahieh"), year: 2025,
    scope: L("طراحی اختصاصی، تولید، نصب", "Bespoke design, production, installation"),
    categoryId: "cat-persian", featured: true, isProject: true, size: "hero",
  },
  {
    id: "portfolio-hotel-narenjestan",
    slug: "hotel-narenjestan",
    title: L("هتل بوتیک نارنجستان؛ لابی شب‌رنگ", "Narenjestan Boutique Hotel — Lobby"),
    subtitle: L("الگوی مشبک هندسی ایرانی با خطوط مسی روی اسلیت تیره", "Persian lattice in copper line on deep slate"),
    intro: L("لابی هتل با یک الگوی مشبک هندسی ایرانی با خطوط مسی روی اسلیت تیره پوشیده شد؛ ترکیبی که در نور آویزها عمق پیدا می‌کند.", "The hotel lobby was clad in a Persian lattice in copper line on deep slate — a combination that gains depth under pendant light."),
    story: [
      { type: "image", image: "/images/portfolios/pf-hotel.jpg", caption: L("لابی پس از نصب", "Lobby after installation") },
      { type: "text", text: L("الگو با مخمل آبی مبلمان گفت‌وگو می‌کند و عمق شب‌رنگ فضا را تکمیل می‌کند.", "The pattern converses with the blue velvet seating and completes the nocturnal depth of the space.") },
      { type: "pair", images: ["/images/patterns/p08.jpg", "/images/portfolios/pf-hotel.jpg"], caption: L("الگو در کنار فضای نهایی", "Pattern beside the finished space") },
      { type: "text", text: L("متریال وینیل تجاری ضدخش کلاس B1 در ۱۴۰ متر مربع در ۲۶ روز نصب شد.", "Class B1 commercial anti-scratch vinyl — 140 m² installed in 26 days.") },
    ],
    cover: "/images/portfolios/pf-hotel.jpg",
    gallery: ["/images/portfolios/pf-hotel.jpg", "/images/patterns/p08.jpg"],
    artistId: "artist-arman-kian", patternIds: ["pattern-copper-damask"], productIds: ["product-wallpaper-copper-damask", "product-curtain-copper-damask"],
    client: L("هتل بوتیک نارنجستان", "Narenjestan Boutique Hotel"), location: L("تهران", "Tehran"), year: 2025,
    scope: L("طراحی الگو، کاغذدیواری تجاری، پرده، نصب", "Pattern design, commercial wallpaper, curtains, installation"),
    categoryId: "cat-luxury", featured: true, isProject: true, size: "tall",
  },
  {
    id: "portfolio-villa-lavasan",
    slug: "villa-lavasan",
    title: L("ویلای لواسان؛ آرامش گل و برگ", "Lavasan Villa — Master Bedroom"),
    subtitle: L("الگوی آبرنگی گل‌های صدتومانی روی زمینه‌ی عاجی گرم", "Watercolour peonies on warm ivory"),
    intro: L("دیوار تاج تخت با الگوی آبرنگی از گل‌های صدتومانی و برگ‌های مریم‌گلی اجرا شد؛ مقیاس طوری تنظیم شد که از فاصله‌ی تخت، آرام و بی‌تکرار دیده شود.", "The headboard wall was executed with a watercolour peony and sage botanical — scaled so the repeat disappears from the bed's viewpoint."),
    story: [
      { type: "image", image: "/images/portfolios/pf-bedroom.jpg" },
      { type: "text", text: L("متریال کاغذ بافت‌دار مات با تکرار ۹۶ سانتی‌متر در ۲۲ متر مربع اجرا شد.", "Textured matte paper with a 96 cm repeat — 22 m² installed in 5 days.") },
    ],
    cover: "/images/portfolios/pf-bedroom.jpg",
    gallery: ["/images/portfolios/pf-bedroom.jpg", "/images/patterns/p03.jpg"],
    artistId: "artist-sara-mehr", patternIds: ["pattern-dusty-bloom"], productIds: ["product-fabric-dusty-bloom", "product-wallpaper-quiet-garden"],
    client: L("خصوصی", "Private"), location: L("لواسان", "Lavasan"), year: 2024,
    scope: L("کاغذدیواری و پارچه سفارشی", "Bespoke wallpaper & fabric"),
    categoryId: "cat-floral", featured: true, isProject: false, size: "square",
  },
  {
    id: "portfolio-cafe-sangfarsh",
    slug: "cafe-sangfarsh",
    title: L("کافه‌ی سنگ‌فرش؛ انتزاع ترازو", "Sangfarsh Café — Terrazzo Abstract"),
    subtitle: L("دیوار شاخص، خودش اثر هنری است", "The feature wall becomes the artwork itself"),
    intro: L("برای فضای صنعتی-مینیمال کافه، یک الگوی انتزاعی با ضربه‌قلم‌های مشکی، شنی و مسی در ابعاد بزرگ طراحی شد.", "For the industrial-minimal café, a large-scale brushstroke abstraction in black, sand and copper was designed."),
    story: [
      { type: "image", image: "/images/portfolios/pf-cafe.jpg" },
      { type: "text", text: L("وینیل مات ضدلک بدون تکرار به‌صورت پانل سفارشی در ۱۸ متر مربع در ۳ روز نصب شد.", "Matte anti-stain vinyl with no repeat — custom panel, 18 m² in 3 days.") },
    ],
    cover: "/images/portfolios/pf-cafe.jpg",
    gallery: ["/images/portfolios/pf-cafe.jpg", "/images/patterns/p05.jpg"],
    artistId: null, patternIds: ["pattern-torn-paper"], productIds: [],
    client: L("کافه سنگ‌فرش", "Sangfarsh Café"), location: L("کرج", "Karaj"), year: 2024,
    scope: L("طراحی الگو، چاپ پانل سفارشی", "Pattern design, custom panel print"),
    categoryId: "cat-abstract", featured: true, isProject: true, size: "wide",
  },
  {
    id: "portfolio-nursery-moon-cloud",
    slug: "nursery-moon-cloud",
    title: L("اتاق نوزاد؛ ماه، ابر و بالن", "Nursery — Moon, Cloud & Balloon"),
    subtitle: L("چاپ با جوهر پایه‌آب، مناسب اتاق نوزاد", "Printed with odourless water-based inks"),
    intro: L("الگوی پاستلی با ماه‌های خواب‌آلود، ابر و بالن‌های کوچک در کرم، آبی پودری و خردلی؛ چاپ با جوهر پایه‌آب بدون بو.", "A pastel nursery pattern with sleepy moons, clouds and little balloons in cream, powder blue and mustard — printed with odourless water-based inks."),
    story: [
      { type: "image", image: "/images/portfolios/pf-kids.jpg" },
      { type: "text", text: L("نان‌وون بدون PVC با جوهر گرین‌گارد، مناسب اتاق نوزاد؛ ۱۴ متر مربع در ۲ روز.", "PVC-free non-woven with GreenGuard ink — 14 m² in 2 days.") },
    ],
    cover: "/images/portfolios/pf-kids.jpg",
    gallery: ["/images/portfolios/pf-kids.jpg", "/images/patterns/p07.jpg"],
    artistId: "artist-sara-mehr", patternIds: ["pattern-little-moons"], productIds: [],
    client: L("خصوصی", "Private"), location: L("تهران", "Tehran"), year: 2025,
    scope: L("کاغذ دیواری کودک", "Kids wallpaper"),
    categoryId: "cat-kids", featured: true, isProject: false, size: "square",
  },
  {
    id: "portfolio-studio-minimal-office",
    slug: "studio-minimal-office",
    title: L("استودیوی مینیمال؛ دفتر معماری", "Minimal Office — Architecture Studio"),
    subtitle: L("دفتری که تقریباً سفید است", "An office that is almost white"),
    intro: L("برای یک استودیوی معماری، شبکه‌ی ظریف روی تنها دیوار اصلی نصب شد؛ بقیه سفید ماند.", "For an architecture studio, a fine hairline grid was applied to the single main wall — the rest stayed white."),
    story: [
      { type: "image", image: "/images/portfolios/pf-office.jpg" },
      { type: "text", text: L("کاغذ دیواری مینیمال در دفتر کار؛ نظم بصری بدون شلوغی.", "Minimal wallpaper in the workplace — visual order without noise.") },
    ],
    cover: "/images/portfolios/pf-office.jpg",
    gallery: ["/images/portfolios/pf-office.jpg", "/images/patterns/p06.jpg"],
    artistId: "artist-arman-kian", patternIds: ["pattern-hairline-grid"], productIds: [],
    client: L("خصوصی", "Private"), location: L("تهران", "Tehran"), year: 2025,
    scope: L("کاغذ دیواری", "Wallpaper"),
    categoryId: "cat-minimal", featured: false, isProject: true, size: "square",
  },
];

/* ------------------------------------------------------------------ */
/* Education                                                            */
/* ------------------------------------------------------------------ */
const body = (fa: string, en: string) => L(fa, en);
export const education: EducationItem[] = [
  { id: "edu-pattern-design-foundations", slug: "pattern-design-foundations", type: "course", title: L("مبانی طراحی الگو", "Pattern Design Foundations"), excerpt: L("از موتیف تا تکرار بی‌درز؛ برای کاغذدیواری، پارچه و پرده.", "From motif to seamless repeat — for wallpaper, fabric and curtains."), body: body("در این دوره یاد می‌گیرید چطور یک موتیف را طراحی، پالت را انتخاب و تکرار بی‌درز بسازید. هر درس با تمرین عملی همراه است.\n\nفصل اول به مشاهده و اسکیس می‌پردازد. فصل دوم به ساختار تکرار: بلوک، نیم‌افت و آجری. فصل سوم درباره‌ی رنگ و مقیاس برای کاغذ دیواری و پارچه است.", "In this course you learn to design a motif, choose a palette and build a seamless repeat. Every lesson comes with a practical exercise.\n\nChapter one covers observation and sketching. Chapter two covers repeat structures: block, half-drop and brick. Chapter three covers colour and scale for wallpaper and textile."), image: "/images/education/e01.jpg", authorId: "artist-razieh-khairipour", difficulty: "beginner", durationMin: 420, lessons: 18, price: { fa: 980000, en: 29 }, lessonList: [ { id: "l01", title: L("معرفی دوره و ابزارها", "Course intro & tools"), durationMin: 12, free: true }, { id: "l02", title: L("مشاهده و اسکیس اولیه", "Observation & first sketch"), durationMin: 22, free: true }, { id: "l03", title: L("ساده‌سازی موتیف", "Simplifying the motif"), durationMin: 28 }, { id: "l04", title: L("تکرار بلوک", "Block repeat"), durationMin: 24 }, { id: "l05", title: L("تکرار نیم‌افت", "Half-drop repeat"), durationMin: 26 }, { id: "l06", title: L("تکرار آجری", "Brick repeat"), durationMin: 24 }, { id: "l07", title: L("انتخاب پالت رنگی", "Choosing a colour palette"), durationMin: 30 }, { id: "l08", title: L("مقیاس برای کاغذدیواری", "Scale for wallpaper"), durationMin: 22 }, { id: "l09", title: L("مقیاس برای پارچه", "Scale for fabric"), durationMin: 20 }, { id: "l10", title: L("تبدیل به فایل دیجیتال", "Converting to digital file"), durationMin: 35 }, { id: "l11", title: L("تمیزکاری و اسکن", "Clean-up & scanning"), durationMin: 28 }, { id: "l12", title: L("رنگ‌بندی جدید (کالروِی)", "New colourway"), durationMin: 30 }, { id: "l13", title: L("آماده‌سازی فایل چاپ", "Preparing print file"), durationMin: 25 }, { id: "l14", title: L("خروجی AI و PDF", "Exporting AI & PDF"), durationMin: 18 }, { id: "l15", title: L("ارائه به مشتری", "Presenting to a client"), durationMin: 20 }, { id: "l16", title: L("لایسنس تجاری", "Commercial licence"), durationMin: 15 }, { id: "l17", title: L("قیمت‌گذاری و فروش", "Pricing & selling"), durationMin: 18 }, { id: "l18", title: L("پروژه نهایی", "Final project"), durationMin: 45 }, ], categoryId: "cat-botanical", patternIds: ["pattern-quiet-garden", "pattern-dusty-bloom"], productIds: ["product-wallpaper-quiet-garden", "product-fabric-dusty-bloom"], featured: true, popular: true, publishedAt: "2026-06-01" },
  { id: "edu-colour-for-interiors", slug: "colour-for-interiors", type: "course", title: L("رنگ برای فضای داخلی", "Colour for Interiors"), excerpt: L("چطور پالت کاغذدیواری، پارچه و پرده را با نور فضا هماهنگ کنیم.", "How to tune wallpaper, fabric and curtain palettes to a room's light."), body: body("سارا مهر با مثال‌های واقعی توضیح می‌دهد چطور یک پالت را برای نور شمالی یا جنوبی تنظیم کند.", "Sara Mehr explains with real examples how to adjust a palette for north- or south-facing light."), image: "/images/education/e02.jpg", authorId: "artist-sara-mehr", difficulty: "intermediate", durationMin: 180, lessons: 6, price: { fa: 590000, en: 18 }, categoryId: "cat-floral", patternIds: ["pattern-dusty-bloom", "pattern-little-moons"], productIds: [], featured: false, popular: true, publishedAt: "2026-08-05", draftStatus: "published" as const },
  { id: "edu-geometry-and-rhythm", slug: "geometry-and-rhythm", type: "course", title: L("هندسه و ریتم", "Geometry & Rhythm"), excerpt: L("ساخت الگوهای هندسی دقیق برای کاغذدیواری و پارچه مبلی.", "Building precise geometric patterns for wallpaper and upholstery fabric."), body: body("آرمان کیان روش کارش با شبکه‌های شش‌ضلعی و تقارن‌های ۱۷گانه را آموزش می‌دهد.", "Arman Kian teaches his method with hexagonal grids and the 17 wallpaper symmetry groups."), image: "/images/education/e03.jpg", authorId: "artist-arman-kian", difficulty: "advanced", durationMin: 300, lessons: 12, categoryId: "cat-geometric", patternIds: ["pattern-arc-lattice", "pattern-hairline-grid"], productIds: ["product-fabric-arc-lattice", "product-wallpaper-copper-damask"], featured: true, popular: false, publishedAt: "2026-05-20" },
  { id: "edu-persian-ornament-course", slug: "persian-ornament-course", type: "course", title: L("نقش ایرانی: اسلیمی و ختایی", "Persian Ornament: Eslimi & Khatai"), excerpt: L("یادگیری سه خانواده اصلی نقش ایرانی برای طراحی معاصر.", "Learning the three main families of Persian ornament for contemporary design."), body: body("حسین تبریزی با چهار دهه تجربه، اسلیمی، ختایی و بته‌جقه را آموزش می‌دهد.", "Hossein Tabrizi with four decades of experience teaches eslimi, khatai and boteh."), image: "/images/education/e04.jpg", authorId: "artist-hossein-tabrizi", difficulty: "intermediate", durationMin: 360, lessons: 14, price: { fa: 890000, en: 27 }, categoryId: "cat-persian", patternIds: ["pattern-lapis-eslimi"], productIds: [], featured: false, popular: true, publishedAt: "2026-04-02", draftStatus: "published" as const },

  /* ── ورکشاپ آنلاین ── */
  {
    id: "edu-workshop-botanical-repeat",
    slug: "workshop-botanical-repeat",
    type: "workshop",
    title: L("ورکشاپ: تکرار گیاهی در Illustrator", "Workshop: Botanical Repeat in Illustrator"),
    excerpt: L("یک جلسه ۲ ساعته زنده با راضیه خیری پور — از اسکچ تا پترن آماده چاپ.", "A 2-hour live session with Razieh Khairipour — from sketch to print-ready pattern."),
    body: body(
      "در این ورکشاپ زنده، راضیه خیری پور گام‌به‌گام یک پترن گیاهی را در Adobe Illustrator می‌سازد. شرکت‌کنندگان می‌توانند سؤال بپرسند و فایل‌ها را بعد از جلسه دریافت کنند.",
      "In this live workshop, Razieh Khairipour builds a botanical pattern step-by-step in Adobe Illustrator. Participants can ask questions and receive files after the session."
    ),
    image: "/images/education/e01.jpg",
    authorId: "artist-razieh-khairipour",
    difficulty: "intermediate",
    durationMin: 120,
    lessons: 1,
    price: { fa: 450000, en: 14 },
    categoryId: "cat-botanical",
    patternIds: ["pattern-quiet-garden"],
    productIds: [],
    featured: true,
    popular: true,
    publishedAt: "2026-09-10",
    liveEvent: {
      isOnline: true,
      startsAt: "2026-09-20T17:00:00.000Z",
      durationMin: 120,
      capacity: 30,
      registeredCount: 24,
      meetLink: "https://zoom.us/j/123456789",
      platform: "Zoom",
      status: "scheduled",
      certificateEnabled: true,
      recordingDownloadable: true,
      recordingPublic: false,
      hostName: L("راضیه خیری پور", "Razieh Khairipour"),
      hostNameCustom: true,
    } satisfies LiveEventConfig,
  },

  /* ── وبینار ── */
  {
    id: "edu-webinar-market-trends-2026",
    slug: "webinar-market-trends-2026",
    type: "webinar",
    title: L("وبینار: ترندهای بازار کاغذدیواری ۲۰۲۶", "Webinar: Wallpaper Market Trends 2026"),
    excerpt: L("بررسی ترندهای رنگ، الگو و متریال برای سال آینده با کارشناسان صنعت.", "An expert panel reviewing colour, pattern and material trends for the coming year."),
    body: body(
      "این وبینار رایگان با حضور سه متخصص صنعت، آخرین گزارش‌های بازار جهانی کاغذدیواری را بررسی می‌کند و پیش‌بینی‌هایی برای ۲۰۲۶ ارائه می‌دهد.",
      "This free webinar features three industry specialists reviewing the latest global wallpaper market reports and offering predictions for 2026."
    ),
    image: "/images/education/e03.jpg",
    authorId: "artist-razieh-khairipour",
    difficulty: "beginner",
    durationMin: 90,
    lessons: 1,
    price: undefined,
    categoryId: "cat-contemporary",
    patternIds: [],
    productIds: [],
    featured: false,
    popular: true,
    publishedAt: "2026-09-15",
    liveEvent: {
      isOnline: true,
      startsAt: "2026-09-25T15:00:00.000Z",
      durationMin: 90,
      capacity: 200,
      registeredCount: 87,
      status: "scheduled",
      certificateEnabled: false,
      recordingDownloadable: true,
      recordingPublic: true,
      hostName: L("راضیه خیری پور", "Razieh Khairipour"),
      hostNameCustom: true,
      webinarStream: {
        source: "camera",
        chatEnabled: true,
        qaEnabled: true,
        maxViewers: 200,
      },
    } satisfies LiveEventConfig,
  },
];

export const stories: Story[] = [
  { id: "story-niloufar-rad-morning-light", slug: "niloufar-rad-morning-light", artistId: "artist-niloufar-rad", title: L("نور صبح در استودیوی نیلوفر", "Morning light in Niloufar's studio"), excerpt: L("از یک برگ تا کاغذدیواری؛ درباره‌ی گواش، صبر و چاپ روی سطح.", "From one leaf to wallpaper — on gouache, patience and printing on surface."), body: L("«من همیشه با یک برگ شروع می‌کنم…»", '"I always begin with a single leaf\u2026"'), image: "/images/artists/cover-niloufar.jpg", publishedAt: "2026-07-01" },
  { id: "story-hossein-tabrizi-forty-years", slug: "hossein-tabrizi-forty-years", artistId: "artist-hossein-tabrizi", title: L("چهل سال با نقش", "Forty years with ornament"), excerpt: L("از کارگاه کاشی تا کاغذدیواری و دکور معاصر.", "From the tile workshop to contemporary wallpaper and décor."), body: L("«نقش زبان است؛ فقط باید امروز حرفش را بزنی.»", '"Ornament is a language; you just have to speak it today."'), image: "/images/artists/cover-hossein.jpg", publishedAt: "2026-06-12" },
  { id: "story-sara-mehr-small-stories", slug: "sara-mehr-small-stories", artistId: "artist-sara-mehr", title: L("داستان‌های کوچک سارا", "Sara's small stories"), excerpt: L("چطور پارچه و کاغذدیواری کودک می‌تواند یک کتاب تصویری باشد.", "How kids' fabric and wallpaper can become a picture book."), body: L("«الگوی کودک باید مثل لالایی باشد.»", '"A kids\' pattern should feel like a lullaby."'), image: "/images/artists/cover-sara.jpg", publishedAt: "2026-05-22" },
];

export const collections: Collection[] = [
  { id: "col-atelier-exclusive", slug: "atelier-exclusive", title: L("کالکشن اختصاصی آتلیه", "Atelier Exclusive"), description: L("کاغذدیواری، پرده و دکور طراحی‌شده توسط رزی آتلیه.", "Wallpaper, curtains and décor designed by Rosie Atelier."), cover: "/images/products/curtain-linen.jpg", patternIds: ["pattern-torn-paper", "pattern-hairline-grid", "pattern-quiet-garden"], productIds: ["product-curtain-quiet-garden", "product-decor-cushion-set", "product-decor-atelier-lamp", "product-wallpaper-quiet-garden"] },
  { id: "col-quiet-interiors", slug: "quiet-interiors", title: L("فضاهای آرام", "Quiet Interiors"), description: L("کاغذدیواری گیاهی، پارچه نرم و پرده‌ی روشن برای خانه‌های آرام.", "Botanical wallpaper, soft fabric and light curtains for calm homes."), cover: "/images/products/wallpaper-botanical.jpg", patternIds: ["pattern-quiet-garden", "pattern-hairline-grid", "pattern-dusty-bloom"], productIds: ["product-wallpaper-quiet-garden", "product-fabric-dusty-bloom", "product-curtain-quiet-garden"] },
  { id: "col-evening-spaces", slug: "evening-spaces", title: L("فضاهای شبانه", "Evening Spaces"), description: L("کاغذدیواری لوکس، پرده مخمل و دکور با عمق فلزی.", "Luxury wallpaper, velvet curtains and décor with metallic depth."), cover: "/images/products/wallpaper-damask.jpg", patternIds: ["pattern-copper-damask", "pattern-arc-lattice", "pattern-lapis-eslimi"], productIds: ["product-wallpaper-copper-damask", "product-curtain-copper-damask", "product-decor-atelier-lamp", "product-wallpaper-lapis-eslimi"] },
];

export const homeSections: HomeSection[] = [
  "hero", "discovery", "trending", "bestSellers", "newPatterns", "artists", "portfolios", "styles", "spaces", "exclusive", "projects", "education", "b2b", "custom", "stories", "newsletter",
].map((key, i) => ({ key: key as HomeSection["key"], enabled: true, order: i + 1 }));

export const banners: Banner[] = [
  { id: "banner-free-shipping", title: L("ارسال رایگان", "Free shipping"), text: L("برای سفارش‌های کالکشن اختصاصی بالای ۲ میلیون تومان", "On exclusive collection orders over $120"), href: "/shop", enabled: true, placement: "shop" },
];

export const announcementBars: AnnouncementBarConfig[] = [
  {
    id: "ab-live-webinar",
    kind: "live-webinar",
    enabled: false,
    message: L("وبینار زنده!", "Live now!"),
    href: "",
    ctaLabel: L("ورود به رویداد", "Join now"),
    bgColor: "#dc2626",
    textColor: "#ffffff",
    transition: "slide-down",
  },
  {
    id: "ab-webinar",
    kind: "webinar",
    enabled: false,
    message: L("وبینار طراحی الگو — همین حالا ثبت‌نام کنید!", "Pattern design webinar — register now!"),
    href: "/academy",
    ctaLabel: L("ثبت‌نام", "Register"),
    bgColor: "#1a1a2e",
    textColor: "#ffffff",
    transition: "slide-down",
  },
  {
    id: "ab-sale",
    kind: "sale",
    enabled: false,
    message: L("حراجی ویژه — تا ۴۰٪ تخفیف روی همه محصولات!", "Special sale — up to 40% off all products!"),
    href: "/shop",
    ctaLabel: L("مشاهده تخفیف‌ها", "Shop sale"),
    bgColor: "#b91c1c",
    textColor: "#ffffff",
    transition: "slide-down",
  },
  {
    id: "ab-custom",
    kind: "custom",
    enabled: false,
    message: L("پیام سفارشی خود را اینجا بنویسید.", "Write your custom message here."),
    href: "/",
    ctaLabel: L("بیشتر بدانید", "Learn more"),
    bgColor: "#1e2230",
    textColor: "#ffffff",
    transition: "fade",
  },
];

export const seo: SeoMeta[] = [
  { path: "/", title: L("رزی آتلیه — الگو، کاغذدیواری، پارچه و دکور", "Rosie Atelier — Pattern, Wallpaper, Fabric & Décor"), description: L("الگوهای اورجینال برای کاغذدیواری، طراحی پارچه، پرده و دکور — با طراحان مستقل.", "Original patterns for wallpaper, fabric design, curtains and décor — with independent designers.") },
  { path: "/patterns", title: L("الگوها — رزی آتلیه", "Patterns — Rosie Atelier"), description: L("کتابخانه‌ی الگوهای اورجینال با لایسنس تجاری برای سطح و فضا.", "A library of original patterns with commercial licenses for surface and space.") },
  { path: "/shop", title: L("فروشگاه — کاغذدیواری، پارچه، پرده، دکور", "Shop — Wallpaper, Fabric, Curtains, Décor"), description: L("کاغذدیواری، طراحی پارچه، پرده و اشیاء دکور با الگوهای رزی آتلیه.", "Wallpaper, fabric design, curtains and décor objects with Rosie Atelier patterns.") },
  { path: "/portfolio", title: L("پورتفولیو — رزی آتلیه", "Portfolio — Rosie Atelier"), description: L("پروژه‌های اجراشده: کاغذدیواری، پرده و دکور در فضاهای واقعی.", "Realised projects: wallpaper, curtains and décor in real spaces.") },
  { path: "/academy", title: L("آکادمی — رزی آتلیه", "Academy — Rosie Atelier"), description: L("آموزش طراحی الگو از مبانی تا کاغذدیواری و پارچه.", "Pattern design education from foundations to wallpaper and textile.") },
];

export const hero: HeroContent = {
  eyebrow: L("استودیوی الگو و طراحی · از ۱۴۰۲", "Pattern & design studio · est. 2023"),
  titleA: L("الگوهایی که", "Patterns that"),
  titleB: L("فضا را روایت می‌کنند.", "tell the story of a space."),
  description: L("رزی آتلیه پلتفرم کشف الگو، محصولات دکوراتیو و همکاری با طراحان مستقل است — از سطح تا سبک زندگی.", "Rosie Atelier is a platform for discovering patterns, decorative products and collaborating with independent designers — from surface to lifestyle."),
  /* 4 paired slides: each bg matches the same-index featured pattern preview card */
  image: "/images/hero/hero-bg-01.jpg",
  images: [
    "/images/hero/hero-bg-01.jpg", // 01 pattern/wallpaper — botanical living room ↔ preview-01
    "/images/hero/hero-bg-02.jpg", // 02 pattern/wallpaper — Persian eslimi atelier ↔ preview-02
    "/images/hero/hero-bg-03.jpg", // 03 fabric/fashion — copper damask couture room ↔ preview-03
    "/images/hero/hero-bg-04.jpg", // 04 fabric/fashion — peony dress atelier ↔ preview-04
  ],
  ctaHref: "/patterns",
  cta2Href: "/portfolio",
  featuredPatternIds: ["pattern-quiet-garden", "pattern-lapis-eslimi", "pattern-copper-damask", "pattern-dusty-bloom"],
};

export const seedContent: SiteContent = {
  categories, spaces, artists, patterns, products, portfolios, education, stories, collections, homeSections, banners, seo, hero, announcementBars,
};
