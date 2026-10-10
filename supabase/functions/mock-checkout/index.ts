// GET /functions/v1/mock-checkout?order=<uuid>&sig=<hmac>&return_url=<deep link>
// Página de pago simulada: botones "Pagar" y "Fallar" que disparan payment-webhook.
import { error, escapeHtml, functionsBaseUrl, html } from '../_shared/http.ts';
import { getMockProvider } from '../_shared/payments/index.ts';
import { serviceClient } from '../_shared/supabase.ts';

interface OrderRow {
  id: string;
  status: string;
  total_hnl: number;
  quantity: number;
  reservation_expires_at: string | null;
  merchants: { name: string } | null;
}

function formatLempiras(n: number): string {
  const [whole = '0', dec = '00'] = n.toFixed(2).split('.');
  return `L ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return error('method_not_allowed', 405);
  const url = new URL(req.url);
  const orderId = url.searchParams.get('order') ?? '';
  const sig = url.searchParams.get('sig') ?? '';
  const returnUrl = url.searchParams.get('return_url') ?? '';

  const provider = getMockProvider();
  if (!orderId || !(await provider.verifyCheckoutSignature(orderId, sig))) {
    return html(page('Enlace inválido', '<p>Este enlace de pago no es válido.</p>'), 400);
  }

  const order = await serviceClient().selectOne<OrderRow>(
    'orders',
    `select=id,status,total_hnl,quantity,reservation_expires_at,merchants(name)&id=eq.${
      encodeURIComponent(orderId)
    }`,
  );

  if (!order) return html(page('Pedido no encontrado', '<p>No encontramos este pedido.</p>'), 404);

  const merchant = order.merchants?.name ?? 'Comercio';
  const expired = order.reservation_expires_at &&
    new Date(order.reservation_expires_at) <= new Date();

  if (order.status !== 'pending_payment' || expired) {
    const msg = order.status === 'paid'
      ? 'Este pedido ya está pagado.'
      : 'La reserva venció o el pedido ya no está pendiente de pago.';
    return html(page('Pago no disponible', `<p>${msg}</p>${backLink(returnUrl)}`));
  }

  const paid = await provider.buildWebhook(order.id, 'paid');
  const failed = await provider.buildWebhook(order.id, 'failed');
  const webhookUrl = `${functionsBaseUrl(req)}/payment-webhook`;

  const body = `
    <p class="muted">Pasarela simulada · ningún cobro es real</p>
    <h2>${escapeHtml(merchant)}</h2>
    <p>${order.quantity} ${order.quantity === 1 ? 'bolsa' : 'bolsas'} sorpresa</p>
    <p class="amount">${formatLempiras(Number(order.total_hnl))}</p>
    <p class="muted">Pedido ${escapeHtml(order.id.slice(0, 8))}</p>
    <div class="actions">
      <button id="pay" class="btn primary">Pagar</button>
      <button id="fail" class="btn danger">Fallar</button>
    </div>
    <p id="status" class="status"></p>
    <script>
      const WEBHOOK = ${JSON.stringify(webhookUrl)};
      const RETURN_URL = ${JSON.stringify(returnUrl)};
      const PAID = ${JSON.stringify(paid)};
      const FAILED = ${JSON.stringify(failed)};
      const statusEl = document.getElementById('status');
      async function send(kind) {
        const w = kind === 'paid' ? PAID : FAILED;
        document.querySelectorAll('button').forEach((b) => (b.disabled = true));
        statusEl.textContent = 'Procesando…';
        try {
          const r = await fetch(WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-mock-signature': w.signature },
            body: w.body,
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || 'error');
          statusEl.textContent =
            kind === 'paid' ? '¡Pago aprobado! Volviendo a la app…' : 'Pago rechazado. Volviendo a la app…';
          statusEl.className = 'status ' + (kind === 'paid' ? 'ok' : 'bad');
          if (RETURN_URL) {
            const u = new URL(RETURN_URL);
            u.searchParams.set('pago', kind === 'paid' ? 'ok' : 'fallo');
            setTimeout(() => (window.location.href = u.toString()), 900);
          }
        } catch (e) {
          statusEl.textContent = 'No se pudo notificar el pago: ' + e.message;
          statusEl.className = 'status bad';
          document.querySelectorAll('button').forEach((b) => (b.disabled = false));
        }
      }
      document.getElementById('pay').onclick = () => send('paid');
      document.getElementById('fail').onclick = () => send('failed');
    </script>
    ${backLink(returnUrl)}`;

  return html(page('Pago simulado · Too2Go', body));
});

function backLink(returnUrl: string): string {
  if (!returnUrl) return '';
  return `<p><a class="back" href="${escapeHtml(returnUrl)}">Volver a Too2Go</a></p>`;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="es-HN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
         background: #f7f8f6; color: #1b1f1d; display: flex; min-height: 100vh;
         align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
  .card { background: #fff; border: 1px solid #e1e6e2; border-radius: 20px; padding: 28px 24px;
          width: 100%; max-width: 380px; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,.06); }
  h1 { font-size: 18px; margin: 0 0 12px; color: #2e7d5b; }
  h2 { font-size: 22px; margin: 8px 0 4px; }
  p { margin: 6px 0; }
  .muted { color: #5f6b65; font-size: 13px; }
  .amount { font-size: 36px; font-weight: 700; color: #d98e04; margin: 12px 0; }
  .actions { display: flex; gap: 12px; margin: 20px 0 8px; }
  .btn { flex: 1; border: 0; border-radius: 12px; padding: 14px; font-size: 16px; font-weight: 600;
         cursor: pointer; color: #fff; }
  .btn:disabled { opacity: .6; cursor: default; }
  .primary { background: #2e7d5b; }
  .danger { background: #c0392b; }
  .status { min-height: 20px; font-size: 14px; }
  .ok { color: #2e7d5b; } .bad { color: #c0392b; }
  .back { color: #2e7d5b; font-weight: 600; text-decoration: none; }
</style>
</head>
<body>
  <main class="card">
    <h1>Too2Go</h1>
    ${body}
  </main>
</body>
</html>`;
}
