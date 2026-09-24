# Rosie Atelier

Premium bilingual (فارسی RTL / English LTR) platform for **patterns · creators · portfolios · products · education**.

Built with Next.js 15 (App Router), React 19, Tailwind v4 and a token-driven design system.
Repository: [`milanorezaee2/Rozadi`](https://github.com/milanorezaee2/Rozadi) · Production host: **Netlify / Vercel** (SSR).

## Run

```bash
npm install
npm run dev      # http://localhost:3000 → redirects to /fa (or /en)
npm run check    # typecheck + lint
npm run build && npm start
```

## Live / Deploy

**GitHub repo:** https://github.com/milanorezaee2/Rozadi  

### One-click deploy

| Platform | Button |
| --- | --- |
| **Netlify** | [![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/milanorezaee2/Rozadi) |
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/milanorezaee2/Rozadi) |

After import, set environment variables (see `.env.example`):

- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL` = your public URL (no trailing slash)
- Optional: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for persistent admin content

Then open `https://<your-site>/api/health` — expect `"ok": true`.

### Local production

```bash
npm ci && npm run build && npm start
# → http://localhost:3000/fa
```

`npm run build` also runs `postbuild` (`scripts/sync-standalone.mjs`), which copies `public/`
and `dist/.next/static/` into `dist/.next/standalone/` — `next build` does not do that itself, and
without it the standalone server answers HTML while every stylesheet, script and image 404s.

To run the standalone bundle instead of `next start`:

```bash
npm run build
ADMIN_EMAIL=… ADMIN_PASSWORD=… AUTH_SECRET=… PORT=3000 HOSTNAME=0.0.0.0 \
  node dist/.next/standalone/server.js      # it chdirs into dist/.next/standalone itself
```

If you ever build and then move things by hand, re-run `node scripts/sync-standalone.mjs` before
starting the server.

#### Runtime data and builds

The store writes JSON and master files into `data/` relative to the working directory, so the
standalone server owns `dist/.next/standalone/data`. `next build` bundles the repository copy of
`data/*.json` (and `data/objects/**`) into that same folder — without protection, every deploy
would overwrite live uploads, orders, licences and reservations with the committed snapshot.
`scripts/preserve-data.mjs` fixes that: `prebuild` snapshots the running store to
`.runtime-data/`, `postbuild` restores it verbatim. To re-seed the running store from `data/` on
purpose, build with `ROZVELT_DATA_FROM_REPO=1`.

## Structure

```
src/
  app/[locale]/            # all routes, locale-prefixed (fa | en)
    page.tsx               # homepage — sections driven by admin config
    patterns/ shop/ artists/ portfolio/ academy/ styles/ spaces/ collections/
    stories/ projects/ custom/ about/ contact/ faq/ returns/ legal/[doc]/
    login/ signup/ account/ favorites/ checkout/ search/ creators/join/ admin/
    artist/                # dashboard (new) · marketplace (sales studio) · portfolio (manager)
  app/api/                 # newsletter, contact, admin content, auth, search-index, health
  app/sitemap.ts robots.ts # generated SEO files (use NEXT_PUBLIC_SITE_URL)
  components/
    ui/                    # Button, Badge/Sku, Tabs/Chips, Modal, Reveal, SpotlightCard,
                           # BentoGrid, GlassPanel, SectionHeader, PageHero, Carousel, States
    layout/                # Header, MegaMenu, StoreDropdown, SearchPalette, CartDrawer, Footer
    cards/                 # PatternCard, ProductCard, ArtistCard, PortfolioCard, EducationCard, StyleCard
    product/               # ColorSwatches, Actions, QuickView, Gallery, FilterBar, BuyBoxes
    portfolio/ profile/ home/ admin/ providers/
    artist/                # ArtistDashboardView + dashboard parts (server-rendered)
    portfolio/             # PortfolioGrid, PortfolioIntro (the founder's introduction), lightbox
  lib/
    i18n/                  # locale types + dictionary
    data/seed.ts           # seed content (patterns, products, artists, portfolios, education…)
    data/store.ts          # content store (Upstash Redis → Vercel Blob → data/content.json)
    data/queries.ts        # enrich/join helpers
    artist/dashboard.ts    # everything the artist dashboard renders (server-side)
    portfolio-translations.ts  # bilingual copy of the founder's personal portfolio (/{locale}/razieh)
    razieh-profile.ts      # the founder's complete introduction (bio, path, facts) for /portfolio
    types.ts               # data model
  app/globals.css          # single source of truth: tokens, typography, motion, primitives
public/
  fonts/iransanse-web/     # Persian font family (see README inside), inter/, instrument-serif/
  images/{hero,patterns,products,portfolios,education,collections,artists}
```

## Design system

- **Tokens** in `globals.css`: `--background` (white), `--surface`, `--foreground`, `--primary` (slate),
  `--accent` (copper), `--blue`, shadows (soft/medium/elevated/glow), radii, motion.
- **Dark mode**: `html[data-theme="dark"]` — a real deep/cinematic theme, toggled in header/footer.
- **Typography**: `font-display` (Instrument Serif) for Latin editorial headlines; **all Persian text
  resolves to `iransanse-web`** via `html[lang=fa]` rules; scale utilities `text-display … text-label`.
- **Motion**: `anim-blur-in`, `anim-fade-up`, `anim-scale-fade`, `[data-reveal]` scroll reveal,
  `img-zoom`, `arrow-shift`, `.spotlight` — all respect `prefers-reduced-motion`.
- **RTL/LTR**: logical properties only (`ms/me/ps/pe/start/end/inset-inline`), `rtl-flip` for icons.

## Digital marketplace

The digital licensing storefront (private master upload → admin review → payment → signed download →
PDF certificate → royalties → subscriptions) is documented in **[`MARKETPLACE.md`](./MARKETPLACE.md)** —
including the audit, every new route, the env flags and a step-by-step test recipe.
Without `ZARINPAL_MERCHANT_ID` the built-in sandbox gateway takes over, so a full test purchase works
end-to-end today.

## The shop hero

The shop's hero (`src/components/shop/ShopHero.tsx`, rendered by `/{locale}/shop`) is one section in
four movements — and the only part of the shop that is custom; the catalogue below it (family
sections, sidebar tree, filters, sorting) is `ShopFiltered`, unchanged:

1. **the boutique panel** — a dark editorial card: the shop eyebrow, the collection's title and copy,
   and the two doors into the catalogue (`/shop?owner=site` · `/shop?owner=artist`);
2. **live numbers** taken from the real catalogue, not typed by hand: products · families in use
   (e.g. `4/8`) · colourways · contributing designers;
3. **the product mosaic** — the lead site-owned featured piece (family · maker · SKU · price), a
   second piece, and the lead's colourways with their swatch tiles, instead of a single flat image;
4. **the family rail** — all eight families of `lib/data/families.ts` as `?family=<slug>` chips with
   their counts, beside the service note from the shop banner.

`scripts/marketplace-smoke/shop-hero-e2e.sh` pins it down in both locales: the panel and its two
CTAs, the four numbers **recomputed from the store the server is using** (`DATA=…`), the mosaic
(lead link, badge, SKU, family, second piece, colourway names and images), all eight family links
with their real counts, and that the catalogue below (family sections, result counter, `?family=`
isolation) still behaves.

## Product taxonomy (families)

Products belong to one of eight families, defined once in `src/lib/data/families.ts` and stored on
`Product.familyId` (and, for marketplace uploads, on `UploadSession.meta.familyId` → `Asset.familyId`):

کاغذ دیواری · پارچه دکوراسیون داخلی · پرده · کوسن · روتختی · رومیزی · پارچه مبلمان · آثار هنری دیواری
(Wallpaper · Home Fabric · Curtain · Cushion · Bedding · Tablecloth · Upholstery Fabric · Wall Art)

- **Shop** — `/{locale}/shop` renders one section per family in that order (plus «سایر محصولات /
  Other products» for products without a family) and `?family=<slug>` filters to a single family;
  `?family` composes with `?category`, `?artist`, sorting and search. Style categories are unchanged.
- **Sidebar** — the families appear as nested sub-categories under «الگو / Pattern», above the style
  categories, with live counts.
- **Artist upload** — the uploader in the artist profile requires a family; the session API answers
  `invalid_family` otherwise. After a successful upload the artist is redirected to that family in the
  shop (`/{locale}/shop?family=<slug>`), and `/artist` shows the family next to each asset.
- **Admin** — `ProductsManager` gives every product a «دسته محصول» selector (including «بدون دسته»).

## Artists: registration & dashboard

Registration is the two doors the site always had, each with its own form:

- `/{locale}/signup` — **the registration form**: it carries the account-type choice itself
  («خریدار» / «هنرمند / طراح», radios named `account_role`) next to the four account fields (name,
  e-mail, password, confirmation) — pick the artist half and the account is created as an artist. The
  shell then hands the new account over to the login transition.
- `/{locale}/creators/join` — **designers / sellers**: the signup page with the perks, the designers
  already on board and its own single-page seller form (name, e-mail, phone, field of practice, city,
  Instagram, portfolio and the password pair). Only the four account fields are required; the rest is
  optional and can be completed later from the artist dashboard. `POST /api/auth/signup` creates the
  account, stores what was given on the `Artist` record (`signupPhone`, `signupCity`,
  `signupSpecialty`, `signupPortfolioUrl`, the Instagram handle and the portfolio link), signs the
  designer in and sends the file to admin review as `pending`. Together the two doors cover both
  kinds of account: the quick one for buyers (and for designers who want to fill the file in later) and
  the full seller application for designers.

The artist area:

- `/{locale}/artist` — **artist dashboard** (server-rendered): identity + status, onboarding ribbon,
  KPIs with 30-day trend arrows, work status, wallet & payout summary, delivery-at-a-glance
  (colourways · files · total size · format spread), "make it sell better" hints (missing recommended
  formats, single-colour works, missing previews), every work with its colour swatches and format
  chips, latest ledger rows and the sales mix. Quick actions deep-link into the studio tabs.
- `/{locale}/artist/marketplace` — the sales studio (`?tab=assets|upload|wallet|analytics|affiliate`).
- `/{locale}/artist/portfolio` — the portfolio manager (patterns, products, profile, stats).
- `/{locale}/account` — **the designer's own profile page is the dashboard**: an artist (or any account
  with an artist profile) gets `ArtistDashboardPanel` — the very same server-rendered dashboard, with
  none of the buyer sections (no overview, reservations, orders or settings, no account banner). Both
  routes render byte-for-byte the same content. **Buyers** keep their account view untouched.
- Signed-out visitors are redirected to login; a signed-in **buyer** is shown an honest upsell to the
  designer registration instead of a form they cannot use (the artist APIs still enforce the role).

## The portfolio page & the founder's introduction

`/{locale}/portfolio` is the atelier's gallery — and it now opens with a **complete, dedicated
introduction of راضیه خیری‌پور**, the founder. The page reads:

1. the page hero (breadcrumb, «گالری پروژه‌های اجراشده») as before;
2. **the introduction** — portrait/atelier image, the eyebrow «معرفی بنیان‌گذار», the name, her
   standing and her fields, the full five-paragraph biography, the discipline chips, the signature,
   then the four key numbers (years of practice · patterns · exhibitions · students);
3. **the path and the facts** — «مسیر حرفه‌ای» with its four milestones (2009 · teaching · 2023 ·
   today) beside «در یک نگاه» (academic role, field of work, based in, languages) and the card that
   leads to her personal portfolio;
4. **the works** — the «آثار منتخب و پروژه‌های اجراشده» heading, the statistics bar, the filter bar
   and the masonry grid of the six realised projects (untouched);
5. **the closing band** — how to collaborate: contact, academy, the studio and the designer entry.

All of the copy lives in `src/lib/razieh-profile.ts` (bilingual `fa` / `en`) and is rendered by
`src/components/portfolio/PortfolioIntro.tsx` on the server, so every line of the introduction is in
the first HTML response.

The two portfolio surfaces are now one experience: the introduction links to **`/{locale}/razieh`**,
the founder's own portfolio page (hero · about · works · philosophy · academic · contact, with its own
language switch), which links back to the atelier's gallery in its hero menu. `/razieh` is also
listed in the footer and in `sitemap.xml`, so it is no longer an orphan page.

The rig for all of this is `scripts/marketplace-smoke/portfolio-e2e.sh` (78 checks across both
locales): the introduction is complete and sits above the works, the gallery keeps its six projects,
the two pages point at each other, and the footer/sitemap entries exist.

## Signing out

`SignOutButton` (`src/components/profile/SignOutButton.tsx`) is the single sign-out control, in four
variants (`solid` / `outline` / `ghost` / `menu` + an icon-only form). It is offered everywhere a
signed-in visitor can be:

| Where | How it appears |
|---|---|
| Header | avatar opens an account menu (account, licenses, artist dashboard, sales studio) ending with «خروج از حساب» |
| Header (mobile) | the menu shows the signed-in account card with a sign-out button |
| `/account` | profile header button, a row at the end of the sidebar menu, and a dedicated row in **Settings** |
| `/account/licenses` | same header shell |
| `/artist`, `/artist/marketplace`, `/artist/portfolio` | button next to the page actions |

Clicking it clears the session cookie, **replaces** the history entry (so Back cannot return to a
private page) and refreshes the router, so every server component re-renders as a guest.

Data for the dashboard comes from `src/lib/artist/dashboard.ts` (artist record + works with delivery
detail + analytics with a previous-period comparison + wallet), so the page itself is a pure view.

## Academy

The academy homepage (hero preview video, real computed statistics, real enrolment form) and the
navigation change (آکادمی · هنرمندان · پورتفولیو · فروشگاه) are documented in
**[`ACADEMY.md`](./ACADEMY.md)** — including how the preview video is generated
(`scripts/academy/make-preview-video.py`), how an admin can replace it by uploading a video for a
course, and the enrolment smoke check (`scripts/academy/enroll-e2e.sh`).

## Admin

Sign in at `/{locale}/login` with the admin account → `/{locale}/admin`.
Manage: homepage sections (order/visibility), hero, categories/styles, pattern/product/artist/
portfolio/education flags & ordering, banners, SEO. Every save is live immediately (all pages are dynamic).

- **Auth**: server-side, HMAC-signed HttpOnly cookie (`src/lib/auth.ts`, `/api/auth/*`), with a small
  per-IP+email login throttle (`src/lib/rate-limit.ts`) to blunt brute-force attempts.
  - Production: set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`.
  - Local dev without env vars: any `admin@…` email + ≥4-char password.
  - **Never cached**: `/api/auth/*` and `/api/admin/content` answer with `cache-control: private,
    no-store` + `netlify-cdn-cache-control: no-store` (`src/lib/http.ts`), and the browser sends them
    with `credentials: "same-origin"`. A replayed stale `/api/auth/me` would report "logged out"
    right after login and bounce the admin back to `/login`. `AppProviders` additionally guards the
    session with a version counter (`sessionVersionRef`): a `/me` answer that is older than the
    `login()`/`logout()` that raced it is dropped instead of overwriting the fresh session.
- **Storage** (`src/lib/data/store.ts`, first configured wins):
  1. Upstash Redis — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`  ← **required on Netlify**
  2. Vercel Blob — `BLOB_READ_WRITE_TOKEN` (practical on Vercel only)
  3. Local file — `data/content.json` (dev / VPS / Docker volume; **read-only on serverless**)

  If a save fails on a read-only filesystem the API answers `502 storage_write_failed` with the
  reason in the log — check `GET /api/health`, which reports the active backend.

## Deploy (Netlify — recommended)

This app is **server-rendered**: it uses middleware, route handlers (`/api/*`), a signed-cookie admin
session and admin-managed runtime content. Every page is `force-dynamic`.

1. **app.netlify.com → Add new site → Import an existing project → GitHub** → `milanopardi13/artikel` (branch `main`).
2. The `netlify.toml` in this repo configures everything (build command, `.next` publish,
   `@netlify/plugin-nextjs`, Node 20, security headers). Leave build settings as-is.
3. **Site configuration → Environment variables** — add:
   | Variable | Required? | Purpose |
   | --- | --- | --- |
   | `ADMIN_EMAIL` | yes (prod) | admin login user |
   | `ADMIN_PASSWORD` | yes (prod) | admin login password |
   | `AUTH_SECRET` | strongly recommended | cookie signing key (long random string) |
   | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | yes | persistent admin content (serverless FS is read-only) |
   | `NEXT_PUBLIC_SITE_URL` | yes | canonical URL for `sitemap.xml`, `robots.txt`, OG tags |
   See `.env.example` for details. **Redeploy after adding env vars** (env changes alone do not rebuild).
4. Verify: open `https://<site>/api/health` — expect `"persistent": true` and `"configured": true`.
5. Optional: **Domains** → connect your own domain.

Every push to the production branch rebuilds and redeploys automatically (~2–3 min). Preview deploys
are created for pushes on other branches.

### ⚠️ Not deployable to GitHub Pages / static hosting

The app **cannot** run as a static export: `output: "export"` fails the build because
`/api/*` route handlers use `force-dynamic` and middleware isn't supported in export mode.
Do not add a "Deploy to GitHub Pages" workflow to this repo — it will always fail.
Host it on a Node-capable platform (Netlify, Vercel, VPS, Docker, Liara…).

### Deploy (Vercel)

Import the same repo at **vercel.com/new** (framework auto-detected), set the same env vars, and
for persistent admin content attach **Storage → Upstash Redis** (or Vercel **Blob** — the code talks
to both over plain REST) → **Redeploy**. `vercel.json` pins the region to `fra1`; change it if your
audience is elsewhere.

### Other hosts (VPS / Docker / Liara / etc.)

`npm ci && npm run build && npm start` on Node 20+. Set the same env vars; without Redis/Blob, content persists
to `data/content.json` — keep that directory on a persistent volume.

## Performance notes

- All page payloads render on demand; images use `next/image` with explicit `sizes`.
- The global search palette does **not** receive the full catalog via props anymore — it lazily
  fetches `/api/search-index` (public, cacheable 5 min, locale-agnostic) on first use and warms it
  during browser idle time. This keeps the catalog listing out of every page's RSC payload.
- `sitemap.xml` / `robots.txt` are generated and revalidated hourly so new admin slugs appear
  without a redeploy.
