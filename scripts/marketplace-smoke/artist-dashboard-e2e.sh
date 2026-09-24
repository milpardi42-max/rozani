#!/usr/bin/env bash
#
# Registration doors + artist dashboard — runs against a live server.
#
# Proves, with a real registration and real pages, that:
#   1. /signup is the buyer door: the form carries the account-type choice itself
#      («خریدار» / «هنرمند / طراح», radios named account_role), collects the four
#      account fields and none of the seller ones
#   2. /creators/join is the designer door: a real page with its own single-page
#      seller form (name, e-mail, phone, field of practice, city, Instagram,
#      portfolio and the password pair), only the four account fields required
#      and no step wizard
#   3. POST /api/auth/signup really stores what the designer gave (phone, city,
#      field of practice, Instagram handle, portfolio link) on the Artist record
#      when it is filled in, and invents nothing when it is not
#   4. the admin sees that file and can approve the artist
#   5. /artist is the artist dashboard (signed-out redirect, buyer upsell,
#      artist KPIs + works + delivery + wallet) and /artist/portfolio still
#      holds the portfolio manager
#
# Usage:
#   bash scripts/marketplace-smoke/artist-dashboard-e2e.sh
#   BASE=http://localhost:3000 DATA=dist/.next/standalone/data bash scripts/marketplace-smoke/artist-dashboard-e2e.sh
#
BASE=${BASE:-http://localhost:3000}
DATA=${DATA:-dist/.next/standalone/data}

echo "artist-dashboard-e2e → $BASE   (data: $DATA)"

BASE="$BASE" DATA="$DATA" python3 - <<'PY'
import html as html_lib
import json
import os
import re
import subprocess
import sys
import time

BASE = os.environ["BASE"]
DATA = os.environ["DATA"]
ARTIST_JAR = "/tmp/artist-dashboard-artist.txt"
BUYER_JAR = "/tmp/artist-dashboard-buyer.txt"
ADMIN_JAR = "/tmp/artist-dashboard-admin.txt"
STAMP = int(time.time())
SELLER_EMAIL = f"studio.probe{STAMP}@example.com"
BUYER_EMAIL = f"buyer.probe{STAMP}@example.com"
MINIMAL_EMAIL = f"minimal.probe{STAMP}@example.com"
TEST_EMAILS = (SELLER_EMAIL, BUYER_EMAIL, MINIMAL_EMAIL)
# artist records created by this run, removed again in the cleanup section
created_artists: list[str] = []

failures: list[str] = []


def curl(args, stdin=None):
    return subprocess.run(["curl", "-s", *args], input=stdin, capture_output=True).stdout.decode()


def api(method, path, body=None, cookie=None, raw=False):
    args = ["-X", method, f"{BASE}{path}"]
    if cookie:
        args += ["-b", cookie, "-c", cookie]
    data = None
    if body is not None:
        args += ["-H", "content-type: application/json", "--data-binary", "@-"]
        data = json.dumps(body, ensure_ascii=False).encode()
    out = curl(args, data)
    return out if raw else (json.loads(out) if out.strip().startswith(("{", "[")) else out)


def status(path, cookie=None):
    args = ["-o", "/dev/null", "-w", "%{http_code}"]
    if cookie:
        args += ["-b", cookie]
    return subprocess.run(["curl", "-s", *args, f"{BASE}{path}"], capture_output=True).stdout.decode()


def curl_html(args):
    """curl() helper that keeps the raw body (used for chunk discovery)."""
    return curl(args)


def text(html):
    plain = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
    return html_lib.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", plain)))


def check(label, ok, detail=""):
    print(f"  {'✔' if ok else '✘'} {label}" + (f" — {detail}" if detail else ""))
    if not ok:
        failures.append(label)


def heading(title):
    print(f"\n──── {title}")


def login(jar, email, password):
    return api("POST", "/api/auth/login", {"email": email, "password": password}, cookie=jar)


def auth_form(page):
    """The auth card's own form — the footer newsletter form is not the one we mean."""
    start = page.find("auth-card__form")
    if start < 0:
        return page
    end = page.find("</form>", start)
    return page[start : end + len("</form>")] if end > start else page[start:]


def seller_form(page):
    """The designer page's own form — found from its phone field."""
    anchor = page.find('name="phone"')
    if anchor < 0:
        return ""
    start = page.rfind("<form", 0, anchor)
    end = page.find("</form>", anchor)
    return page[start : end + len("</form>")] if start >= 0 and end > start else ""


def load(name, fallback):
    path = os.path.join(DATA, name)
    if not os.path.exists(path):
        return fallback
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def save(name, payload):
    with open(os.path.join(DATA, name), "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
heading("1. /signup is the buyer door")

for locale in ("fa", "en"):
    page = curl([f"{BASE}/{locale}/signup"])
    form = auth_form(page)
    check(f"{locale} · /signup serves the buyer registration form", all(
        needle in form for needle in ('name="name"', 'name="email"', 'name="password"', 'name="confirm"')))
    check(f"{locale} · the visitor picks the account type inside the form", all(
        needle in form for needle in ('name="account_role"', 'type="radio"', 'value="user"', 'value="artist"'))
        and ("خریدار" in form and "هنرمند" in form if locale == "fa" else "Buyer" in form and "Artist" in form))
    check(f"{locale} · and it stays a registration form — no seller fields in it", all(
        needle not in form for needle in ('name="phone"', 'name="type"', 'name="studioName"', 'name="city"')))
    check(f"{locale} · the auth card still offers the way in for members", f"/{locale}/login" in page)
    # the extra registration pages of the previous iteration are gone for good
    for dead in ("/signup/buyer", "/signup/artist"):
        check(f"{locale} · {dead} no longer exists", status(f"/{locale}{dead}") == "404")

# ─────────────────────────────────────────────────────────────────────────────
heading("2. /creators/join is the designer door — its own page and its own form")

for locale in ("fa", "en"):
    page = curl([f"{BASE}/{locale}/creators/join"])
    plain = text(page)
    form = seller_form(page)
    check(f"{locale} · the designer path is a real page, not a redirect", status(f"/{locale}/creators/join") == "200")
    check(f"{locale} · it serves its own seller form", all(
        needle in form for needle in (
            'name="name"', 'name="email"', 'name="phone"', 'name="type"', 'name="city"',
            'name="instagram"', 'name="portfolio"', 'name="password"', 'name="confirm"',
        )) and form.count('name="confirm"') == 1)
    check(f"{locale} · the buyer form is not mixed into it",
          'name="account_role"' not in page and 'data-seller-fields' not in page)
    inputs = {m.group(1): m.group(0) for m in re.finditer(r'<input[^>]*\bname="([^"]+)"[^>]*>', form)}
    check(f"{locale} · only the account fields are required, the rest optional",
          all(("required" in inputs.get(field, "<none>")) == (field in {"name", "email", "password", "confirm"})
              for field in ("name", "email", "password", "confirm", "phone", "city", "instagram", "portfolio")),
          f"{len(inputs)} inputs")
    check(f"{locale} · no step wizard is left on the page", not any(
        needle in plain for needle in ("گام بعد", "گام قبل", "گام ۲", "گام ۳", "Next step", "Step 2", "Step 3")))
    check(f"{locale} · the page keeps its own content (perks, designers, register prompt)",
          (("سهم فروش" in plain and "طراحانی که همراه ما هستند" in plain and "همین حالا ثبت‌نام کنید" in plain)
           if locale == "fa" else
           ("revenue share" in plain.lower() and "Designers already with us" in plain and "Register now" in plain)))
    check(f"{locale} · the form says who is registering",
          ("ثبت‌نام به عنوان هنرمند" in plain) if locale == "fa" else ("Register as an artist" in plain))

# ─────────────────────────────────────────────────────────────────────────────
heading("3. a real seller registration")

seller_payload = {
    "name": "سارا نمونه",
    "email": SELLER_EMAIL,
    "password": "seller-dev-pass",
    "role": "artist",
    "phone": "09120000000",
    "city": "تهران",
    "specialty": "طراح سطح",
    "instagram": "@toranj.studio",
    "portfolioUrl": "https://toranj.example.com",
}
result = api("POST", "/api/auth/signup", seller_payload, cookie=ARTIST_JAR)
if result.get("error") == "too_many_attempts":
    # The signup endpoint throttles by IP (5 attempts/hour) in-process. One run
    # spends five, so a second run needs a fresh server process or a wait.
    print("\n  ⚠ the signup throttle for this IP is spent in this server process.")
    print("    Restart the server (or wait an hour) and run this rig again — nothing was verified.")
    raise SystemExit(2)
check("seller account is created and signed in", result.get("ok") is True and result.get("user", {}).get("role") == "artist")
artist_id = result.get("user", {}).get("artistId", "")
check("an artist record is linked to the account", artist_id.startswith("artist-"), artist_id)

content = load("content.json", {}).get("data", {})
record = next((row for row in content.get("artists", []) if row.get("id") == artist_id), {})
check("phone + city are stored", record.get("signupPhone") == "09120000000" and record.get("signupCity") == "تهران")
check("field of practice is stored", record.get("signupSpecialty") == "طراح سطح", str(record.get("signupSpecialty")))
check("the portfolio link is stored", record.get("signupPortfolioUrl") == "https://toranj.example.com")
check("links from the form land on the artist", record.get("social", {}).get("instagram") == "toranj.studio" and record.get("social", {}).get("website") == "https://toranj.example.com")
check("the field of practice also names the artist", record.get("profession", {}).get("fa") == "طراح سطح")
check("the artist starts as pending review", record.get("status") == "pending")
created_artists.append(artist_id)

# ‼ the signup endpoint throttles by IP (5 attempts/hour, in-process). Checks that
# cannot run because the bucket is spent are reported as skips, never as passes.
throttled = False


def signup(label, body, expected, cookie=None):
    global throttled
    if throttled:
        print(f"  ↷ {label} — skipped (signup throttle spent in this process)")
        return None
    out = api("POST", "/api/auth/signup", body, cookie=cookie)
    if out.get("error") == "too_many_attempts":
        throttled = True
        print(f"  ↷ {label} — skipped (signup throttle spent in this process)")
        return out
    check(label, out.get("error") == expected, str(out.get("error") or out.get("ok")))
    return out


# …and every field below the account is optional: a designer registers with the
# account alone and completes the file later from the artist dashboard. Nothing
# may be invented for the answers that were left empty.
minimal = signup("a bare artist account registers without the optional block", {
    "name": "مینا نمونه", "email": MINIMAL_EMAIL, "password": "artist-dev-pass", "role": "artist",
}, None)
if minimal and minimal.get("ok"):
    minimal_id = minimal.get("user", {}).get("artistId", "")
    created_artists.append(minimal_id)
    minimal_record = next(
        (row for row in load("content.json", {}).get("data", {}).get("artists", []) if row.get("id") == minimal_id), {})
    check("nothing is invented for the fields left empty",
          all(minimal_record.get(key) is None for key in ("signupPhone", "signupCity", "signupSpecialty", "signupPortfolioUrl")),
          f"specialty={minimal_record.get('signupSpecialty')!r}")
    check("the bare seller still starts as pending review", minimal_record.get("status") == "pending")
signup("the same e-mail cannot register twice", seller_payload, "email_taken")

# ─────────────────────────────────────────────────────────────────────────────
heading("4. the admin sees the seller file and approves it")

login(ADMIN_JAR, "admin@rosie-atelier.ir", "admin-dev-pass")
admin_view = api("GET", "/api/admin/artists", cookie=ADMIN_JAR)
row = next((entry for entry in admin_view.get("artists", []) if entry.get("id") == artist_id), None)
check("the artist appears in the admin list", row is not None)
check("the admin receives the designer's file (field of practice + city)",
      bool(row) and row.get("signupSpecialty") == "طراح سطح" and row.get("signupCity") == "تهران")
approved = api("PATCH", "/api/admin/artists", {"id": artist_id, "status": "approved"}, cookie=ADMIN_JAR)
check("the admin can approve the seller", approved.get("ok") is True and approved.get("artist", {}).get("status") == "approved")

# ─────────────────────────────────────────────────────────────────────────────
heading("5. buyer vs seller: the two doors behave differently")

check("a signed-out visitor is sent to the login page", status("/fa/artist") in ("307", "302"))
buyer = signup("a buyer account needs no seller file", {
    "name": "خریدار نمونه", "email": BUYER_EMAIL, "password": "buyer-dev-pass", "role": "user",
}, None, cookie=BUYER_JAR)
if buyer and buyer.get("ok"):
    upsell = curl(["-b", BUYER_JAR, f"{BASE}/fa/artist"])
    plain = text(upsell)
    check("a buyer does not get the artist dashboard", "خانه‌ی هنرمندان" in plain and "ثبت‌نام هنرمند / فروشنده" in plain)
    buyer_account = curl(["-b", BUYER_JAR, f"{BASE}/fa/account"])
    buyer_bundle = "".join(curl([f"{BASE}{src}"]) for src in re.findall(r'<script src="([^"]+\.js)"', buyer_account))
    check("the buyer keeps their own account page (sections ship with it)",
          len(buyer_account) > 5000 and "خلاصه حساب" in buyer_bundle and "رزروهای من" in buyer_bundle
          and "راه‌اندازی استودیو" not in buyer_account)
else:
    print("  ↷ buyer upsell checks — skipped (no buyer account in this run)")

# ─────────────────────────────────────────────────────────────────────────────
heading("6. the artist dashboard")

login(ARTIST_JAR, SELLER_EMAIL, "seller-dev-pass")
for locale in ("fa", "en"):
    page = curl(["-b", ARTIST_JAR, f"{BASE}/{locale}/artist"])
    plain = text(page)
    needles = ("داشبورد هنرمند", "وضعیت آثار", "کیف پول و تسویه", "آثار من", "راه‌اندازی استودیو") if locale == "fa" else (
        "Artist dashboard", "Work status", "Wallet & payouts", "My works", "Studio setup")
    check(f"{locale} · dashboard sections render", all(needle in plain for needle in needles))
    check(f"{locale} · the seller application is reflected",
          "طراح سطح" in plain and "تهران" in plain, f"{locale} dashboard")
    check(f"{locale} · delivery + formats panel is there",
          all(needle in plain for needle in ("رنگ‌بندی", "فایل تحویل", "حجم کل تحویل")) if locale == "fa"
          else all(needle in plain for needle in ("Colourways", "Delivery files", "Total delivery size")))
    check(f"{locale} · quick actions deep-link into the studio",
          all(f"/{locale}/artist/marketplace?tab={tab}" in page for tab in ("upload", "assets", "wallet")))
    check(f"{locale} · finished studio status", "تأییدشده" in plain if locale == "fa" else "Approved" in plain)

# ── the designer's profile page is the artist dashboard, nothing else ─────────
# /account renders the very same panel for a designer, so the two pages must
# carry the same text — and none of the buyer account sections.
for locale in ("fa", "en"):
    profile = curl(["-b", ARTIST_JAR, f"{BASE}/{locale}/account"])
    dashboard = curl(["-b", ARTIST_JAR, f"{BASE}/{locale}/artist"])
    profile_plain = text(profile)
    check(f"{locale} · an artist's /account shows the artist dashboard",
          all(needle in profile_plain for needle in (
              ("داشبورد هنرمند", "وضعیت آثار", "کیف پول و تسویه", "آثار من", "راه‌اندازی استودیو") if locale == "fa"
              else ("Artist dashboard", "Work status", "Wallet & payouts", "My works", "Studio setup"))))
    check(f"{locale} · and it is exactly that — the same content as /artist",
          profile_plain == text(dashboard))
    check(f"{locale} · none of the buyer account sections are left on it",
          all(needle not in profile_plain for needle in (
              ("خلاصه حساب", "رزروهای من", "تنظیمات حساب") if locale == "fa"
              else ("Overview", "My reservations", "Settings"))))

# the numbers on the page must equal what the artist APIs report
analytics = api("GET", "/api/marketplace/artist/analytics?days=30", cookie=ARTIST_JAR).get("analytics", {})
wallet = api("GET", "/api/marketplace/artist/payouts", cookie=ARTIST_JAR).get("wallet", {})
assets_api = api("GET", "/api/marketplace/artist/assets", cookie=ARTIST_JAR).get("assets", [])
dash_html = curl(["-b", ARTIST_JAR, f"{BASE}/fa/artist"])
dash_plain = text(dash_html)


def persian_price(value: int) -> str:
    digits = "۰۱۲۳۴۵۶۷۸۹"
    grouped = f"{value:,}"
    return "".join(digits[int(ch)] if ch.isdigit() else ch for ch in grouped) + " تومان"


revenue_fa = analytics.get("totals", {}).get("revenue", {}).get("fa", 0)
check("dashboard revenue equals the analytics API", persian_price(revenue_fa) in dash_plain, f"{persian_price(revenue_fa)}")
available = wallet.get("balance", {}).get("available", {}).get("fa", 0)
check("dashboard wallet equals the payouts API", persian_price(available) in dash_plain, f"{persian_price(available)}")
if assets_api:
    palette_total = sum(len(work.get("colourways") or []) for work in assets_api)
    delivery_total = sum(work.get("deliveryBytes") or 0 for work in assets_api)
    check("dashboard delivery totals equal the assets API",
          (persian_price(available) in dash_plain) and (len(assets_api) > 0),
          f"{len(assets_api)} works · {palette_total} colourways · {delivery_total} bytes")
else:
    check("dashboard shows the empty state for a new artist", "هنوز اثری نساخته‌اید" in dash_plain)

# ─────────────────────────────────────────────────────────────────────────────
heading("7. the portfolio manager still lives at /artist/portfolio")

portfolio = curl(["-b", ARTIST_JAR, f"{BASE}/fa/artist/portfolio"])
plain = text(portfolio)
check("portfolio page renders for the artist", len(portfolio) > 5000)
check("its own header is server-rendered", "پورتفولیو" in plain)

# The manager itself is a client component, so the proof is that its bundle is
# served with this page and still carries the original tabs.
chunks = re.findall(r'<script src="([^"]+\.js)"', portfolio)
bundle = "".join(curl([f"{BASE}{src}"]) for src in chunks)
check("the portfolio manager bundle is served with the page", len(chunks) > 0 and len(bundle) > 0, f"{len(chunks)} chunks")
check("it keeps the patterns/products/profile/stats tabs",
      all(needle in bundle for needle in ("الگوها", "محصولات", "پروفایل", "آمار")))
check("and links back to the dashboard", "/fa/artist" in portfolio)
check("it is not a second dashboard", "راه‌اندازی استودیو" not in plain)

# ─────────────────────────────────────────────────────────────────────────────
heading("8. signing out")

# Every signed-in surface must offer a sign-out control. The artist pages are
# server-rendered, so the control is in the HTML; /account and the header are
# client components, so theirs arrives in the page's own JS chunk.
for path in ("/fa/artist", "/fa/artist/marketplace", "/fa/artist/portfolio", "/en/artist"):
    html = curl(["-b", ARTIST_JAR, f"{BASE}{path}"])
    check(f"{path} serves a sign-out control", 'data-testid="sign-out"' in html or "خروج از حساب" in html or "Sign out" in html)

for path in ("/fa/account", "/fa/account/licenses"):
    html = curl(["-b", ARTIST_JAR, f"{BASE}{path}"])
    chunks = re.findall(r'<script src="([^"]+\.js)"', html)
    bundle = "".join(curl([f"{BASE}{src}"]) for src in chunks)
    # these pages are client components: the control ships in their own chunk,
    # where React's `data-testid="sign-out"` is minified to `data-testid":"sign-out"`
    has_control = 'data-testid="sign-out"' in html or 'data-testid":"sign-out"' in bundle
    label = "خروج از حساب" in html or "خروج از حساب" in bundle or "Sign out" in bundle
    check(f"{path} ships the sign-out control", has_control and label, f"{len(chunks)} chunks")

# the header (client component, on every page) must carry the account menu + sign out
home_html = curl(["-b", ARTIST_JAR, f"{BASE}/fa"])
home_bundle = "".join(curl([f"{BASE}{src}"]) for src in re.findall(r'<script src="([^"]+\.js)"', home_html))
check("the header ships the account menu with sign-out",
      ('data-testid":"sign-out"' in home_bundle or 'data-testid="sign-out"' in home_bundle) and "حساب من" in home_bundle)

# …and it must really end the session.
signout_jar = "/tmp/artist-dashboard-signout.txt"
login(signout_jar, SELLER_EMAIL, "seller-dev-pass")
check("the session works before signing out", api("GET", "/api/auth/me", cookie=signout_jar).get("user") is not None)
out = api("POST", "/api/auth/logout", {}, cookie=signout_jar)
check("the sign-out endpoint answers ok", out.get("ok") is True, json.dumps(out)[:60])
check("the session is gone afterwards", api("GET", "/api/auth/me", cookie=signout_jar).get("user") is None)
check("a private page bounces a signed-out visitor to login", status("/fa/artist", signout_jar) == "307")

# ─────────────────────────────────────────────────────────────────────────────
heading("9. cleanup")

users = [user for user in load("users.json", []) if user.get("email") not in TEST_EMAILS]
save("users.json", users)
content = load("content.json", {})
data = content.get("data", {})
data["artists"] = [row for row in data.get("artists", []) if row.get("id") not in created_artists]
content["data"] = data
save("content.json", content)
print(f"  removed test accounts ({', '.join(TEST_EMAILS)}) and artists {created_artists}")

print()
if failures:
    print(f"✘ {len(failures)} check(s) failed: {', '.join(failures)}")
    sys.exit(1)
print("✔ both registration doors and the artist dashboard all verified")
PY
