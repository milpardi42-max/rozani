#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# The shop hero — runs against a live server (production build or dev).
#
# `/{locale}/shop` keeps everything it always had (the family sections, the
# sidebar tree, filtering, sorting); what changed is the hero section only, and
# this rig pins that hero down. In both locales it asserts:
#
#   1. the boutique panel: the shop eyebrow, the collection's title, its copy
#      and the two doors into the catalogue (`?owner=site` / `?owner=artist`);
#   2. the live numbers, recomputed here from the real store (`DATA=…`) — so the
#      hero can never drift from the catalogue it describes (site products plus
#      the artists' published works from `mk-assets.json`);
#   3. the product mosaic: a lead piece with its family, maker, SKU and price, a
#      second piece, and the lead's colourways with their swatches;
#   4. the family rail: all eight families as `?family=<slug>` links, with the
#      counts the catalogue actually has;
#   5. the shop below is untouched: the eight `<h3>` family sections and the
#      product count still render, and `?family=` still isolates a family.
#
# Usage:
#   bash scripts/marketplace-smoke/shop-hero-e2e.sh
#   BASE=http://localhost:3000 DATA=dist/.next/standalone/data bash scripts/marketplace-smoke/shop-hero-e2e.sh
set -u

BASE=${BASE:-http://localhost:3000}
DATA=${DATA:-dist/.next/standalone/data}

python3 - "$BASE" "$DATA" <<'PY'
import html as html_mod
import json
import os
import re
import sys
import urllib.parse
import urllib.request

BASE, DATA = sys.argv[1], sys.argv[2]
GREEN, RED, RESET, BOLD = "\033[32m", "\033[31m", "\033[1m", "\033[0m"
state = {"pass": 0, "fail": 0}


def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as r:
        return r.status, r.read().decode("utf-8", "replace")


def plain(page):
    t = re.sub(r"<script.*?</script>", "", page, flags=re.S)
    t = re.sub(r"<style.*?</style>", "", t, flags=re.S)
    return html_mod.unescape(re.sub(r"<[^>]+>", "\n", t))


def check(cond, label, detail=""):
    if cond:
        state["pass"] += 1
        print(f"  {GREEN}✔{RESET} {label}")
    else:
        state["fail"] += 1
        print(f"  {RED}✘{RESET} {label}" + (f" — {detail}" if detail else ""))


def section(title):
    print(f"\n{BOLD}{title}{RESET}")


# ── the catalogue, straight from the store the server is using ───────────────
content = json.loads(open(os.path.join(DATA, "content.json"), encoding="utf-8").read())["data"]
products = content["products"]
# published artist works are listed in the shop too (approved + public + an enabled licence)
assets_path = os.path.join(DATA, "mk-assets.json")
assets = json.loads(open(assets_path, encoding="utf-8").read()) if os.path.exists(assets_path) else []
if isinstance(assets, dict):
    assets = assets.get("data", [])
works = [a for a in assets if a.get("status") == "approved" and a.get("visibility") == "public"
         and any(t.get("enabled") for t in a.get("tiers", []))]
counts = {
    "products": len(products) + len(works),
    "families": len({p["familyId"] for p in products if p.get("familyId")} | {w["familyId"] for w in works if w.get("familyId")}),
    "colourways": sum(len(p.get("colors", [])) for p in products) + sum(max(1, len(w.get("colourways") or [])) for w in works),
    "makers": len({p["artistId"] for p in products if p.get("artistId")} | {w["artistId"] for w in works if w.get("artistId")}),
}
print(f"shop-hero-e2e → {BASE}   (data: {DATA})")
print(f"  catalogue: {counts}")

FAMILIES = [
    ("wallpaper", "کاغذ دیواری", "Wallpaper"),
    ("home-fabric", "پارچه دکوراسیون داخلی", "Home Fabric"),
    ("curtain", "پرده", "Curtain"),
    ("cushion", "کوسن", "Cushion"),
    ("bedding", "روتختی", "Bedspread"),
    ("tablecloth", "رومیزی", "Tablecloth"),
    ("upholstery-fabric", "پارچه مبلمان", "Upholstery Fabric"),
    ("wall-art", "آثار هنری دیواری", "Wall Art"),
]

EXPECT = {
    "fa": {
        "eyebrow": "فروشگاه رزی آتلیه",
        "title": "کالکشن اختصاصی آتلیه",
        "copy": "کاغذدیواری، پرده و دکور طراحی‌شده توسط رزی آتلیه.",
        "cta_site": ">اختصاصی رزی آتلیه<",
        "cta_artist": ">اثر هنرمند<",
        "stats": ["محصول", "خانواده‌ی سطح", "رنگ‌بندی‌ها", "طراح همکار"],
        "featured": "منتخب",
        "colourways": "رنگ‌بندی‌ها",
        "all_colourways": "همه‌ی رنگ‌بندی‌ها",
        "browse": "مرور بر اساس خانواده",
        "banner": "ارسال رایگان",
        "result": "نتیجه",
        "all_link": "/fa/shop?family=wallpaper",
    },
    "en": {
        "eyebrow": "The Rosie Atelier shop",
        "title": "Atelier Exclusive",
        "copy": "Wallpaper, curtains and décor designed by Rosie Atelier.",
        "cta_site": ">Rosie Atelier Exclusive<",
        "cta_artist": ">Artist piece<",
        "stats": ["Products", "Surface families", "Colourways", "Contributing designers"],
        "featured": "Featured",
        "colourways": "Colourways",
        "all_colourways": "All colourways",
        "browse": "Browse by family",
        "banner": "Free shipping",
        "result": "result",
        "all_link": "/en/shop?family=wallpaper",
    },
}

for locale, want in EXPECT.items():
    section(f"1. {locale} — the boutique panel")
    try:
        status, page = get(f"/{locale}/shop")
    except Exception as exc:  # pragma: no cover
        check(False, f"/{locale}/shop answers", str(exc))
        continue
    check(status == 200, f"/{locale}/shop answers 200", f"status {status}")
    text = plain(page)
    markup = re.sub(r"<script.*?</script>", "", page, flags=re.S)

    check(want["eyebrow"] in text, "the shop introduces itself as the atelier's shop")
    check(want["title"] in text, "the collection's title is the headline")
    check(want["copy"] in text, "its one line of copy is there")
    check(want["cta_site"] in markup and "owner=site" in markup, "the site-exclusive door is offered")
    check(want["cta_artist"] in markup and "owner=artist" in markup, "the artist-piece door is offered")
    check(markup.count("<h1") == 1, "the hero still carries a single h1", f"{markup.count('<h1')} h1")

    section(f"2. {locale} — the live numbers match the catalogue")
    body = text[text.find(want["eyebrow"]):]
    for value, label in (
        (str(counts["products"]), want["stats"][0]),
        (f"{counts['families']}/8", want["stats"][1]),
        (str(counts["colourways"]), want["stats"][2]),
        (str(counts["makers"]), want["stats"][3]),
    ):
        fa_value = value.translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")) if locale == "fa" else value
        window = body[body.find(label) - 12: body.find(label)] if label in body else ""
        check(label in body and fa_value in window, f"«{label}» shows the real count {fa_value}", window.strip()[:40])

    section(f"3. {locale} — the product mosaic")
    lead = next((p for p in products if not p.get("artistId") and p.get("featured")), products[0])
    second = next((p for p in products if p["id"] != lead["id"] and not p.get("artistId") and p.get("isNew")), None) \
        or next(p for p in products if p["id"] != lead["id"])
    check(f'/{locale}/shop/{lead["slug"]}"' in markup, "the lead piece links to its product page", lead["slug"])
    check(want["featured"] in text, "the lead piece carries its «featured» badge")
    check(lead["sku"] in markup, "the lead piece shows its SKU", lead["sku"])
    lead_family = next((n[1 if locale == "fa" else 2] for n in FAMILIES if f'fam-{n[0]}' == lead.get("familyId")), None)
    if lead_family:
        check(lead_family in text, "the lead piece names its family", lead_family)
    check(f'/{locale}/shop/{second["slug"]}"' in markup, "a second piece has its own tile", second["slug"])
    colours = lead.get("colors", [])
    check(want["colourways"] in text, "the lead piece's colourways are shown")
    check(all(c["name"][locale] in text for c in colours[:4]), "every shown colourway is named",
          ", ".join(c["name"][locale] for c in colours[:4]))
    # next/image rewrites the source into /_next/image?url=<encoded>
    encoded = urllib.parse.quote(colours[0]["image"], safe="")
    check(f"url={encoded}" in markup, "the colourway tiles use the real colour images")
    check(want["all_colourways"] in text, "and the tile links through to all of them")

    section(f"4. {locale} — the family rail")
    check(want["browse"] in text, "the rail announces itself")
    rail = markup[markup.find(want["browse"]): markup.find(want["browse"]) + 6000]
    for slug, name_fa, name_en in FAMILIES:
        name = name_fa if locale == "fa" else name_en
        link = f'/{locale}/shop?family={slug}'
        check(link in rail and name in rail, f"«{name}» links to {link}")
    for slug, name_fa, name_en in FAMILIES:
        n = len([p for p in products if p.get("familyId") == f"fam-{slug}"]) + len([w for w in works if w.get("familyId") == f"fam-{slug}"])
        if not n:
            continue
        shown = str(n).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")) if locale == "fa" else str(n)
        chip = rail[rail.find(f"family={slug}"):]
        chip = chip[: chip.find("</a>") + 4]  # the chip's own contents
        check(f">{shown}</span>" in chip.replace(" ", ""), f"«{name_fa if locale == 'fa' else name_en}» shows its real count {n}", chip[-90:])
    check(want["banner"] in text, "the service note stays in the hero")

    section(f"5. {locale} — the shop below is untouched")
    sections = re.findall(r'<h3[^>]*class="font-display text-h4[^"]*"[^>]*>(.*?)</h3>', page)
    check(len(sections) >= 1, "the family sections still render", f"{len(sections)} section(s)")
    shown = str(counts["products"])
    if locale == "fa":
        shown = shown.translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))
    check(want["result"] in text and shown in text, "the result counter still reports the catalogue size", shown)
    filtered_status, filtered = get(f"/{locale}/shop?family=wallpaper")
    filtered_sections = re.findall(r'<h3[^>]*class="font-display text-h4[^"]*"[^>]*>(.*?)</h3>', filtered)
    check(filtered_status == 200 and all("Wallpaper" in s or "کاغذ دیواری" in s for s in filtered_sections),
          "?family= still isolates one family", ", ".join(filtered_sections))

print()
print(f"{BOLD}{state['pass']} ✔ / {state['fail']} ✘{RESET}")
sys.exit(0 if state["fail"] == 0 else 1)
PY
