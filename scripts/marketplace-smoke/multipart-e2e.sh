#!/usr/bin/env bash
# Chunked (multipart) master upload — the path used for files above
# MARKETPLACE_MULTIPART_THRESHOLD_MB, i.e. real multi-hundred-MB drops.
#
# The 5 MB minimum chunk size means a genuinely multi-chunk upload needs a file
# of at least ~10 MB, or a lowered threshold. Both work:
#   MARKETPLACE_MULTIPART_THRESHOLD_MB=5 node dist/.next/standalone/server.js
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
DATA=${DATA:-dist/.next/standalone/data}
BASE=${BASE:-http://localhost:3000}
J=/tmp/mp-cookies.txt
rm -f $J
step() { echo; echo "──── $1"; }

step "1. admin login"
curl -s -c $J -b $J -X POST $BASE/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@rosie-atelier.ir","password":"admin-dev-pass"}' | head -c 200

step "2. craft a large tileable master"
python3 $DIR/mknoise.py /tmp/big-master.png
SIZE=$(stat -c%s /tmp/big-master.png)
SHA=$(sha256sum /tmp/big-master.png | cut -d' ' -f1)
echo "bytes=$SIZE sha256=$SHA"

step "3. upload session"
SESSION=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/upload/session -H 'content-type: application/json' \
  -d "{\"filename\":\"granite-noise.png\",\"sizeBytes\":$SIZE,\"mime\":\"image/png\",\"title\":{\"fa\":\"بافت گرانیت\",\"en\":\"Granite noise\"},\"description\":{\"fa\":\"بافت بی‌درز پرجزئیات\",\"en\":\"High-detail seamless texture\"},\"kind\":\"texture\",\"tags\":[\"seamless\",\"noise\"],\"familyId\":\"fam-wallpaper\",\"formatId\":\"png\",\"colourwayId\":\"cw-granite\",\"colourway\":{\"name\":{\"fa\":\"گرانیت\",\"en\":\"Granite\"},\"hex\":\"#334155\"}}")
echo "$SESSION" | head -c 500
SID=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['id'])")
MODE=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['mode'])")
TOTAL=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['totalParts'])")
PSIZE=$(echo "$SESSION" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['partSize'])")
echo; echo "mode=$MODE parts=$TOTAL partSize=$PSIZE"
if [ "$MODE" != "multipart" ] || [ "$TOTAL" -lt 2 ]; then
  echo "✘ this run did not take the chunked path — lower MARKETPLACE_MULTIPART_THRESHOLD_MB below $SIZE"; exit 1
fi

step "4. upload every chunk"
python3 $DIR/split.py /tmp/big-master.png $PSIZE /tmp/bigpart
for PN in $(seq 1 $TOTAL); do
  R=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/upload/part -F "sessionId=$SID" -F "partNumber=$PN" -F "file=@/tmp/bigpart-$PN.bin;type=application/octet-stream" \
      -w "|%{http_code}|%{size_upload}")
  echo "part $PN → $R"
done

step "5. complete → assembled master"
curl -s -c $J -b $J -X POST $BASE/api/marketplace/upload/complete -F "sessionId=$SID" -o /tmp/big-done.json
head -c 600 /tmp/big-done.json; echo
AID=$(python3 -c "import json;print(json.load(open('/tmp/big-done.json'))['asset']['id'])")
ON_DISK=$DATA/objects/private/masters/$AID/original.png
echo "on disk: $(stat -c%s $ON_DISK) bytes"
cmp /tmp/big-master.png $ON_DISK && echo "✔ the assembled master is byte-identical to the source"
if [ -d "$DATA/objects/private/staging/$SID" ]; then echo "✘ staging chunks were not cleaned up"; else echo "✔ staging chunks removed"; fi

step "6. approve, price and sell it"
curl -s -c $J -b $J -X POST $BASE/api/marketplace/admin/review -H 'content-type: application/json' \
  -d "{\"action\":\"approve\",\"assetId\":\"$AID\",\"publish\":true}" | head -c 300; echo
ID=$(curl -s "$BASE/api/marketplace/assets?limit=1" | python3 -c "import sys,json;print(json.load(sys.stdin)['assets'][0]['tiers'][1]['id'])")
curl -s -c $J -b $J -X PATCH $BASE/api/marketplace/artist/assets -H 'content-type: application/json' \
  -d "{\"id\":\"$AID\",\"tiers\":[{\"id\":\"$ID\",\"priceFa\":1200000,\"priceEn\":19,\"enabled\":true}]}" | head -c 200; echo
ORDER=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/checkout -H 'content-type: application/json' \
  -d "{\"items\":[{\"assetId\":\"$AID\",\"tierId\":\"$ID\"}],\"provider\":\"zarinpal\",\"locale\":\"fa\",\"buyer\":{\"name\":\"کیان مرادی\",\"email\":\"kian@example.com\"}}")
OID=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['order']['id'])" "$ORDER")
AUTH=$(python3 -c "import json,sys,urllib.parse as u;print(u.parse_qs(u.urlparse(json.loads(sys.argv[1])['payment']['redirectUrl']).query)['authority'][0])" "$ORDER")
curl -s -X POST $BASE/api/marketplace/payments/sandbox -H 'content-type: application/json' -d "{\"authority\":\"$AUTH\",\"outcome\":\"paid\",\"locale\":\"fa\"}" | head -c 200; echo
TOKEN=$(curl -s -b $J -c $J "$BASE/api/marketplace/orders/$OID" | python3 -c "
import sys,json,urllib.parse as p
print(p.parse_qs(p.urlparse(json.load(sys.stdin)['licenses'][0]['downloadUrl']).query)['token'][0])")

step "7. buy & download the large master"
curl -s -o /tmp/big-downloaded.png -w "download: %{http_code} %{size_download} bytes\n" "$BASE/api/marketplace/download?token=$TOKEN"
SHA2=$(sha256sum /tmp/big-downloaded.png | cut -d' ' -f1)
echo "sha256=$SHA2"
[ "$SHA" = "$SHA2" ] && echo "✔ the delivered file matches the uploaded master bit for bit"
echo "ASSET=$AID ORDER=$OID SIZE=$SIZE"
