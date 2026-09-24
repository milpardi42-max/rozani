#!/usr/bin/env bash
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
DATA=${DATA:-dist/.next/standalone/data}
BASE=${BASE:-http://localhost:3000}
J=/tmp/e2e-cookies.txt
E=$DIR
rm -f $J
step() { echo; echo "──── $1"; }

step "1. admin login"
curl -s -c $J -b $J -X POST $BASE/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@rosie-atelier.ir","password":"admin-dev-pass"}' | head -c 300

step "2. craft a master file"
python3 $DIR/mktile.py /tmp/master.png 600 600
SIZE=$(stat -c%s /tmp/master.png)
echo "png bytes: $SIZE"

step "3. create upload session"
SESSION=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/upload/session -H 'content-type: application/json' \
  -d "{\"filename\":\"heritage-tile.png\",\"sizeBytes\":$SIZE,\"mime\":\"image/png\",\"title\":{\"fa\":\"کاشی میراث\",\"en\":\"Heritage tile\"},\"description\":{\"fa\":\"الگوی تخت کاشی ایرانی\",\"en\":\"Flat Persian tile pattern\"},\"kind\":\"pattern\",\"tags\":[\"tile\",\"persian\"],\"familyId\":\"fam-wallpaper\",\"formatId\":\"png\",\"colourwayId\":\"cw-heritage\",\"colourway\":{\"name\":{\"fa\":\"کاشی میراث\",\"en\":\"Heritage\"},\"hex\":\"#1d4ed8\"}}")
echo "$SESSION" | head -c 600
SID=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['id'])")
MODE=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['mode'])")
TOTAL=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['totalParts'])")
PSIZE=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['partSize'])")

step "4. send the bytes (mode=$MODE, parts=$TOTAL, partSize=$PSIZE)"
if [ "$MODE" = "single" ]; then
  curl -s -c $J -b $J -X POST $BASE/api/marketplace/upload/complete -F "sessionId=$SID" -F "file=@/tmp/master.png;type=image/png" > /tmp/done.json
else
  python3 $DIR/split.py /tmp/master.png $PSIZE /tmp/part
  for PN in $(seq 1 $TOTAL); do
    R=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/upload/part -F "sessionId=$SID" -F "partNumber=$PN" -F "file=@/tmp/part-$PN.bin;type=application/octet-stream")
    echo "part $PN → $(echo "$R" | head -c 120)"
  done
  curl -s -c $J -b $J -X POST $BASE/api/marketplace/upload/complete -F "sessionId=$SID" > /tmp/done.json
fi
cat /tmp/done.json | head -c 1400

step "5. master must be private (not reachable as a public file)"
AID=$(python3 -c "import json;print(json.load(open('/tmp/done.json'))['asset']['id'])")
echo "asset=$AID"
echo "on-disk master:"; ls -l $DATA/objects/private/masters/$AID/ | awk '{print $5, $9}'
echo "public attempt:"; curl -s -o /dev/null -w "  /private/masters/$AID/original.png → %{http_code}\n" "$BASE/private/masters/$AID/original.png"
echo "media API with a master key (must be refused):"
curl -s -o /dev/null -w "  /api/marketplace/media?key=private/masters/$AID/original.png → %{http_code}\n" "$BASE/api/marketplace/media?key=private/masters/$AID/original.png"

step "6. approve & publish"
curl -s -c $J -b $J -X POST $BASE/api/marketplace/admin/review -H 'content-type: application/json' \
  -d "{\"action\":\"approve\",\"assetId\":\"$AID\",\"publish\":true}" | head -c 400

step "7. artist sets tiers"
IDs=$(curl -s "$BASE/api/marketplace/assets?limit=1" | python3 -c "
import sys,json
a=json.load(sys.stdin)['assets'][0]
print(' '.join(t['id'] for t in a['tiers']))")
set -- $IDs
COM=$2
EXC=$3
echo "tier ids: $IDs (using $COM)"
curl -s -c $J -b $J -X PATCH $BASE/api/marketplace/artist/assets -H 'content-type: application/json' \
  -d "{\"id\":\"$AID\",\"tiers\":[{\"id\":\"$COM\",\"priceFa\":3900000,\"priceEn\":59,\"enabled\":true}]}" | head -c 500
echo

step "8. public catalogue"
curl -s "$BASE/api/marketplace/assets?limit=3" | head -c 900

step "9. quote (VAT)"
curl -s -c $J -b $J -X POST $BASE/api/marketplace/checkout/quote -H 'content-type: application/json' \
  -d "{\"items\":[{\"assetId\":\"$AID\",\"tierId\":\"$COM\"}],\"provider\":\"zarinpal\"}" | head -c 700

step "10. checkout → sandbox gateway"
ORDER=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/checkout -H 'content-type: application/json' \
  -d "{\"items\":[{\"assetId\":\"$AID\",\"tierId\":\"$COM\"}],\"provider\":\"zarinpal\",\"locale\":\"fa\",\"buyer\":{\"name\":\"سارا محمدی\",\"email\":\"sara@example.com\",\"company\":\"استودیو سارا\"},\"couponCode\":\"WELCOME10\"}")
echo "$ORDER" | head -c 900
OID=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['order']['id'])" "$ORDER")
REDIR=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['payment']['redirectUrl'])" "$ORDER")
AUTH=$(python3 -c "import urllib.parse as u,sys;print(u.parse_qs(u.urlparse(sys.argv[1]).query)['authority'][0])" "$REDIR")
echo; echo "order=$OID"; echo "redirect=$REDIR"

step "11. sandbox page + JSON API"
curl -s -o /dev/null -w "sandbox page: %{http_code}\n" "$BASE$REDIR"
curl -s "$BASE/api/marketplace/payments/sandbox?authority=$AUTH" | head -c 400

step "12. pay in the sandbox"
PAID=$(curl -s -X POST $BASE/api/marketplace/payments/sandbox -H 'content-type: application/json' -d "{\"authority\":\"$AUTH\",\"outcome\":\"paid\",\"locale\":\"fa\"}")
echo "$PAID" | head -c 500

step "13. receipt page + order API"
curl -s -o /dev/null -w "return page: %{http_code}\n" "$BASE/fa/checkout/return?order=$OID&status=paid"
curl -s -b $J -c $J "$BASE/api/marketplace/orders/$OID" | head -c 1400

step "14. download the licensed file"
TOKEN=$(curl -s -b $J -c $J "$BASE/api/marketplace/orders/$OID" | python3 -c "
import sys,json,urllib.parse as p
d=json.load(sys.stdin); u=d['licenses'][0]['downloadUrl']
print(p.parse_qs(p.urlparse(u).query)['token'][0])")
curl -s -D /tmp/dl-headers.txt -o /tmp/downloaded.png "$BASE/api/marketplace/download?token=$TOKEN"
grep -iE "^(HTTP|content-type|content-disposition|content-length|accept-ranges)" /tmp/dl-headers.txt
ls -l /tmp/downloaded.png /tmp/master.png | awk '{print $5, $9}'
cmp /tmp/downloaded.png /tmp/master.png && echo "✔ downloaded bytes are byte-identical to the master"

step "15. certificate PDF"
LIC=$(curl -s -b $J -c $J "$BASE/api/marketplace/orders/$OID" | python3 -c "import sys,json;print(json.load(sys.stdin)['licenses'][0]['id'])")
SERIAL=$(curl -s -b $J -c $J "$BASE/api/marketplace/orders/$OID" | python3 -c "import sys,json;print(json.load(sys.stdin)['licenses'][0]['serial'])")
curl -s -b $J -c $J -o /tmp/cert.pdf -w "certificate: %{http_code} %{size_download} bytes\n" "$BASE/api/marketplace/licenses/$LIC/certificate?locale=fa"
head -c 8 /tmp/cert.pdf | od -c | head -1; python3 -c "import sys;d=open('/tmp/cert.pdf','rb').read();print('pages:', d.count(b'/Type /Page'))"

step "16. public verification"
curl -s "$BASE/api/marketplace/verify/$SERIAL" | head -c 600

step "17. quota + tamper"
for i in 1 2 3 4; do curl -s -o /dev/null "$BASE/api/marketplace/download?token=$TOKEN"; done
echo "after 5 downloads:"; curl -s "$BASE/api/marketplace/download?token=$TOKEN" | head -c 200; echo
echo "tampered:"; curl -s "$BASE/api/marketplace/download?token=${TOKEN}xx" | head -c 200; echo

step "18. vendor wallet state"
curl -s -b $J -c $J "$BASE/api/marketplace/admin?view=dashboard" | head -c 500; echo
curl -s -c $J -b $J "$BASE/api/marketplace/admin?view=outbox" | head -c 500; echo
echo "LIC=$LIC ORDER=$OID ASSET=$AID SERIAL=$SERIAL"
