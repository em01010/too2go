// POST /functions/v1/payment-webhook  (sin JWT: lo llama la pasarela)
// Verifica la firma del proveedor y confirma el pago en Postgres vía confirm_payment (service role).
import { corsHeaders, error, json } from '../_shared/http.ts';
import { getPaymentProvider, WebhookVerificationError } from '../_shared/payments/index.ts';
import type { PaymentWebhookPayload } from '../_shared/payments/types.ts';
import { serviceClient, SupabaseHttpError } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return error('method_not_allowed', 405);

  const provider = getPaymentProvider();
  let payload: PaymentWebhookPayload;
  try {
    payload = await provider.parseWebhook(req);
  } catch (e) {
    if (e instanceof WebhookVerificationError) return error('invalid_signature', 401, e.message);
    throw e;
  }

  if (payload.status === 'failed') {
    // El pedido sigue en pending_payment: el cliente puede reintentar hasta que venza la
    // reserva (10 min). Si no paga, el cron expire_pending_orders libera el inventario.
    console.log(`[payment-webhook] pago fallido pedido=${payload.orderId}`);
    return json({ ok: true, result: 'failed_recorded' });
  }

  try {
    const order = await serviceClient().rpc<{ id: string; status: string }>('confirm_payment', {
      p_order: payload.orderId,
      p_provider: payload.provider,
      p_ref: payload.providerPaymentId,
    });
    return json({ ok: true, result: 'paid', orderId: order.id, status: order.status });
  } catch (e) {
    if (!(e instanceof SupabaseHttpError)) throw e;
    const msg = e.message;
    if (msg.startsWith('invalid_state')) {
      // Pago tardío (la reserva ya expiró o el pedido fue cancelado): hay que devolver el dinero.
      console.warn(`[payment-webhook] pago tardío pedido=${payload.orderId} estado=${msg}`);
      await provider.refund(payload.providerPaymentId, 0);
      return json({ ok: true, result: 'late_payment_refunded', detail: msg });
    }
    if (msg.includes('order_not_found')) return error('order_not_found', 404);
    console.error('[payment-webhook] error confirm_payment', e);
    return error('db_error', 500, msg);
  }
});
