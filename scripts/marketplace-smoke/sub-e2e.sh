#!/usr/bin/env bash
set -e
DIR=$(cd "$(dirname "$0")" && pwd)
DATA=${DATA:-dist/.next/standalone/data}
BASE=${BASE:-http://localhost:3000}
J=/tmp/e2e-cookies.txt
step() { echo; echo "──── $1"; }

step "1. plans on offer"
curl -s "$BASE/api/marketplace/subscriptions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for p in d['plans']:
    print('-', p['id'], '|', p['title']['fa'], '|', p['price']['fa'], 'تومان |', p['downloadsPerMonth'], 'دانلود |', 'covers:', ','.join(p['covers']))"

step "2. buy the studio pass (sandbox)"
ORDER=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/checkout -H 'content-type: application/json' \
  -d '{"items":[],"planId":"pass-studio","provider":"zarinpal","locale":"fa","buyer":{"name":"استودیو نقش","email":"sub@example.com"}}')
echo "$ORDER" | head -c 500
OID=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['order']['id'])" "$ORDER")
REDIR=$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['payment']['redirectUrl'])" "$ORDER")
AUTH=$(python3 -c "import urllib.parse as u,sys;print(u.parse_qs(u.urlparse(sys.argv[1]).query)['authority'][0])" "$REDIR")
echo "$OID" > /tmp/sub-order.txt

step "3. pay"
curl -s -X POST $BASE/api/marketplace/payments/sandbox -H 'content-type: application/json' \
  -d "{\"authority\":\"$AUTH\",\"outcome\":\"paid\",\"locale\":\"fa\"}" | head -c 300

step "4. my pass"
curl -s -c $J -b $J "$BASE/api/marketplace/subscriptions" | python3 -c "
import sys,json
d=json.load(sys.stdin)
s=d.get('subscription')
print('pass:', json.dumps(s, ensure_ascii=False)[:400] if s else 'NONE')"

step "5. download a covered work against the pass"
PICK=$(curl -s "$BASE/api/marketplace/assets?limit=20" | python3 -c "
import sys,json
for a in json.load(sys.stdin)['assets']:
    for t in a['tiers']:
        if t['kind'] == 'personal':
            print(a['id'], t['id'])
            raise SystemExit")
AID=$(echo "$PICK" | cut -d' ' -f1)
TIER=$(echo "$PICK" | cut -d' ' -f2)
echo "asset=$AID tier=$TIER"
FREE=$(curl -s -c $J -b $J -X POST $BASE/api/marketplace/checkout -H 'content-type: application/json' \
  -d "{\"items\":[{\"assetId\":\"$AID\",\"tierId\":\"$TIER\"}],\"provider\":\"zarinpal\",\"locale\":\"fa\",\"useSubscription\":true,\"buyer\":{\"name\":\"استودیو نقش\",\"email\":\"sub@example.com\"}}")
echo "$FREE" | head -c 700

step "6. quota after the pass download"
curl -s -c $J -b $J "$BASE/api/marketplace/subscriptions" | python3 -c "
import sys,json
d=json.load(sys.stdin); s=d['subscription']
print('quota:', json.dumps(s['quota'], ensure_ascii=False))"

step "7. cancel the pass"
curl -s -c $J -b $J -X POST $BASE/api/marketplace/subscriptions -H 'content-type: application/json' -d '{"action":"cancel"}' | head -c 300
