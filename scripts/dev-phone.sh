#!/usr/bin/env bash
# Deja todo listo en tu computadora para probar la app en el teléfono con Expo Go:
#   1. Supabase local (Docker) + migraciones + seed
#   2. .env de la app móvil, del panel web y de las functions con tu IP de la Wi‑Fi
#   3. Edge functions sirviendo en segundo plano
#   4. Metro (expo start) en primer plano: escaneá el QR con Expo Go
#
# Uso:  ./scripts/dev-phone.sh [--no-reset] [--tunnel] [--web] [--no-metro]
#   --no-reset  no vuelve a cargar el seed (conserva tus datos)
#   --tunnel    expo start --tunnel (si el teléfono no ve tu computadora en la red)
#   --web       también levanta el panel web en http://127.0.0.1:5173
#   --no-metro  deja todo listo y no arranca Expo (para correr 'pnpm dev:mobile' aparte)
# Variables opcionales: LAN_IP=192.168.1.10 para forzar la IP.
set -euo pipefail
cd "$(dirname "$0")/.."

RESET=1; TUNNEL=""; WEB=0; METRO=1
for a in "$@"; do
  case "$a" in
    --no-reset) RESET=0 ;;
    --tunnel) TUNNEL="--tunnel" ;;
    --web) WEB=1 ;;
    --no-metro) METRO=0 ;;
    *) echo "Opción desconocida: $a"; exit 1 ;;
  esac
done

say() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✖ %s\033[0m\n' "$*"; exit 1; }

command -v docker >/dev/null || die "Falta Docker. Instalá Docker Desktop y volvé a correr esto."
docker info >/dev/null 2>&1 || die "Docker no está corriendo. Abrí Docker Desktop y volvé a intentar."
command -v pnpm >/dev/null || die "Falta pnpm (corré: corepack enable)."

# ---- IP de la computadora en la Wi‑Fi (el teléfono no puede usar localhost)
detect_ip() {
  if [ -n "${LAN_IP:-}" ]; then echo "$LAN_IP"; return; fi
  if command -v ipconfig >/dev/null 2>&1; then           # macOS
    for i in en0 en1 en2; do ip=$(ipconfig getifaddr "$i" 2>/dev/null || true); [ -n "$ip" ] && { echo "$ip"; return; }; done
  fi
  if command -v hostname >/dev/null 2>&1; then            # Linux / WSL
    ip=$(hostname -I 2>/dev/null | awk '{print $1}'); [ -n "$ip" ] && { echo "$ip"; return; }
  fi
  ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}' | head -1)
  [ -n "$ip" ] && { echo "$ip"; return; }
  die "No pude detectar tu IP. Corré: LAN_IP=192.168.x.x ./scripts/dev-phone.sh"
}
IP=$(detect_ip)
say "IP de esta computadora: $IP (el teléfono debe estar en la misma Wi‑Fi)"

[ -d node_modules ] || { say "Instalando dependencias"; pnpm install; }

say "Levantando Supabase local"
npx supabase start >/dev/null 2>&1 || true
STATUS=$(npx supabase status -o env 2>/dev/null) || die "supabase start falló. Corré 'npx supabase start' para ver el error."
ANON=$(echo "$STATUS" | sed -n 's/^ANON_KEY="\(.*\)"/\1/p')
[ -n "$ANON" ] || die "No pude leer la anon key de 'supabase status'."

if [ "$RESET" = 1 ]; then
  say "Aplicando migraciones y seed (ofertas para hoy, usuarios de prueba)"
  npx supabase db reset
fi

say "Escribiendo archivos .env"
cat > apps/mobile/.env <<ENV
EXPO_PUBLIC_SUPABASE_URL=http://$IP:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=$ANON
EXPO_PUBLIC_GOOGLE_MAPS_KEY=${EXPO_PUBLIC_GOOGLE_MAPS_KEY:-}
EXPO_PUBLIC_SUPPORT_WHATSAPP=${SUPPORT_WHATSAPP:-+50400000000}
ENV
cat > apps/web/.env <<ENV
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=$ANON
VITE_GOOGLE_MAPS_KEY=${VITE_GOOGLE_MAPS_KEY:-}
VITE_SUPPORT_WHATSAPP=${SUPPORT_WHATSAPP:-+50400000000}
ENV
[ -f supabase/functions/.env ] || cp supabase/functions/.env.example supabase/functions/.env
echo "   apps/mobile/.env → $IP:54321"

say "Edge functions (log: .dev-functions.log)"
# Si quedó un contenedor de una corrida anterior, se elimina para que arranque limpio.
PROJECT_ID=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
docker rm -f "supabase_edge_runtime_${PROJECT_ID}" >/dev/null 2>&1 || true
npx supabase functions serve --env-file supabase/functions/.env > .dev-functions.log 2>&1 &
FUNCS=$!
PIDS=("$FUNCS")
if [ "$WEB" = 1 ]; then
  say "Panel web en http://127.0.0.1:5173 (log: .dev-web.log)"
  pnpm --filter @too2go/web dev > .dev-web.log 2>&1 &
  PIDS+=("$!")
fi
cleanup() {
  kill "${PIDS[@]}" 2>/dev/null || true
  docker rm -f "supabase_edge_runtime_${PROJECT_ID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# Esperar hasta 40 s a que las functions respondan (401 = el webhook rechazó la firma: está vivo).
FUNCS_OK=0
for _ in $(seq 1 20); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:54321/functions/v1/payment-webhook -H 'Content-Type: application/json' -d '{}' || true)
  if [ "$code" = "401" ]; then FUNCS_OK=1; break; fi
  if ! kill -0 "$FUNCS" 2>/dev/null; then break; fi
  sleep 2
done
if [ "$FUNCS_OK" = 1 ]; then
  echo "   functions OK"
else
  printf '\033[1;31m   ✖ Las edge functions no respondieron. Sin ellas el pago no funciona.\033[0m\n'
  echo "   Mirá .dev-functions.log. Si dice 'exit 137' o 'no longer available', Docker se quedó sin memoria:"
  echo "   Docker Desktop → Settings → Resources → Memory a 6 GB o más y Resource Saver apagado → Apply & restart."
  echo "   Luego, en otra terminal: pnpm functions:serve"
fi

cat <<TXT

Usuarios de prueba (código OTP 123456):
  9000-0006  cliente Ana        9000-0005  cliente Carlos
  9000-0002  Panadería La Palmira (panel web con --web)
  9000-0001  admin

TXT

if [ "$METRO" = 0 ]; then
  say "Listo. Las functions siguen corriendo en segundo plano (pid $FUNCS). Arrancá Expo con: pnpm dev:mobile"
  trap - EXIT
  exit 0
fi

say "Metro / Expo: escaneá el QR con Expo Go (Android) o la cámara (iPhone)"
echo "   Ctrl+C apaga Metro y las functions (Supabase sigue corriendo; 'pnpm db:stop' lo apaga)."
cd apps/mobile
exec npx expo start $TUNNEL
