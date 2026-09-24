# Marketplace smoke tests

End-to-end checks that run **against a live server** (dev or production build) and touch only the
HTTP API — the same calls the browser makes. They need no test framework: `bash` + `python3`.

```bash
# 1. run the app
npm run build && node dist/.next/standalone/server.js       # or: npm run dev
# (env: ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_SECRET — see .env.example)

# 2. seed a local artist account so the artist flows can be exercised
DATA=dist/.next/standalone/data node scripts/marketplace-smoke/seed-artist-user.mjs

# 2b. (optional) fill an empty store with two complete, sellable works, so the
#     dashboard/storefront/buyer flow have something real to show — real files,
#     uploaded through the real APIs, approved and priced
node scripts/marketplace-smoke/mkformats.mjs /tmp/fmt
DATA=dist/.next/standalone/data node scripts/marketplace-smoke/seed-demo-works.mjs

# 3. run the checks (BASE defaults to http://localhost:3000,
#    DATA defaults to dist/.next/standalone/data)
bash scripts/marketplace-smoke/http-e2e.sh        # upload → review → buy → download → certificate
bash scripts/marketplace-smoke/exclusive-e2e.sh   # exclusive sale delists, refund relists
bash scripts/marketplace-smoke/artist-e2e.sh      # artist studio: prices, sale, payout, coupon
bash scripts/marketplace-smoke/sub-e2e.sh         # download pass, covered download, cancel
bash scripts/marketplace-smoke/family-e2e.sh      # product families: shop grouping, sidebar tree, ?family=
bash scripts/marketplace-smoke/formats-e2e.sh     # colourways + PNG/JPG/preview/AI/PSD/SVG/EPS delivery
bash scripts/marketplace-smoke/artist-dashboard-e2e.sh   # the two signup doors + artist dashboard
bash scripts/marketplace-smoke/pages.sh           # every storefront/admin page renders
bash scripts/marketplace-smoke/portfolio-e2e.sh   # the founder's introduction on /portfolio
bash scripts/marketplace-smoke/shop-hero-e2e.sh    # the shop hero: panel · numbers · mosaic · family rail
DATA=dist/.next/standalone/data \
MARKETPLACE_MULTIPART_THRESHOLD_MB=5 \
bash scripts/marketplace-smoke/multipart-e2e.sh   # 12 MB master uploaded in 8 MB chunks
```

Notes:

- `multipart-e2e.sh` is the only one that needs a specific server setting: start the app with
  `MARKETPLACE_MULTIPART_THRESHOLD_MB` below the size of the master it generates (12 MB), otherwise the
  upload takes the single-request path. It checks that the assembled master and the delivered download are
  both byte-identical to the source and that the staging chunks are deleted.
- `family-e2e.sh` is the taxonomy rig: it asserts the canonical family order in `/shop`, the eight
  nested sub-categories under «الگو» in the sidebar, `?family=<slug>` / `?family=other` isolation,
  that `?category=` still filters, and that the upload session rejects a missing/unknown `familyId`.
  It deletes the asset it uploads, so it can be re-run without polluting the store.
- `formats-e2e.sh` uploads one design in **two colourways with all seven formats** (`mkformats.mjs`
  builds the real files with `sharp`/`pdf-lib`), checks the refusal paths (`invalid_format`,
  `unsupported_type`, `raster_required`, `invalid_signature`), publishes it, buys it once and downloads
  all twelve deliverables — each must be byte-identical to what the artist uploaded.
- `artist-dashboard-e2e.sh` is the registration rig: it asserts the two doors the site always had —
  `/signup` serves the registration form with the account-type choice inside it («خریدار» /
  «هنرمند / طراح», radios named `account_role`) and the four account fields, with no seller field in it,
  and `/creators/join` is a real designer page (perks, designers, register prompt) with
  its own single-page seller form (name, e-mail, phone, field of practice, city, Instagram, portfolio,
  password pair) where only the four account fields are required and no step wizard exists. It also
  asserts that the extra registration pages tried in between (`/signup/buyer`, `/signup/artist`) are
  gone (404). Then it registers a designer for real and requires that `POST /api/auth/signup` stores
  exactly what the form sent (phone, city, field of practice, Instagram handle, portfolio link) on the
  Artist record, invents nothing when a field is left out, rejects a second registration with the same
  e-mail, that the admin sees the file and can approve it, that `/artist` is the dashboard (signed-out
  redirect, buyer upsell, artist KPIs/works/delivery/wallet) while `/artist/portfolio` still serves the
  portfolio manager, that `/account` for an artist is *exactly* the artist dashboard and carries none of
  the buyer account sections (while a buyer keeps their account page), and that signing out works
  everywhere. It creates and deletes its own accounts.
  **Note:** the signup endpoint
- `portfolio-e2e.sh` is the portfolio rig: it asserts the complete, dedicated introduction of
  راضیه خیری‌پور opens `/{locale}/portfolio` in both locales — eyebrow, name, role, all five
  biography paragraphs, the four key numbers, the professional path with its four milestones and the
  facts at a glance — that the introduction sits *above* the works heading and the gallery boundary,
  while the gallery itself keeps its six projects, statistics bar and closing collaboration band.
  It then checks that the two pages are one experience: the atelier's page links to `/{locale}/razieh`,
  the personal portfolio page links back and still carries its own six sections, and both are
  reachable from the footer and the sitemap.
- `shop-hero-e2e.sh` is the shop-hero rig: it reads the store the server is using (`DATA=…`) and
  recomputes the four hero numbers from it, so the panel can never claim a catalogue size the shop
  does not have. It also checks the mosaic's lead/second pieces (link, badge, SKU, family, price),
  the colourways (names + real colour images), all eight `?family=` chips with their counts, the
  service banner — and that the catalogue below the hero (family sections, result counter, family
  isolation) is untouched.
- The scripts print each step; `http-e2e.sh` also asserts that the downloaded bytes are byte-identical
  to the uploaded master and that a tampered token is rejected.
- They write to the app's local storage backend (`data/objects` and `data/mk-*.json`). Point `DATA` at
  the directory your server writes to — `dist/.next/standalone/data` when running the standalone build.
- The uploaded masters come from `mktile.py` (a genuinely tileable pattern, so the seamless detector
  can pass) and `mkpng.py` (a non-tileable gradient, used to prove the detector can fail).
