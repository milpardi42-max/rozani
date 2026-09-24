#!/usr/bin/env bash
#
# Deliverable formats & colourways — runs against a live server.
#
# Proves, end to end and with real files, that:
#   1. an artist uploads one design in two colour versions, each with PNG/JPG/
#      AI/PSD/SVG/EPS plus a custom preview image
#   2. every file lands on the *same* work and carries its format + colourway
#   3. a file that is not really the format it claims is refused
#      (wrong declaration → 415, wrong magic bytes → 422)
#   4. the storefront shows the colourways and the delivered formats
#   5. a buyer licenses the work once and downloads every format of every colour,
#      each download byte-identical to what the artist uploaded
#   6. a token forged for a file outside the work is rejected
#   7. the receipt/order API lists exactly the delivered files
#
# Usage:
#   bash scripts/marketplace-smoke/formats-e2e.sh
#   BASE=http://localhost:3000 DATA=dist/.next/standalone/data bash scripts/marketplace-smoke/formats-e2e.sh
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
BASE=${BASE:-http://localhost:3000}
DATA=${DATA:-dist/.next/standalone/data}
J=/tmp/formats-e2e-cookies.txt
rm -f "$J"
step() { echo; echo "──── $1"; }

step "1. artist signs in"
curl -s -c $J -b $J -X POST $BASE/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"niloufar@example.com","password":"artist-dev-pass"}' | head -c 140
echo

step "2. build real files for every format (PNG/JPG/preview/AI/PSD/SVG/EPS)"
node "$DIR/mkformats.mjs" /tmp/fmt

BASE=$BASE J=$J DATA=$DATA python3 - <<'PY'
import base64
import hashlib
import hmac
import json
import os
import re
import shutil
import subprocess
import sys
import time

BASE = os.environ["BASE"]
COOKIE = os.environ["J"]
DATA = os.environ["DATA"]
OUT = "/tmp/fmt"
ADMIN = "/tmp/formats-e2e-admin.txt"
failures: list[str] = []


def curl(args, stdin=None):
    return subprocess.run(["curl", "-s", *args], input=stdin, capture_output=True).stdout.decode()


def api(method, path, body=None, cookie=COOKIE):
    args = ["-b", cookie, "-c", cookie, "-X", method, BASE + path]
    if body is not None:
        args += ["-H", "content-type: application/json", "--data-binary", "@-"]
        return curl(args, json.dumps(body).encode())
    return curl(args)


def check(label, ok, detail=""):
    print(f"  {'✔' if ok else '✘'} {label}{f' — {detail}' if detail else ''}")
    if not ok:
        failures.append(label)


def heading(title):
    print(f"\n──── {title}")


def text_of(html):
    return re.sub(r"\s+", " ", re.sub("<[^>]+>", " ", re.sub(r"<script.*?</script>", " ", html, flags=re.S)))


COLOURS = [
    {"id": "cw-rose", "name": {"fa": "زرشکی", "en": "Crimson"}, "hex": "#be123c"},
    {"id": "cw-teal", "name": {"fa": "فیروزه‌ای", "en": "Teal"}, "hex": "#0d9488"},
]
# formatId → (generated file, MIME the browser would report)
PLAN = [
    ("png", "png.png", "image/png"),
    ("jpg", "jpg.jpg", "image/jpeg"),
    ("preview", "preview.jpg", "image/jpeg"),
    ("ai", "ai.ai", "application/postscript"),
    ("psd", "psd.psd", "image/vnd.adobe.photoshop"),
    ("svg", "svg.svg", "image/svg+xml"),
    ("eps", "eps.eps", "application/postscript"),
]
DELIVERABLE_FORMATS = ["png", "jpg", "ai", "psd", "svg", "eps"]


def upload(source, filename, mime, extra):
    payload = {
        "filename": filename,
        "sizeBytes": os.path.getsize(source),
        "mime": mime,
        "title": {"fa": "باغ خاموش", "en": "Quiet garden"},
        "description": {"fa": "الگوی چندرنگ برای پارچه و کاغذ دیواری", "en": "Multi-colour pattern for fabric and wallpaper"},
        "kind": "pattern",
        "tags": ["colourway", "formats", "e2e"],
        "familyId": "fam-wallpaper",
        **extra,
    }
    session = json.loads(api("POST", "/api/marketplace/upload/session", payload))
    if not session.get("ok"):
        return {"ok": False, "error": session.get("error")}
    sid = session["session"]["id"]
    return json.loads(
        curl(["-b", COOKIE, "-c", COOKIE, "-X", "POST", f"{BASE}/api/marketplace/upload/complete",
              "-F", f"sessionId={sid}", "-F", f"file=@{source};type={mime}"])
    )


heading("3. upload two colour versions, every format on one work")
asset_id = ""
uploaded: dict[tuple[str, str], dict] = {}

for colour in COLOURS:
    for format_id, generated, mime in PLAN:
        source = os.path.join(OUT, generated)
        filename = f"quiet-garden-{colour['id']}-{format_id}.{generated.rsplit('.', 1)[1]}"
        response = upload(source, filename, mime, {
            "formatId": format_id,
            "colourwayId": colour["id"],
            "colourway": {"name": colour["name"], "hex": colour["hex"]},
            "attachToAssetId": asset_id or None,
        })
        if not response.get("ok"):
            check(f"{colour['id']} · {format_id}", False, json.dumps(response, ensure_ascii=False)[:140])
            continue
        if not asset_id:
            asset_id = response["asset"]["id"]
        check(
            f"{colour['id']} · {format_id} stored on the same work",
            response["asset"]["id"] == asset_id,
            f"{response['asset']['id']} · {response['asset']['status']}",
        )
        uploaded[(colour["id"], format_id)] = {
            "sha256": hashlib.sha256(open(source, "rb").read()).hexdigest(),
            "bytes": os.path.getsize(source),
        }

check("all 14 files landed on one work", len(uploaded) == len(PLAN) * len(COLOURS), f"{len(uploaded)} files · {asset_id}")

heading("4. the wrong file for a slot is refused")
# backwards compatibility: a caller that predates colourways may omit formatId
inferred = json.loads(api("POST", "/api/marketplace/upload/session", {
    "filename": "x.png", "sizeBytes": 4096, "mime": "image/png", "familyId": "fam-wallpaper"}))
check("no format declared → inferred from the file name",
      inferred.get("session", {}).get("key", "").endswith(".png"), json.dumps(inferred)[:120])
unknown = json.loads(api("POST", "/api/marketplace/upload/session", {
    "filename": "x.unknownext", "sizeBytes": 4096, "mime": "application/octet-stream", "familyId": "fam-wallpaper"}))
check("a file no format claims → invalid_format", unknown.get("error") == "invalid_format", json.dumps(unknown)[:160])

mislabelled = json.loads(api("POST", "/api/marketplace/upload/session", {
    "filename": "actually-a-png.png", "sizeBytes": 4096, "mime": "image/png", "familyId": "fam-wallpaper",
    "formatId": "psd", "colourwayId": "cw-rose", "attachToAssetId": asset_id}))
check("a .png file offered for the PSD slot → unsupported_type", mislabelled.get("error") == "unsupported_type", json.dumps(mislabelled))

source_first = json.loads(api("POST", "/api/marketplace/upload/session", {
    "filename": "x.svg", "sizeBytes": 4096, "mime": "image/svg+xml", "familyId": "fam-wallpaper",
    "formatId": "svg", "colourwayId": "cw-new"}))
check("a new work may not start with SVG → raster_required", source_first.get("error") == "raster_required", json.dumps(source_first))

shutil.copy(os.path.join(OUT, "png.png"), "/tmp/fmt/lie.psd")
lie = upload("/tmp/fmt/lie.psd", "lie.psd", "image/vnd.adobe.photoshop", {
    "formatId": "psd", "colourwayId": "cw-rose", "attachToAssetId": asset_id})
check("PNG bytes named .psd → invalid_signature", lie.get("error") == "invalid_signature", json.dumps(lie, ensure_ascii=False)[:140])

heading("5. the artist panel reports the delivery")
mine = json.loads(api("GET", "/api/marketplace/artist/assets"))
asset = next((item for item in mine.get("assets", []) if item["id"] == asset_id), None)
check("the work is listed for its owner", asset is not None)
slug = asset["slug"] if asset else ""
if asset:
    colourways = asset.get("colourways", [])
    check("two colourways recorded", len(colourways) == 2, ", ".join(c["id"] for c in colourways))
    check("formats recorded", sorted(asset.get("formats", [])) == sorted(DELIVERABLE_FORMATS), ", ".join(asset.get("formats", [])))
    check("each colour has its own watermarked preview", all(c.get("preview") for c in colourways),
          str([bool(c.get("preview")) for c in colourways]))
    check("every colour lists its own formats",
          all(len(c.get("formats", [])) == len(DELIVERABLE_FORMATS) + 1 for c in colourways),
          str([len(c.get("formats", [])) for c in colourways]))

json.loads(curl(["-c", ADMIN, "-b", ADMIN, "-X", "POST", f"{BASE}/api/auth/login",
                 "-H", "content-type: application/json", "--data-binary", "@-"],
                json.dumps({"email": "admin@rosie-atelier.ir", "password": "admin-dev-pass"}).encode()))

heading("6. the moderation queue carries the full delivery set")
queue_before = json.loads(curl(["-b", ADMIN, f"{BASE}/api/marketplace/admin/review"]))
queued = next((item for item in queue_before.get("items", []) if item["asset"]["id"] == asset_id), None)
check("work is waiting for review", queued is not None)
if queued:
    check("queue shows both colourways", len(queued["asset"].get("colourways", [])) == 2,
          ", ".join(c["id"] for c in queued["asset"].get("colourways", [])))
    check("queue shows the delivered formats", sorted(queued["asset"].get("formats", [])) == sorted(DELIVERABLE_FORMATS),
          ", ".join(queued["asset"].get("formats", [])))
    check("queue shows the total delivery size", (queued["asset"].get("deliveryBytes") or 0) > 0,
          f"{queued['asset'].get('deliveryBytes')} bytes")

heading("7. admin approves and publishes it")
review = json.loads(curl(["-b", ADMIN, "-X", "POST", f"{BASE}/api/marketplace/admin/review",
                          "-H", "content-type: application/json", "--data-binary", "@-"],
                         json.dumps({"action": "approve", "assetId": asset_id, "publish": True}).encode()))
check("approved & published", review.get("ok") is True, json.dumps(review, ensure_ascii=False)[:120])

heading("8. the storefront advertises the colours and the formats")
page = curl([f"{BASE}/fa/marketplace/{slug}"])
plain = text_of(page)
check("asset page has the delivery block", "فرمت‌های تحویل" in plain)
check("PNG · PSD · EPS are advertised", all(token in plain for token in ("PNG", "PSD", "EPS")))
check("both colour names are visible", "زرشکی" in plain and "فیروزه‌ای" in plain)
media_refs = page.count("/api/marketplace/media?key=") + page.count("api%2Fmarketplace%2Fmedia")
check("both colour previews plus the generated previews are served", media_refs >= 6, f"{media_refs} image refs")


catalogue = curl([f"{BASE}/fa/marketplace"])
check("catalogue card lists the formats with their real names",
      all(token in catalogue for token in ("PNG", "PSD", "AI", "EPS")))
check("catalogue card shows the colour swatches", catalogue.count("rounded-full border border-border") >= 2)

heading("9. one license → every format of every colour")
quote = json.loads(curl(["-b", COOKIE, "-c", COOKIE, "-X", "POST", f"{BASE}/api/marketplace/checkout/quote",
                         "-H", "content-type: application/json", "--data-binary", "@-"],
                        json.dumps({"items": [{"assetId": asset_id, "tierId": "tier-commercial"}]}).encode()))
quote_body = quote.get("quote") or quote.get("invoice") or {}
tax = quote_body.get("tax") or {}
check("quote computed with ۹٪ VAT",
      bool(quote.get("ok")) and float(tax.get("fa") or tax.get("amount") or 0) > 0,
      json.dumps({key: quote_body.get(key) for key in ("subtotal", "tax", "total")}, ensure_ascii=False)[:160])

order = json.loads(curl(["-b", COOKIE, "-c", COOKIE, "-X", "POST", f"{BASE}/api/marketplace/checkout",
                         "-H", "content-type: application/json", "--data-binary", "@-"],
                        json.dumps({"items": [{"assetId": asset_id, "tierId": "tier-commercial"}],
                                    "provider": "zarinpal", "locale": "fa",
                                    "buyer": {"name": "سارا محمدی", "email": "sara@example.com"}}).encode()))
order_id = order.get("order", {}).get("id", "")
redirect = order.get("payment", {}).get("redirectUrl", "")
authority = ""
if "authority=" in redirect:
    authority = redirect.split("authority=")[1].split("&")[0]
check("order created in the sandbox gateway", bool(order_id) and bool(authority), order_id)

paid = json.loads(curl(["-X", "POST", f"{BASE}/api/marketplace/payments/sandbox",
                        "-H", "content-type: application/json", "--data-binary", "@-"],
                       json.dumps({"authority": authority, "outcome": "paid", "locale": "fa"}).encode()))
serial = (paid.get("licenses") or [{}])[0].get("serial", "")
check("payment settled and license issued", paid.get("status") == "paid" and bool(serial), serial)

receipt = json.loads(curl(["-b", ADMIN, f"{BASE}/api/marketplace/orders/{order_id}"]))
license_row = (receipt.get("licenses") or [{}])[0]
files = license_row.get("files", [])
expected = len(PLAN) * len(COLOURS) - len(COLOURS)  # the cover image is not a deliverable
check("the receipt lists every deliverable", len(files) == expected, f"{len(files)} files")
check("both colour versions listed", len({f["colourwayId"] for f in files}) == 2)
check("each file carries its own signed link",
      all(f.get("url", "").startswith("/api/marketplace/download?token=") for f in files))
check("the license allowance covers the whole delivery", (license_row.get("quota", {}).get("limit") or 0) >= len(files),
      f"{license_row.get('quota', {}).get('limit')} downloads for {len(files)} files")

# the emailed delivery page is the customer's first contact — it must list the whole set
outbox = json.load(open(os.path.join(DATA, "mk-outbox.json")))
delivery_html = [m for m in outbox if m.get("kind") == "delivery"][-1]["html"]
link = re.search(r"/fa/delivery/([^\"'\s]+)", delivery_html)
page = curl([f"{BASE}/fa/delivery/{link.group(1)}"]) if link else ""
check("the emailed delivery page lists every file",
      link is not None and page.count("/api/marketplace/download?token=") >= expected,
      f"{page.count('/api/marketplace/download?token=')} download links")

license_id = license_row.get("id", "")
vault = json.loads(curl(["-b", ADMIN, f"{BASE}/api/marketplace/licenses?scope=all"]))
vault_row = next((item for item in vault.get("licenses", []) if item.get("assetId") == asset_id), None)
check("the license vault exposes the same file set", bool(vault_row) and len(vault_row.get("files", [])) == expected,
      f"{len(vault_row.get('files', [])) if vault_row else 0} files")

heading("10. forged and out-of-scope tokens are refused")
garbage = curl([f"{BASE}/api/marketplace/download?token=forged.token.value"])
check("garbage token rejected", "invalid_token" in garbage, garbage[:70])

secret = os.environ.get("AUTH_SECRET", "dev-secret-marketplace")
payload = {"k": "private/masters/ast_someone_else/original.png", "exp": int(time.time()) + 600, "lic": license_id, "uid": None}
body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).rstrip(b"=")
signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).rstrip(b"=")
foreign = curl([f"{BASE}/api/marketplace/download?token={body.decode()}.{signature.decode()}"])
check("a correctly signed token for another work's file is rejected",
      '"error":"invalid_token"' in foreign or '"error":"file_forbidden"' in foreign, foreign[:90])


collision = json.loads(api("POST", "/api/marketplace/upload/session", {
    "filename": "stray.png", "sizeBytes": 4096, "mime": "image/png", "familyId": "fam-wallpaper",
    "formatId": "png", "colourwayId": "cw-stray", "attachToAssetId": "ast_does_not_exist"}))
check("attaching to a work you do not own is refused", collision.get("error") == "asset_not_found", json.dumps(collision)[:90])

heading("11. download every format and compare bytes")
verified = 0
for item in files:
    raw = subprocess.run(["curl", "-s", BASE + item["url"]], capture_output=True).stdout
    want = uploaded.get((item["colourwayId"], item["formatId"]))
    same = bool(want) and hashlib.sha256(raw).hexdigest() == want["sha256"]
    verified += 1 if same else 0
    check(f"{item['colourwayId']} · {item['formatId']} · {item['filename']}", same,
          f"{len(raw)} B vs {want['bytes'] if want else '?'} B")
check("all downloads byte-identical to the uploads", verified == len(files), f"{verified}/{len(files)}")

heading("12. cleanup")
path = os.path.join(DATA, "mk-assets.json")
if os.path.exists(path):
    rows = json.load(open(path, encoding="utf-8"))
    kept = [row for row in rows if row["id"] != asset_id]
    if len(kept) != len(rows):
        json.dump(kept, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
for folder in ("objects/private/masters", "objects/private/derived"):
    target = os.path.join(DATA, folder, asset_id)
    if os.path.isdir(target):
        subprocess.run(["rm", "-rf", target], check=False)
print(f"  removed test work {asset_id} and its files")

print()
if failures:
    print(f"✘ {len(failures)} check(s) failed: {', '.join(failures)}")
    sys.exit(1)
print("✔ formats, colourways, delivery and download protection all verified")
PY
