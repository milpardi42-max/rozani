#!/usr/bin/env bash
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
DATA=${DATA:-dist/.next/standalone/data}
BASE=${BASE:-http://localhost:3000}
J=/tmp/e2e-cookies.txt
step() { echo; echo "──── $1"; }

step "1. admin session"
curl -s -c $J -b $J -X POST $BASE/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@rosie-atelier.ir","password":"admin-dev-pass"}' | head -c 120

step "2. the artist opts in to selling this work exclusively"
AID=$(curl -s "$BASE/api/marketplace/assets?limit=1" | python3 -c "import sys,json;print(json.load(sys.stdin)['assets'][0]['id'])")
curl -s -c $J -b $J -X PATCH $BASE/api/marketplace/artist/assets -H 'content-type: application/json' \
  -d "{\"id\":\"$AID\",\"tiers\":[{\"id\":\"tier-exclusive\",\"priceFa\":9000000,\"priceEn\":149,\"enabled\":true}]}" > /dev/null
EXC=tier-exclusive
echo "asset=$AID exclusive tier=$EXC"

step "2b. buy the EXCLUSIVE license"
ORDER=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/checkout -H 'content-type: application/json' \
  -d "{\"items\":[{\"assetId\":\"$AID\",\"tierId\":\"$EXC\"}],\"provider\":\"zarinpal\",\"locale\":\"fa\",\"buyer\":{\"name\":\"گالری مهر\",\"email\":\"gallery@example.com\"}}")
OID=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['order']['id'])" "$ORDER")
REDIR=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['payment']['redirectUrl'])" "$ORDER")
AUTH=$(python3 -c "import urllib.parse as u,sys;print(u.parse_qs(u.urlparse(sys.argv[1]).query)['authority'][0])" "$REDIR")
echo "order=$OID"

step "3. pay"
curl -s -X POST $BASE/api/marketplace/payments/sandbox -H 'content-type: application/json' \
  -d "{\"authority\":\"$AUTH\",\"outcome\":\"paid\",\"locale\":\"fa\"}" | head -c 220

step "4. the work must now be delisted automatically"
curl -s "$BASE/api/marketplace/assets?limit=10" | python3 -c "
import sys,json;print('catalogue total after exclusive sale:', json.load(sys.stdin)['total'])"
curl -s "$BASE/api/marketplace/assets?id=$AID" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('public fetch of the sold work:', d.get('error') or d['asset']['status'])"
python3 -c "
import json
for a in json.load(open('$DATA/mk-assets.json')):
    print('store:', a['id'], a['status'], a['visibility'])"

step "5. admin refunds → the work returns to the shop"
curl -s -c $J -b $J -X POST $BASE/api/marketplace/admin/orders -H 'content-type: application/json' \
  -d "{\"action\":\"refund\",\"orderId\":\"$OID\"}" | head -c 300
echo
curl -s "$BASE/api/marketplace/assets?limit=10" | python3 -c "
import sys,json;print('catalogue total after refund:', json.load(sys.stdin)['total'])"
python3 -c "
import json
for a in json.load(open('$DATA/mk-assets.json')):
    print('store:', a['id'], a['status'], a['visibility'])"
python3 -c "
import json
lic=json.load(open('$DATA/mk-licenses.json'))
row=[l for l in lic if l.get('orderId')=='$OID'][0]
print('licence status:', row['status'], '| revoked:', row.get('revokedReason') or row.get('revokedAt') is not None)"
