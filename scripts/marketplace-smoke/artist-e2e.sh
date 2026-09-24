#!/usr/bin/env bash
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
DATA=${DATA:-dist/.next/standalone/data}
BASE=${BASE:-http://localhost:3000}
A=/tmp/artist-cookies.txt
ADM=/tmp/e2e-cookies.txt
E=$DIR
step() { echo; echo "──── $1"; }

step "1. artist signs in"
curl -s -c $A -b $A -X POST $BASE/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"niloufar@example.com","password":"artist-dev-pass"}' | head -c 200
curl -s -c $ADM -b $ADM -X POST $BASE/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@rosie-atelier.ir","password":"admin-dev-pass"}' > /dev/null

step "2. artist uploads a master"
python3 $DIR/mktile.py /tmp/artist.png 512 512
SIZE=$(stat -c%s /tmp/artist.png)
S=$(curl -s -c $A -b $A -X POST $BASE/api/marketplace/upload/session -H 'content-type: application/json' \
  -d "{\"filename\":\"gol-o-morgh.png\",\"sizeBytes\":$SIZE,\"mime\":\"image/png\",\"title\":{\"fa\":\"گل و مرغ\",\"en\":\"Gol o Morgh\"},\"description\":{\"fa\":\"نقش گل و مرغ برای چاپ پارچه\",\"en\":\"Persian gol-o-morgh textile print\"},\"kind\":\"pattern\",\"tags\":[\"textile\",\"persian\"],\"familyId\":\"fam-home-fabric\",\"formatId\":\"png\",\"colourwayId\":\"cw-golmorgh\",\"colourway\":{\"name\":{\"fa\":\"گل و مرغ\",\"en\":\"Gol o Morgh\"},\"hex\":\"#7c3aed\"}}")
SID=$(echo "$S" | python3 -c "import sys,json;print(json.load(sys.stdin)['session']['id'])")
D=$(curl -s -c $A -b $A -X POST $BASE/api/marketplace/upload/complete -F "sessionId=$SID" -F "file=@/tmp/artist.png;type=image/png")
echo "$D" | head -c 400
AID=$(echo "$D" | python3 -c "import sys,json;print(json.load(sys.stdin)['asset']['id'])")
echo "asset=$AID"

step "3. admin approves"
curl -s -c $ADM -b $ADM -X POST $BASE/api/marketplace/admin/review -H 'content-type: application/json' \
  -d "{\"action\":\"approve\",\"assetId\":\"$AID\",\"publish\":true}" | head -c 200

step "4. artist prices the work"
IDS=$(curl -s "$BASE/api/marketplace/assets?limit=1&sort=recent" | python3 -c "
import sys,json
a=json.load(sys.stdin)['assets'][0]
print(' '.join(t['id'] for t in a['tiers']))")
set -- $IDS
COM=$2
curl -s -c $A -b $A -X PATCH $BASE/api/marketplace/artist/assets -H 'content-type: application/json' \
  -d "{\"id\":\"$AID\",\"tiers\":[{\"id\":\"$COM\",\"priceFa\":5000000,\"priceEn\":75,\"enabled\":true}]}" | head -c 200

step "5. buyer purchases through the sandbox gateway"
ORDER=$(curl -s -c $ADM -b $ADM -X POST $BASE/api/marketplace/checkout -H 'content-type: application/json' \
  -d "{\"items\":[{\"assetId\":\"$AID\",\"tierId\":\"$COM\"}],\"provider\":\"zarinpal\",\"locale\":\"fa\",\"buyer\":{\"name\":\"شرکت پارچه بافی\",\"email\":\"buyer@example.com\"}}")
OID=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['order']['id'])" "$ORDER")
REDIR=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['payment']['redirectUrl'])" "$ORDER")
AUTH=$(python3 -c "import urllib.parse as u,sys;print(u.parse_qs(u.urlparse(sys.argv[1]).query)['authority'][0])" "$REDIR")
echo "order=$OID"
curl -s -X POST $BASE/api/marketplace/payments/sandbox -H 'content-type: application/json' \
  -d "{\"authority\":\"$AUTH\",\"outcome\":\"paid\",\"locale\":\"fa\"}" | head -c 300

step "6. artist wallet after the sale"
curl -s -c $A -b $A "$BASE/api/marketplace/artist/payouts" | head -c 900

step "7. artist asks for a payout"
curl -s -c $A -b $A -X POST $BASE/api/marketplace/artist/payouts -H 'content-type: application/json' \
  -d '{"action":"profile","method":"iban","iban":"IR620570028780010000000001","accountHolder":"نیلوفر راد","bankName":"بانک ملت","nationalId":"0079123456"}' | head -c 400
echo
curl -s -c $A -b $A -X POST $BASE/api/marketplace/artist/payouts -H 'content-type: application/json' \
  -d "{\"action\":\"request\",\"orderId\":\"$OID\"}" | head -c 400

step "8. admin payout queue"
curl -s -c $ADM -b $ADM "$BASE/api/marketplace/admin?view=payouts" > /tmp/po.json
head -c 700 /tmp/po.json
PO=$(python3 -c "
import json
d=json.load(open('/tmp/po.json'))
rows=d.get('pending') or []
print(rows[0]['id'] if rows else '')")
echo; echo "payout=$PO"

step "8b. admin marks the payout as paid"
if [ -n "$PO" ]; then
  curl -s -c $ADM -b $ADM -X POST $BASE/api/marketplace/admin/payouts -H 'content-type: application/json' \
    -d "{\"action\":\"approve\",\"payoutId\":\"$PO\",\"reference\":\"BANK-TRACK-9911\"}" | head -c 300
  echo
  curl -s -c $ADM -b $ADM -X POST $BASE/api/marketplace/admin/payouts -H 'content-type: application/json' \
    -d "{\"action\":\"paid\",\"payoutId\":\"$PO\",\"reference\":\"BANK-TRACK-9911\"}" | head -c 300
  echo
  curl -s -c $A -b $A "$BASE/api/marketplace/artist/payouts" | python3 -c "
import sys,json;w=json.load(sys.stdin)['wallet']['balance'];print('wallet after settlement:',json.dumps(w,ensure_ascii=False))"
fi

step "9. artist analytics"
curl -s -c $A -b $A "$BASE/api/marketplace/artist/analytics?days=30" | head -c 700

step "10. artist affiliate coupon"
curl -s -c $A -b $A -X POST $BASE/api/marketplace/artist/affiliate -H 'content-type: application/json' \
  -d '{"action":"create","code":"NILOUFAR15","kind":"percent","percent":15,"asAffiliate":true}' | head -c 400
echo
curl -s -c $A -b $A "$BASE/api/marketplace/artist/affiliate" | head -c 500
echo
echo "AID=$AID OID=$OID PO=$PO"
