# Too2Go

Marketplace de **bolsas sorpresa** con excedentes de comida en Tegucigalpa: panaderías, cafés y
tiendas publican lo que les sobra del día, el cliente lo reserva desde la app, paga en línea y
pasa a recoger con un código. Moneda: lempiras (`L 90.00`). Zona horaria: `America/Tegucigalpa`.

> Nombre y paleta son provisionales. Toda la interfaz está en español hondureño (voseo) y los
> textos viven en un solo archivo: `packages/shared/src/i18n/es-HN.ts`.

## Estructura del monorepo

```
apps/mobile        App del cliente (Expo SDK 57 + expo-router)
apps/web           Panel de comercio y panel admin (Vite + React + react-router)
packages/shared    Tipos generados de la base, formateadores (L 90.00) y textos es-HN
supabase/          Migraciones, seed, config local y edge functions (Deno)
scripts/           Pruebas de humo contra el stack local
```

Flujo de un pedido (todo lo sensible pasa por funciones de Postgres):

```
reserve_order (RPC)  →  pending_payment (reserva 10 min)
create-payment (edge) →  URL del checkout del proveedor
payment-webhook (edge) → confirm_payment (RPC, service role) → paid
redeem_pickup_code (RPC, comercio) → picked_up
cron: expire_pending_orders, close_expired_offers, generate_offers_from_templates, generate_payouts
```

Los pagos usan la interfaz `PaymentProvider` (`supabase/functions/_shared/payments/`). Hoy solo
existe `MockPaymentProvider`: el checkout es una página con los botones **Pagar** y **Fallar** que
disparan el webhook firmado. Para integrar una pasarela real se agrega otra implementación y se
selecciona con la variable `PAYMENT_PROVIDER`.

## Requisitos

- Node 22 y pnpm 10 (`corepack enable`)
- Docker Desktop (para `supabase start`)
- La app **Expo Go** en tu teléfono (Android o iOS), en la misma red Wi‑Fi que tu computadora
- Opcional: Deno 2 para `pnpm functions:check` (también viene como dependencia npm)

## 1. Instalar

```bash
pnpm install
```

## 2. Levantar Supabase local

```bash
pnpm db:start        # supabase start (la primera vez descarga imágenes)
pnpm db:reset        # aplica migraciones + supabase/seed.sql
pnpm db:types        # regenera packages/shared/src/types/database.ts (solo si cambiás el esquema)
```

`supabase start` imprime las credenciales locales. Las que usan las apps son `API URL` y
`anon key` (empieza con `eyJ…`). Studio queda en http://127.0.0.1:54323.

### Usuarios de prueba (seed)

Todos inician sesión con el código OTP **123456** (configurado en `supabase/config.toml`,
no se envía ningún SMS real).

| Teléfono    | Rol                                                       |
| ----------- | --------------------------------------------------------- |
| `9000-0001` | Admin                                                     |
| `9000-0002` | Dueña de **Panadería La Palmira** (Palmira)               |
| `9000-0003` | Dueño de **Café Los Próceres** (Los Próceres)             |
| `9000-0004` | Dueña de **Tienda Express Morazán** (Blvd. Morazán)       |
| `9000-0005` | Cliente Carlos Mejía (tiene un pedido de ayer con reseña) |
| `9000-0006` | Cliente Ana Flores                                        |
| `9999-9999` | Teléfono libre para probar el registro nuevo              |

El seed crea tres ofertas para **hoy**. Si al correr `db:reset` ya pasó la hora de la franja, la
oferta se corre para empezar 90 minutos después, así el feed siempre muestra algo.

## 3. Edge functions (pagos y eliminar cuenta)

```bash
cp supabase/functions/.env.example supabase/functions/.env
pnpm functions:serve   # supabase functions serve --env-file supabase/functions/.env
```

Dejá esta terminal abierta. Verificá el flujo completo de pago por HTTP (login, reserva,
checkout, webhook con firma inválida, fallo, pago, idempotencia):

```bash
pnpm smoke:payments
```

## 4. Panel web (comercio y admin)

```bash
cp apps/web/.env.example apps/web/.env   # pegá la anon key
pnpm dev:web                              # http://127.0.0.1:5173
```

- Entrá con `9000-0002` para ver el panel de **Panadería La Palmira**: Hoy, Validar código
  (input o escáner QR con la cámara), Publicar bolsa, Plantillas, Cierre de sobrante, Ventas.
- Entrá con `9000-0001` para el **admin**: métricas, comercios (aprobar, comisión, miembros),
  pedidos, reseñas y liquidaciones.

## 5. App móvil en tu teléfono con Expo Go

### Atajo: un solo comando

```bash
pnpm dev:phone          # agregá --web para levantar también el panel, --tunnel si el teléfono no ve tu PC
```

Detecta la IP de tu computadora en la Wi‑Fi, levanta Supabase, aplica migraciones y seed,
escribe los `.env` de la app y del panel, deja las edge functions corriendo y arranca Metro con
el QR para Expo Go. Requiere Docker Desktop abierto. En Windows corrélo desde Git Bash o WSL.

### Paso a paso manual

1. Averiguá la IP de tu computadora en la red Wi‑Fi (ej. `192.168.1.10`: `ipconfig` en Windows,
   `ifconfig`/`ip a` en macOS/Linux).
2. Creá `apps/mobile/.env` a partir de `.env.example` usando **esa IP, no localhost**:

   ```
   EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.10:54321
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ…
   EXPO_PUBLIC_GOOGLE_MAPS_KEY=            # opcional en Expo Go
   EXPO_PUBLIC_SUPPORT_WHATSAPP=+50400000000
   ```

3. Arrancá Metro y escaneá el QR con Expo Go (Android) o con la cámara (iOS):

   ```bash
   pnpm dev:mobile
   ```

   Si el teléfono no conecta por la red, probá `pnpm dev:mobile -- --tunnel`.

4. Asegurate de que el firewall de tu computadora permita conexiones entrantes al puerto 54321
   (Supabase) y 8081 (Metro).

### Probar el flujo completo en el teléfono

1. **Onboarding → Login**: ingresá `9000-0006` y el código `123456`.
2. **Descubrir**: lista ordenada por distancia (permití la ubicación) o mapa. Tocá una bolsa.
3. **Detalle → Reservar**: elegí cantidad y reservá. Arranca el contador de 10 minutos.
4. **Checkout → Pagar**: se abre la página de pago simulada en el navegador. Tocá **Pagar**
   (o **Fallar** para probar el reintento). Volvés a la app automáticamente.
5. **Pedido**: ves el código de 6 dígitos y el QR.
6. En el panel web (`9000-0002`, **Validar código**) escribí el código o escaneá el QR del
   teléfono con la cámara de la computadora. El pedido pasa a _Recogido_.
7. En la app, el pedido aparece en **Pedidos** y podés dejar una reseña. En **Perfil** se
   actualiza el ahorro acumulado.
8. **Perfil → Eliminar mi cuenta** borra nombre y teléfono y cierra la cuenta (se bloquea si
   tenés un pedido pendiente de recoger).

Para probar que el cron libera reservas vencidas: reservá, no pagués y esperá; a los 10 minutos
el pedido pasa a _Reserva vencida_ y las bolsas vuelven al inventario.

## Comandos útiles

| Comando                | Qué hace                                                         |
| ---------------------- | ---------------------------------------------------------------- |
| `pnpm typecheck`       | TypeScript estricto en las tres carpetas                         |
| `pnpm lint`            | ESLint con reglas type-checked                                   |
| `pnpm format`          | Prettier                                                         |
| `pnpm functions:check` | `deno check` + `deno lint` + `deno fmt --check` en las functions |
| `pnpm smoke:payments`  | Flujo de pago completo por HTTP contra el stack local            |
| `pnpm build:web`       | Build de producción del panel                                    |
| `pnpm db:stop`         | Apaga el stack de Supabase                                       |

Prueba SQL del flujo de negocio (la que acompaña a la migración inicial), contra el Postgres
local de Supabase y sin seed:

```bash
supabase db reset --no-seed
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/flow_test.sql
supabase db reset   # vuelve a cargar el seed
```

## Base de datos

- `20261010000001_init.sql`: esquema, RLS y lógica de negocio (no se modifica; los cambios van
  en migraciones nuevas).
- `20261010000002_order_summaries.sql`: vista de pedidos con datos de oferta y comercio para la
  app y los paneles.
- `20261010000003_admin_rpcs.sql`: envoltorios admin para generar liquidaciones y ofertas.
- `20261010000004_cron.sql`: tareas de pg_cron (expirar reservas cada minuto, cerrar ofertas
  cada 5 min, ofertas diarias 6:00 am HN, liquidaciones lunes 7:00 am HN).

## Despliegue (resumen)

1. Proyecto en Supabase: `supabase link`, `supabase db push`, `supabase functions deploy`.
   Configurar secrets: `MOCK_WEBHOOK_SECRET` (o las credenciales de la pasarela real) y, en
   Auth, un proveedor de SMS de verdad.
2. Panel web: `pnpm build:web` y servir `apps/web/dist` (Vercel, Netlify, etc.) con las
   variables `VITE_*`.
3. App móvil: `npx eas-cli build` desde `apps/mobile` con las variables `EXPO_PUBLIC_*`.
   `react-native-maps` en Android necesita `EXPO_PUBLIC_GOOGLE_MAPS_KEY` en una build propia.
