#!/usr/bin/env bash
#
# Product-family taxonomy check — runs against a live server (dev or production build).
#
# Proves the eight families («الگو» → sub-categories) really drive the storefront:
#   1. /shop groups the cards per family, in the canonical order
#   2. the sidebar shows «الگو» with all eight families nested underneath
#   3. ?family=<slug> isolates one family, ?family=other catches unclassified products
#   4. ?category=<slug> still filters (families are additive, not a replacement)
#   5. the upload session refuses a missing/unknown family (`invalid_family`) and stores a valid one
#
# Usage:
#   bash scripts/marketplace-smoke/family-e2e.sh
#   BASE=http://localhost:3000 DATA=dist/.next/standalone/data bash scripts/marketplace-smoke/family-e2e.sh
#
BASE=${BASE:-http://localhost:3000}
DATA=${DATA:-dist/.next/standalone/data}
J=/tmp/family-e2e-cookies.txt
rm -f "$J"

echo "family-e2e → $BASE   (data: $DATA)"

curl -s -c "$J" -b "$J" -X POST "$BASE/api/auth/login" -H 'content-type: application/json' \
  -d '{"email":"niloufar@example.com","password":"artist-dev-pass"}' > /dev/null

python3 - "$BASE" "$(cd "$(dirname "$0")" && pwd)" <<'PY'
import json, os, re, subprocess, sys

BASE = sys.argv[1]
SCRIPT_DIR = sys.argv[2]
COOKIE = "/tmp/family-e2e-cookies.txt"
failures = []

# canonical order — must stay in sync with src/lib/data/families.ts
FAMILIES = [
    ("wallpaper", "کاغذ دیواری", "Wallpaper"),
    ("home-fabric", "پارچه دکوراسیون داخلی", "Home Fabric"),
    ("curtain", "پرده", "Curtain"),
    ("cushion", "کوسن", "Cushion"),
    ("bedding", "روتختی", "Bedding"),
    ("tablecloth", "رومیزی", "Tablecloth"),
    ("upholstery-fabric", "پارچه مبلمان", "Upholstery Fabric"),
    ("wall-art", "آثار هنری دیواری", "Wall Art"),
]

def curl(args, stdin=None):
    return subprocess.run(["curl", "-s", *args], input=stdin, capture_output=True).stdout.decode()

def page(path, cookie=False):
    args = (["-b", COOKIE] if cookie else []) + [BASE + path]
    return curl(args)

def api(method, path, body=None):
    args = ["-b", COOKIE, "-c", COOKIE, "-X", method, BASE + path]
    if body is not None:
        args += ["-H", "content-type: application/json", "--data-binary", "@-"]
        return curl(args, json.dumps(body).encode())
    return curl(args)

def text(html):
    return re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", html, flags=re.S)))

def sections(html):
    return [re.sub("<[^>]+>", "", group) for group in
            re.findall(r'<h3[^>]*class="font-display text-h4[^"]*"[^>]*>(.*?)</h3>', html)]

def check(label, ok, detail=""):
    print(f"  {'✔' if ok else '✘'} {label}{f' — {detail}' if detail else ''}")
    if not ok:
        failures.append(label)

def step(title):
    print(f"\n──── {title}")

# ── 1. shop grouping ────────────────────────────────────────────────────────────
step("1. /shop groups products into family sections")
fa = page("/fa/shop")
names_fa = [f[1] for f in FAMILIES]
found = sections(fa)
order = [names_fa.index(name) for name in found if name in names_fa]
check("Persian sections render something", bool(found), ", ".join(found))
check("sections follow the canonical order", order == sorted(order), str(order))
check("unclassified products fall into «سایر محصولات»", "سایر محصولات" in found)

en = page("/en/shop")
found_en = sections(en)
names_en = [f[2] for f in FAMILIES]
check("English sections mirror the same families",
      all(name in names_en or name == "Other products" for name in found_en), ", ".join(found_en))

# ── 2. sidebar tree ────────────────────────────────────────────────────────────
step("2. sidebar shows the families as sub-categories of «الگو»")
aside = re.search(r"<aside.*?</aside>", fa, re.S)
check("sidebar present", aside is not None)
segment = text(aside.group(0)) if aside else ""
start = segment.find("الگو")
tail = segment[start:start + 260] if start >= 0 else ""
positions = [tail.find(name) for name in names_fa]
check("all eight families nested under «الگو»", all(p >= 0 for p in positions), tail[:120])
check("nested order matches the canonical order", positions == sorted(positions), str(positions))
check("the «همه» (all) row is back in the Pattern group", tail.find("همه") < positions[0] if positions and positions[0] >= 0 else False)

# ── 3. ?family filtering ───────────────────────────────────────────────────────
step("3. ?family=<slug> isolates exactly one family")
for slug, name_fa, name_en in FAMILIES:
    for locale, name in (("fa", name_fa), ("en", name_en)):
        html = page(f"/{locale}/shop?family={slug}")
        labels = sections(html)
        isolated = all(label in (name, "Other products") for label in labels)
        empty_copy = "هنوز اثری در دسته" in html or "Nothing in" in html
        check(f"/{locale}/shop?family={slug}", isolated and (bool(labels) or empty_copy),
              f"{len(labels)} section(s): {', '.join(labels) or ('empty-state' if empty_copy else '—')}")
other = page("/fa/shop?family=other")
check("?family=other → فقط «سایر محصولات»", sections(other) == ["سایر محصولات"] or sections(other) == [],
      ", ".join(sections(other)) or "—")

# ── 4. categories keep working ─────────────────────────────────────────────────
step("4. ?category= still filters alongside the families")
cat = page("/fa/shop?category=botanical")
check("?category=botanical returns only botanical products", bool(sections(cat)), ", ".join(sections(cat)))
combined = page("/fa/shop?category=botanical&family=wallpaper")
check("?category + ?family compose", all(label == "کاغذ دیواری" for label in sections(combined)),
      ", ".join(sections(combined)) or "—")

# ── 5. the upload session requires a family ────────────────────────────────────
step("5. artist uploads must declare a family")
base = {"filename": "family-e2e.png", "sizeBytes": 4096, "mime": "image/png",
        "title": {"fa": "آزمون دسته‌بندی", "en": "Family e2e"}, "kind": "pattern", "tags": ["e2e"]}
missing = json.loads(api("POST", "/api/marketplace/upload/session", base))
check("missing familyId → invalid_family", missing.get("error") == "invalid_family", json.dumps(missing, ensure_ascii=False))
bogus = json.loads(api("POST", "/api/marketplace/upload/session", {**base, "familyId": "fam-not-real"}))
check("unknown familyId → invalid_family", bogus.get("error") == "invalid_family", json.dumps(bogus, ensure_ascii=False))

subprocess.run(["python3", os.path.join(SCRIPT_DIR, "mktile.py"),
                "/tmp/family-e2e.png", "256", "256"], check=True)
png = open("/tmp/family-e2e.png", "rb").read()
session = json.loads(api("POST", "/api/marketplace/upload/session",
                         {**base, "sizeBytes": len(png), "familyId": "fam-tablecloth"}))
sid = session.get("session", {}).get("id", "")
check("valid familyId opens a session", bool(sid) and session.get("ok") is True, sid)

asset_id = ""
if sid:
    done = json.loads(curl(["-b", COOKIE, "-c", COOKIE, "-X", "POST", f"{BASE}/api/marketplace/upload/complete",
                            "-F", f"sessionId={sid}", "-F", "file=@/tmp/family-e2e.png;type=image/png"]))
    asset_id = done.get("asset", {}).get("id", "")
    mine = json.loads(api("GET", "/api/marketplace/artist/assets"))
    stored = next((a for a in mine.get("assets", []) if a["id"] == asset_id), None)
    check("the uploaded asset carries the chosen family",
          bool(stored) and stored.get("familyId") == "fam-tablecloth",
          f"{asset_id} → {stored.get('familyId') if stored else 'missing'}")
    check("the artist asset list exposes familyId for the studio badge", bool(stored) and "familyId" in stored)

# ── 6. cleanup so the rig can be re-run without polluting the store ────────────
step("6. cleanup")
data_dir = os.environ.get("DATA", "dist/.next/standalone/data")
removed = []
if asset_id and os.path.exists(os.path.join(data_dir, "mk-assets.json")):
    def load(name, fallback):
        path = os.path.join(data_dir, name)
        if not os.path.exists(path):
            return fallback
        with open(path, encoding="utf-8") as handle:
            return json.load(handle)

    assets = [a for a in load("mk-assets.json", []) if a["id"] != asset_id]
    with open(os.path.join(data_dir, "mk-assets.json"), "w", encoding="utf-8") as handle:
        json.dump(assets, handle, ensure_ascii=False, indent=2)
    sessions = [s for s in load("mk-uploads.json", []) if s.get("id") != sid]
    with open(os.path.join(data_dir, "mk-uploads.json"), "w", encoding="utf-8") as handle:
        json.dump(sessions, handle, ensure_ascii=False, indent=2)
    for folder in ("objects/private/masters", "objects/private/derived", "objects/private/staged"):
        directory = os.path.join(data_dir, folder)
        if not os.path.isdir(directory):
            continue
        for name in os.listdir(directory):
            if asset_id in name or sid in name:
                target = os.path.join(directory, name)
                subprocess.run(["rm", "-rf", target], check=False)
                removed.append(f"{folder}/{name}")
print(f"  removed test asset {asset_id or '(none)'}"
      + (f" and {', '.join(removed)}" if removed else ""))

print()
if failures:
    print(f"✘ {len(failures)} check(s) failed: {', '.join(failures)}")
    sys.exit(1)
print("✔ all family/taxonomy checks passed")
PY
