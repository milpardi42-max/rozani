#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Verified artist upload → immediate publication → the shop category.
# Runs against a live server (production build or dev).
#
# Pins down the fix for "the upload looked complete, but the work never showed
# up in the shop / its category":
#
#   1. integrity refusals — a bad checksum header, a file that arrives with a
#      different size or different bytes is refused (422) and nothing is kept;
#   2. a verified upload creates a PRIVATE, unfinished work (never public on its
#      own), and a repeated `complete` answers `already_completed` (no duplicate);
#   3. `/upload/finalize` refuses an incomplete batch (missing file, wrong size,
#      wrong checksum) with 409 `incomplete_upload` — the work stays private;
#   4. chunked upload: a truncated chunk (`part_size_mismatch`) and a damaged
#      chunk (`part_corrupted`) are refused; the real chunks assemble into a
#      byte-identical file attached to the work as a second colourway;
#   5. finalize publishes at once (default policy) and the work appears in
#      `/shop?family=<its family>` — not in other families, not under
#      `?owner=site` — and on its licence page;
#   6. review mode (admin setting off): finalize verifies but does not publish;
#      the admin's approval then puts it in the shop;
#   7. purging a work removes all of its files, colourway deliverables included.
#
# The admin setting is restored and the test works are purged afterwards
# (KEEP=1 keeps them).
#
# Usage:
#   ADMIN_EMAIL=… ADMIN_PASSWORD=… bash scripts/marketplace-smoke/upload-publish-e2e.sh
#   BASE=http://localhost:3000 DATA=dist/.next/standalone/data KEEP=1 bash scripts/marketplace-smoke/upload-publish-e2e.sh
set -u

BASE=${BASE:-http://localhost:3000}
DATA=${DATA:-dist/.next/standalone/data}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@rosie-atelier.ir}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin-dev-pass}
KEEP=${KEEP:-0}
DIR=$(cd "$(dirname "$0")" && pwd)
WORK=$(mktemp -d /tmp/upload-publish-e2e.XXXXXX)

python3 "$DIR/mktile.py" "$WORK/tile-a.png" 640 640 > /dev/null
python3 "$DIR/mktile.py" "$WORK/tile-c.png" 512 512 > /dev/null
python3 "$DIR/mknoise.py" "$WORK/noise.png" 2000 2000 > /dev/null

python3 - "$BASE" "$DATA" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$KEEP" "$WORK" <<'PY'
import hashlib, json, os, re, subprocess, sys, time

BASE, DATA, ADMIN_EMAIL, ADMIN_PASSWORD, KEEP, WORK = sys.argv[1:7]
GREEN, RED, BOLD, RESET = "\033[32m", "\033[31m", "\033[1m", "\033[0m"
state = {"pass": 0, "fail": 0}
ADMIN, ARTIST = os.path.join(WORK, "admin.jar"), os.path.join(WORK, "artist.jar")


def check(cond, label, detail=""):
    state["pass" if cond else "fail"] += 1
    print(f"  {GREEN}✔{RESET} {label}" if cond else f"  {RED}✘{RESET} {label}" + (f" — {detail}" if detail else ""))
    return cond


def section(title):
    print(f"\n{BOLD}{title}{RESET}")


def curl(args, stdin=None):
    """→ (status, parsed JSON or raw text)"""
    out = subprocess.run(["curl", "-s", "-w", "\n%{http_code}", *args], input=stdin, capture_output=True).stdout.decode("utf-8", "replace")
    body, _, code = out.rpartition("\n")
    try:
        return int(code), json.loads(body)
    except ValueError:
        return int(code or 0), body


def api(jar, method, path, body=None):
    args = ["-b", jar, "-c", jar, "-X", method, BASE + path]
    if body is None:
        return curl(args)
    return curl(args + ["-H", "content-type: application/json", "--data-binary", "@-"], json.dumps(body).encode())


def form(jar, path, fields, file_field=None):
    args = ["-b", jar, "-c", jar, "-X", "POST", BASE + path]
    for key, value in fields.items():
        args += ["-F", f"{key}={value}"]
    if file_field:
        args += ["-F", f"file=@{file_field};type=application/octet-stream"]
    return curl(args)


def page(path):
    return curl([BASE + path])[1]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read(path):
    return open(path, "rb").read()


def session(jar, filename, data, **extra):
    body = {
        "filename": filename,
        "sizeBytes": len(data),
        "mime": "image/png",
        "title": {"fa": TITLE_FA, "en": TITLE_EN},
        "kind": "pattern",
        "familyId": "fam-curtain",
        "formatId": "png",
        "colourwayId": "cw-e2e-a",
        "colourway": {"name": {"fa": "اصلی", "en": "Original"}, "hex": "#b5713a"},
        "sha256": sha(data),
    }
    body.update(extra)
    return api(jar, "POST", "/api/marketplace/upload/session", body)


def shop_links(path):
    return set(re.findall(r'href="(/fa/marketplace/[^"?#]+)"', page(path)))


# Pages under [locale] stream behind a loading boundary, so a missing page still
# answers 200 — Next marks it with this digest (and renders its not-found UI).
NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404"


stamp = str(int(time.time()))
TITLE_FA, TITLE_EN = f"پرده آزمون {stamp}", f"E2E curtain {stamp}"
created = []

print(f"upload-publish-e2e → {BASE}   (data: {DATA})")

# ── setup ────────────────────────────────────────────────────────────────────
section("0. setup — admin, a fresh artist, the publishing policy")
status, data = api(ADMIN, "POST", "/api/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
if not check(status == 200, "the admin signs in", f"{status} {str(data)[:120]} — set ADMIN_EMAIL / ADMIN_PASSWORD"):
    sys.exit(1)
status, data = api(ADMIN, "GET", "/api/marketplace/admin?view=status")
original = (data.get("status") or {}).get("settings", {}) if isinstance(data, dict) else {}
check("autoPublishUploads" in original, "the settings expose «publish immediately» (autoPublishUploads)", str(original)[:160])
api(ADMIN, "POST", "/api/marketplace/admin", {"action": "settings", "settings": {"autoPublishUploads": True}})

email = f"e2e-upload-{stamp}@example.com"
status, data = api(ARTIST, "POST", "/api/auth/signup", {"name": "E2E Artist", "email": email, "password": "e2e-pass-123", "role": "artist"})
check(status in (200, 201) and isinstance(data, dict) and data.get("ok") is not False, "a fresh artist signs up", f"{status} {str(data)[:120]}")
artist_user = (data.get("user") or {}) if isinstance(data, dict) else {}

tile_a, tile_c, noise = read(os.path.join(WORK, "tile-a.png")), read(os.path.join(WORK, "tile-c.png")), read(os.path.join(WORK, "noise.png"))
path_a, path_c, path_noise = (os.path.join(WORK, n) for n in ("tile-a.png", "tile-c.png", "noise.png"))

# ── 1 ────────────────────────────────────────────────────────────────────────
section("1. integrity refusals — nothing damaged is ever kept")
status, data = session(ARTIST, "a.png", tile_a, sha256="not-a-hash")
check(status == 400 and data.get("error") == "invalid_checksum", "a malformed checksum is refused (400 invalid_checksum)", f"{status} {data}")

status, data = session(ARTIST, "a.png", tile_a, sizeBytes=len(tile_a) + 1, sha256=None)
sid = (data.get("session") or {}).get("id") if isinstance(data, dict) else None
status, data = form(ARTIST, "/api/marketplace/upload/complete", {"sessionId": sid}, path_a)
check(status == 422 and data.get("error") == "size_mismatch", "a file shorter than announced is refused (422 size_mismatch)", f"{status} {str(data)[:160]}")
status, data = form(ARTIST, "/api/marketplace/upload/complete", {"sessionId": sid}, path_a)
check(status == 404, "…and its session is closed — no half file can be completed later", f"{status}")

status, data = session(ARTIST, "a.png", tile_a, sha256=sha(tile_c))
sid = (data.get("session") or {}).get("id") if isinstance(data, dict) else None
status, data = form(ARTIST, "/api/marketplace/upload/complete", {"sessionId": sid}, path_a)
check(status == 422 and data.get("error") == "checksum_mismatch", "bytes that do not hash to the announced SHA-256 are refused (422)", f"{status} {str(data)[:160]}")

# ── 2 ────────────────────────────────────────────────────────────────────────
section("2. a verified upload creates a private, unfinished work")
status, data = session(ARTIST, "curtain-a.png", tile_a)
sid = data["session"]["id"]
check(data["session"]["mode"] == "single" and data["session"].get("checksum") == "sha256", "small file → single request, checksum armed", str(data["session"])[:160])
status, done = form(ARTIST, "/api/marketplace/upload/complete", {"sessionId": sid}, path_a)
ok = check(status == 200 and done.get("ok"), "complete → 200", f"{status} {str(done)[:200]}")
if not ok:
    sys.exit(1)
work_id = done["asset"]["id"]
created.append(work_id)
check((done.get("file") or {}).get("sizeBytes") == len(tile_a) and (done.get("file") or {}).get("sha256") == sha(tile_a),
      "the server reports exactly the bytes that were sent (size + SHA-256)", str(done.get("file")))
check(done.get("message") == "stored_awaiting_finalize", "…and says the work is not public yet", str(done.get("message")))
status, again = form(ARTIST, "/api/marketplace/upload/complete", {"sessionId": sid}, path_a)
check(status == 409 and again.get("error") == "already_completed" and again.get("assetId") == work_id,
      "a repeated complete answers already_completed with the same work (no duplicate)", f"{status} {again}")

status, mine = api(ARTIST, "GET", "/api/marketplace/artist/assets")
row = next((a for a in mine.get("assets", []) if a["id"] == work_id), {})
check(row.get("status") == "pending_review" and row.get("visibility") == "private" and row.get("uploadState") == "uploading",
      "the studio lists it as private and still uploading", f"{row.get('status')}/{row.get('visibility')}/{row.get('uploadState')}")
check((mine.get("policy") or {}).get("autoPublish") is True, "the studio knows works are published immediately", str(mine.get("policy")))
slug = row.get("slug", "")
check(f"/fa/marketplace/{slug}" not in shop_links("/fa/shop?family=curtain"), "an unfinished work is NOT in the shop")
check(NOT_FOUND in page(f"/fa/marketplace/{slug}"), "…and its licence page is not viewable yet")

# ── 3 ────────────────────────────────────────────────────────────────────────
section("3. finalize refuses an incomplete batch")
entry = {"colourwayId": "cw-e2e-a", "formatId": "png", "sizeBytes": len(tile_a), "sha256": sha(tile_a)}
status, data = api(ARTIST, "POST", "/api/marketplace/upload/finalize",
                   {"assetId": work_id, "files": [entry, {"colourwayId": "cw-e2e-b", "formatId": "png", "sizeBytes": len(noise)}]})
problems = data.get("problems", []) if isinstance(data, dict) else []
check(status == 409 and data.get("error") == "incomplete_upload" and any(p["colourwayId"] == "cw-e2e-b" and p["problem"] == "missing" for p in problems),
      "a file that never arrived → 409 incomplete_upload (missing)", f"{status} {str(data)[:200]}")
status, data = api(ARTIST, "POST", "/api/marketplace/upload/finalize", {"assetId": work_id, "files": [{**entry, "sizeBytes": len(tile_a) - 7}]})
check(status == 409 and any(p["problem"] == "size_mismatch" for p in data.get("problems", [])), "a different size → size_mismatch", f"{status} {str(data)[:160]}")
status, data = api(ARTIST, "POST", "/api/marketplace/upload/finalize", {"assetId": work_id, "files": [{**entry, "sha256": sha(tile_c)}]})
check(status == 409 and any(p["problem"] == "checksum_mismatch" for p in data.get("problems", [])), "different bytes → checksum_mismatch", f"{status} {str(data)[:160]}")
status, _ = curl([f"{BASE}/api/marketplace/assets?id={work_id}"])
check(status == 404, "the work is still private after the refusals", f"{status}")

# ── 4 ────────────────────────────────────────────────────────────────────────
section("4. chunked upload: damaged chunks are refused, real ones assemble")
status, data = session(ARTIST, "curtain-b.png", noise, colourwayId="cw-e2e-b",
                       colourway={"name": {"fa": "دانه‌دانه", "en": "Grain"}, "hex": "#334155"}, attachToAssetId=work_id)
info = data.get("session", {}) if isinstance(data, dict) else {}
multipart = check(info.get("mode") == "multipart" and info.get("totalParts", 0) >= 2,
                  f"a {len(noise) // 1048576} MB file travels in {info.get('totalParts')} verified chunks",
                  f"{info.get('mode')} — unset MARKETPLACE_MULTIPART_THRESHOLD_MB (local default: one part)")
if multipart:
    sid, size = info["id"], info["partSize"]
    chunks = [noise[i:i + size] for i in range(0, len(noise), size)]
    open(os.path.join(WORK, "short.bin"), "wb").write(chunks[0][:1000])
    status, data = form(ARTIST, "/api/marketplace/upload/part", {"sessionId": sid, "partNumber": 1}, os.path.join(WORK, "short.bin"))
    check(status == 422 and data.get("error") == "part_size_mismatch", "a truncated chunk → 422 part_size_mismatch", f"{status} {data}")
    open(os.path.join(WORK, "c1.bin"), "wb").write(chunks[0])
    status, data = form(ARTIST, "/api/marketplace/upload/part", {"sessionId": sid, "partNumber": 1, "sha256": sha(b"other")}, os.path.join(WORK, "c1.bin"))
    check(status == 422 and data.get("error") == "part_corrupted", "a chunk that does not match its SHA-256 → 422 part_corrupted", f"{status} {data}")
    status, data = api(ARTIST, "POST", "/api/marketplace/upload/complete", {"sessionId": sid})
    check(status == 409 and data.get("error") == "missing_parts", "refused chunks are not counted (complete → missing_parts)", f"{status} {str(data)[:120]}")
    good = True
    for number, chunk in enumerate(chunks, start=1):
        part = os.path.join(WORK, f"c{number}.bin")
        open(part, "wb").write(chunk)
        status, data = form(ARTIST, "/api/marketplace/upload/part", {"sessionId": sid, "partNumber": number, "sha256": sha(chunk)}, part)
        good = good and status == 200 and data.get("sha256") == sha(chunk) and data.get("bytes") == len(chunk)
    check(good, f"all {len(chunks)} chunks accepted with matching size and SHA-256")
    status, done = api(ARTIST, "POST", "/api/marketplace/upload/complete", {"sessionId": sid})
    check(status == 200 and (done.get("file") or {}).get("sha256") == sha(noise), "the assembled file hashes to the original", f"{status} {str(done)[:160]}")
    stored = os.path.join(DATA, "objects", "private", "masters", work_id)
    blobs = [os.path.join(root, f) for root, _, files in os.walk(stored) for f in files] if os.path.isdir(stored) else []
    if blobs:
        check(any(sha(read(b)) == sha(noise) for b in blobs), "the stored object on disk is byte-identical")

# ── 5 ────────────────────────────────────────────────────────────────────────
section("5. finalize publishes — the work is in its shop category")
files = [entry] + ([{"colourwayId": "cw-e2e-b", "formatId": "png", "sizeBytes": len(noise), "sha256": sha(noise)}] if multipart else [])
status, fin = api(ARTIST, "POST", "/api/marketplace/upload/finalize", {"assetId": work_id, "files": files})
check(status == 200 and fin.get("published") is True and fin.get("reason") == "auto_published",
      "every file verified → published immediately", f"{status} {str(fin)[:200]}")
check((fin.get("verified") or {}).get("files") == len(files), f"the server verified {len(files)} file(s)", str(fin.get("verified")))
check((fin.get("links") or {}).get("category") == "/shop?family=curtain", "the answer points to the chosen category", str(fin.get("links")))
status, public = curl([f"{BASE}/api/marketplace/assets?id={work_id}"])
check(status == 200 and public.get("asset", {}).get("status") == "approved", "the public catalogue serves it")
link = f"/fa/marketplace/{slug}"
check(link in shop_links("/fa/shop?family=curtain"), "it is listed in /fa/shop?family=curtain")
check(link in shop_links("/fa/shop"), "…and in the full shop")
check(TITLE_FA in page("/fa/shop?family=curtain"), "…under its own title")
check(link not in shop_links("/fa/shop?family=wallpaper"), "it is not filed under another family")
check(link not in shop_links("/fa/shop?owner=site"), "it is not presented as a site product")
check(link in shop_links("/fa/shop?owner=artist"), "it is presented as an artist's work")
licence = page(link)
check(NOT_FOUND not in licence and TITLE_FA in licence, "its licence page opens with the work on it")
status, again = api(ARTIST, "POST", "/api/marketplace/upload/finalize", {"assetId": work_id, "files": files})
check(status == 200 and again.get("reason") == "already_published", "finalize is idempotent (already_published)", f"{status} {str(again)[:120]}")
status, mine = api(ARTIST, "GET", "/api/marketplace/artist/assets")
row = next((a for a in mine.get("assets", []) if a["id"] == work_id), {})
check(row.get("uploadState") == "complete", "the studio shows the upload as complete", str(row.get("uploadState")))

# ── 6 ────────────────────────────────────────────────────────────────────────
section("6. review mode: verified, but published only by the admin")
status, data = api(ADMIN, "POST", "/api/marketplace/admin", {"action": "settings", "settings": {"autoPublishUploads": False}})
check(status == 200 and data.get("settings", {}).get("autoPublishUploads") is False, "the admin turns immediate publishing off")
status, mine = api(ARTIST, "GET", "/api/marketplace/artist/assets")
check((mine.get("policy") or {}).get("autoPublish") is False, "the studio now promises review instead")
TITLE_FA, TITLE_EN = f"پرده بازبینی {stamp}", f"E2E review {stamp}"
status, data = session(ARTIST, "review.png", tile_c)
sid = data["session"]["id"]
status, done = form(ARTIST, "/api/marketplace/upload/complete", {"sessionId": sid}, path_c)
review_id = done.get("asset", {}).get("id")
if review_id:
    created.append(review_id)
status, fin = api(ARTIST, "POST", "/api/marketplace/upload/finalize",
                  {"assetId": review_id, "files": [{"colourwayId": "cw-e2e-a", "formatId": "png", "sizeBytes": len(tile_c), "sha256": sha(tile_c)}]})
check(status == 200 and fin.get("published") is False and fin.get("reason") == "review_required",
      "finalize verifies the files but leaves the work for review", f"{status} {str(fin)[:160]}")
review_link = f"/fa/marketplace/{fin.get('asset', {}).get('slug', '')}"
check(review_link not in shop_links("/fa/shop?family=curtain"), "it is not in the shop yet")
status, data = api(ADMIN, "POST", "/api/marketplace/admin/review", {"action": "approve", "assetId": review_id, "publish": True})
check(status == 200, "the admin approves it")
check(review_link in shop_links("/fa/shop?family=curtain"), "…and it appears in its category")

# ── cleanup ──────────────────────────────────────────────────────────────────
section("cleanup")
restore = {key: original[key] for key in ("autoPublishUploads", "autoApproveSeamless") if key in original}
api(ADMIN, "POST", "/api/marketplace/admin", {"action": "settings", "settings": restore or {"autoPublishUploads": True}})
print(f"  settings restored: {restore}")
if KEEP == "1":
    print(f"  KEEP=1 — kept {created} and {email}")
else:
    # the throwaway artist goes too: its artist record, then its account
    if artist_user.get("artistId"):
        api(ADMIN, "DELETE", f"/api/admin/artists?id={artist_user['artistId']}")
    if artist_user.get("id"):
        status, _ = api(ADMIN, "DELETE", "/api/admin/users", {"id": artist_user["id"]})
        check(status == 200, f"the throwaway artist {email} is removed", str(status))
    for asset_id in created:
        api(ADMIN, "POST", "/api/marketplace/admin/review", {"action": "purge", "assetId": asset_id})
    check(all(curl([f"{BASE}/api/marketplace/assets?id={a}"])[0] == 404 for a in created), f"test works purged ({len(created)})")
    if os.path.isdir(os.path.join(DATA, "objects", "private")):
        leftovers = [a for a in created for kind in ("masters", "derived") if os.path.exists(os.path.join(DATA, "objects", "private", kind, a))]
        check(not leftovers, "purging removed every file of the works (colourway files included)", ", ".join(leftovers))

print()
print(f"{BOLD}{state['pass']} ✔ / {state['fail']} ✘{RESET}")
sys.exit(0 if state["fail"] == 0 else 1)
PY
code=$?
rm -rf "$WORK"
exit $code
