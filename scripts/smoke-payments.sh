#!/usr/bin/env bash
# Prueba de humo del flujo de pago contra el stack local de Supabase.
# Requiere: supabase start, supabase db reset (seed), supabase functions serve, curl, python3.
# Uso: ./scripts/smoke-payments.sh
set -euo pipefail

API="${SUPABASE_URL:-http://127.0.0.1:54321}"
DB="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SECRET="${MOCK_WEBHOOK_SECRET:-mock-secret-local}"
PHONE="${PHONE:-+50490000005}"   # Carlos Mejía (cliente de seed)
OTP="${OTP:-123456}"

ANON="${SUPABASE_ANON_KEY:-$(npx supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY="\(.*\)"/\1/p')}"
[ -n "$ANON" ] || { echo "No se pudo obtener ANON_KEY (¿supabase start?)"; exit 1; }

say() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
jqpy() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

say "1. Login por OTP ($PHONE / $OTP)"
curl -sf -X POST "$API/auth/v1/otp" -H "apikey: $ANON" -H "Content-Type: application/json" -d "{\"phone\":\"$PHONE\"}" >/dev/null
JWT=$(curl -sf -X POST "$API/auth/v1/verify" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"token\":\"$OTP\",\"type\":\"sms\"}" | jqpy "d['access_token']")
echo "   JWT ok (${#JWT} chars)"

say "2. Feed de ofertas"
OFFER=$(curl -sf "$API/rest/v1/offer_feed?select=id,merchant_name,price_hnl,quantity_available&order=pickup_start" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT" | tee /dev/stderr | jqpy "d[0]['id']")
echo; echo "   oferta elegida: $OFFER"

say "3. reserve_order (1 bolsa)"
ORDER_JSON=$(curl -sf -X POST "$API/rest/v1/rpc/reserve_order" -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" -d "{\"p_offer\":\"$OFFER\",\"p_quantity\":1}")
ORDER=$(echo "$ORDER_JSON" | jqpy "d['id']")
echo "$ORDER_JSON" | jqpy "'   pedido', d['id'], d['status'], 'total', d['total_hnl'], 'codigo', d['pickup_code']"

say "4. create-payment"
CP=$(curl -sf -X POST "$API/functions/v1/create-payment" -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" -d "{\"orderId\":\"$ORDER\",\"returnUrl\":\"too2go://pedido/$ORDER\"}")
echo "   $CP"
CHECKOUT=$(echo "$CP" | jqpy "d['checkoutUrl']")

say "5. Página de checkout mock"
HTML=$(curl -sf "$CHECKOUT")
echo "$HTML" | grep -q 'id="pay"' && echo "   página OK (botones Pagar/Fallar presentes)"

sign() { python3 -c "import hmac,hashlib,sys; print(hmac.new(sys.argv[1].encode(), sys.argv[2].encode(), hashlib.sha256).hexdigest())" "$SECRET" "$1"; }
BODY_FAIL="{\"provider\":\"mock\",\"providerPaymentId\":\"MOCK-$ORDER\",\"orderId\":\"$ORDER\",\"status\":\"failed\"}"
BODY_PAID="{\"provider\":\"mock\",\"providerPaymentId\":\"MOCK-$ORDER\",\"orderId\":\"$ORDER\",\"status\":\"paid\"}"

say "6. Webhook con firma inválida (debe dar 401)"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" -X POST "$API/functions/v1/payment-webhook" -H "Content-Type: application/json" -H "x-mock-signature: deadbeef" -d "$BODY_PAID"

say "7. Webhook 'Fallar' (pedido sigue pendiente)"
curl -sf -X POST "$API/functions/v1/payment-webhook" -H "Content-Type: application/json" -H "x-mock-signature: $(sign "$BODY_FAIL")" -d "$BODY_FAIL"; echo

say "8. Webhook 'Pagar'"
curl -sf -X POST "$API/functions/v1/payment-webhook" -H "Content-Type: application/json" -H "x-mock-signature: $(sign "$BODY_PAID")" -d "$BODY_PAID"; echo

say "9. Webhook 'Pagar' repetido (idempotente)"
curl -sf -X POST "$API/functions/v1/payment-webhook" -H "Content-Type: application/json" -H "x-mock-signature: $(sign "$BODY_PAID")" -d "$BODY_PAID"; echo

say "10. create-payment sobre pedido ya pagado (debe dar 409)"
curl -s -o /dev/null -w "   HTTP %{http_code}\n" -X POST "$API/functions/v1/create-payment" -H "apikey: $ANON" -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" -d "{\"orderId\":\"$ORDER\"}"

say "11. Estado final en la base"
psql "$DB" -c "select id, status, payment_provider, payment_ref, total_hnl from public.orders where id = '$ORDER'" \
        -c "select from_status, to_status from public.order_events where order_id = '$ORDER' order by id"

echo; echo "✅ Flujo de pago mock OK"
