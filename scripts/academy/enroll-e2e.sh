#!/usr/bin/env bash
#
# Academy enrolment check — runs against a live server (dev or production build).
#
# Proves that the registration form on the academy pages is backed by real data:
#   1. POST /api/academy/enroll creates a reservation in the local store
#   2. the same e-mail + course is de-duplicated (one seat, not two rows)
#   3. the registration appears in the admin panel feed («رزرو رویدادها»)
#   4. invalid payloads and unknown slugs are refused
#   5. the course page actually ships the form
#
# Usage:
#   bash scripts/academy/enroll-e2e.sh
#   BASE=http://localhost:3000 DATA=dist/.next/standalone/data bash scripts/academy/enroll-e2e.sh
#
BASE=${BASE:-http://localhost:3000}
DATA=${DATA:-dist/.next/standalone/data}
SLUG=${SLUG:-pattern-design-foundations}
J=/tmp/academy-admin.txt
EMAIL="academy-e2e-$(date +%s)@example.com"
step() { echo; echo "──── $1"; }
post() { curl -s -X POST "$BASE/api/academy/enroll" -H 'content-type: application/json' -d "$1"; }

step "1. admin session (needed to read the panel feed)"
curl -s -c $J -b $J -X POST $BASE/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@rosie-atelier.ir","password":"admin-dev-pass"}' | head -c 120
echo

step "2. a visitor enrols in «$SLUG»"
POST1=$(post "{\"slug\":\"$SLUG\",\"name\":\"آزمون ثبت‌نام\",\"email\":\"$EMAIL\"}")
echo "$POST1" | head -c 420
echo
ID1=$(echo "$POST1" | python3 -c "import sys,json;print(json.load(sys.stdin)['enrollment']['id'])" 2>/dev/null)

step "3. a second click from the same e-mail returns the same registration"
POST2=$(post "{\"slug\":\"$SLUG\",\"name\":\"آزمون ثبت‌نام\",\"email\":\"$EMAIL\"}")
ID2=$(echo "$POST2" | python3 -c "import sys,json;print(json.load(sys.stdin)['enrollment']['id'])" 2>/dev/null)
if [ -n "$ID1" ] && [ "$ID1" = "$ID2" ]; then
  echo "same reservation id: $ID1  ✔"
else
  echo "DIFFERENT ids: $ID1 / $ID2  ✘"
fi

step "4. the registration shows up in the admin panel feed"
curl -s -b $J "$BASE/api/admin/reservations" | python3 -c "
import sys, json
rows = json.load(sys.stdin).get('reservations', [])
hit = [r for r in rows if r.get('email') == '$EMAIL']
print('matching rows:', len(hit))
print(json.dumps(hit[0], ensure_ascii=False) if hit else 'NOT FOUND ✘')"

step "5. invalid input is refused"
printf '%-14s' "empty name:"; post "{\"slug\":\"$SLUG\",\"name\":\"\",\"email\":\"$EMAIL\"}" | head -c 160; echo
printf '%-14s' "unknown slug:"; post "{\"slug\":\"no-such-course\",\"name\":\"آزمون\",\"email\":\"$EMAIL\"}" | head -c 160; echo

step "6. the course page ships the real form"
curl -s "$BASE/fa/academy/$SLUG" | grep -o "id=\"enroll-email-$SLUG\"" | head -1 | sed 's/^/e-mail input: /'
curl -s "$BASE/en/academy/$SLUG" | grep -o "id=\"enroll-name-$SLUG\"" | head -1 | sed 's/^/name input: /'

step "7. cleanup (best effort — local file backend only)"
python3 - "$DATA" "$EMAIL" <<'PY'
import json, os, sys
data, email = sys.argv[1], sys.argv[2]
path = os.path.join(data, "reservations.json")
if not os.path.exists(path):
    print("no reservations.json (external backend?) — nothing removed")
    raise SystemExit
rows = json.load(open(path))
kept = [r for r in rows if r.get("email") != email]
json.dump(kept, open(path, "w"), ensure_ascii=False, indent=2)
print(f"removed {len(rows) - len(kept)} test row(s); {len(kept)} left")
PY
