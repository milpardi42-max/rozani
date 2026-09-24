#!/usr/bin/env bash
DIR=$(cd "$(dirname "$0")" && pwd)
BASE=${BASE:-http://localhost:3000}
DATA=${DATA:-dist/.next/standalone/data}
J=/tmp/e2e-cookies.txt
AID=$(python3 -c "import json;print(json.load(open('/tmp/done.json'))['asset']['id'])" 2>/dev/null || echo "")
SLUG=$(python3 -c "import json;print(json.load(open('/tmp/done.json'))['asset']['slug'])" 2>/dev/null || echo "")
OID=$(python3 -c "
import json,glob
d=json.load(open('$DATA/mk-orders.json'))
print(d[-1]['id'])" 2>/dev/null || echo "")
LIC=$(python3 -c "import json;print(json.load(open('$DATA/mk-licenses.json'))[-1]['id'])" 2>/dev/null || echo "")
SERIAL=$(python3 -c "import json;print(json.load(open('$DATA/mk-licenses.json'))[-1]['serial'])" 2>/dev/null || echo "")

check() { printf "%-58s" "$2"; code=$(curl -s -o /tmp/page.html -w "%{http_code}" -b $J -c $J "$BASE$1"); size=$(stat -c%s /tmp/page.html); printf "%s  %6s bytes" "$code" "$size"; if grep -qi "Application error\|Internal Server Error" /tmp/page.html; then printf "  ← ERROR"; fi; echo; }

echo "── public pages"
check "/fa" "home fa"
check "/fa/portfolio" "portfolio gallery fa (founder introduction + works)"
check "/en/portfolio" "portfolio gallery en"
check "/fa/razieh" "the founder's personal portfolio fa"
check "/en/razieh" "the founder's personal portfolio en"
check "/fa/shop" "shop fa (new hero + catalogue)"
check "/en/shop" "shop en (new hero + catalogue)"
check "/fa/shop?family=wallpaper" "shop filtered by family fa"

echo
echo "── academy pages (hero video, course pages, admin-driven content)"
check "/fa/academy" "academy fa"
check "/en/academy" "academy en"
check "/fa/academy/pattern-design-foundations" "course detail fa"
check "/en/academy/pattern-design-foundations" "course detail en"
check "/fa/academy/geometry-and-rhythm" "course without price fa"
check "/videos/academy/preview.mp4" "hero preview video (mp4)"
check "/fa/marketplace" "marketplace catalogue fa"
check "/en/marketplace" "marketplace catalogue en"
check "/fa/marketplace/$SLUG" "asset detail fa ($SLUG)"
check "/en/marketplace/$SLUG" "asset detail en"
check "/fa/marketplace/cart" "digital cart"
check "/fa/marketplace/subscriptions" "subscriptions"
check "/fa/verify" "verify console"
check "/fa/verify/$SERIAL" "verify by serial"
check "/en/verify/$SERIAL" "verify by serial (en)"
check "/fa/delivery/not-a-real-token" "bogus delivery link (expect 200 + invalid notice)"
check "/fa/signup" "signup (buyer form)"
check "/en/signup" "signup (en)"
check "/fa/creators/join" "designer signup (creators/join)"
check "/en/creators/join" "designer signup (en)"
check "/fa/checkout/return?order=$OID&status=paid" "receipt page"

echo
echo "── authenticated pages"
check "/fa/account/licenses" "license vault (admin session)"
check "/fa/artist" "artist dashboard (new)"
check "/fa/artist/portfolio" "artist portfolio manager"
check "/fa/artist/marketplace" "artist studio"
check "/fa/artist/marketplace?tab=upload" "studio deep link (upload tab)"
check "/fa/admin/marketplace" "admin console (after redirect)"
check "/admin/fa/marketplace" "admin console (real path)"

echo
echo "── unauthorised expectations (no cookie)"
nocookie() { printf "%-58s" "$2"; code=$(curl -s -o /dev/null -w "%{http_code}" -L -H 'cookie:' "$BASE$1"); echo "$code"; }
nocookie "/fa/admin/marketplace" "admin console without session (redirect→login)"
nocookie "/fa/artist" "artist dashboard without session (redirect→login)"
nocookie "/fa/artist/marketplace" "artist studio without session"
