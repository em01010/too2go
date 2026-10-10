// POST /functions/v1/create-payment  (requiere JWT del cliente)
// Body: { orderId: string, returnUrl?: string }
// Crea la sesión de pago para un pedido en pending_payment y devuelve la URL del checkout.
import { corsHeaders, error, functionsBaseUrl, json } from '../_shared/http.ts';
import { getPaymentProvider } from '../_shared/payments/index.ts';
import type { CreatePaymentRequest, CreatePaymentResponse } from '../_shared/payments/types.ts';
import { getUser, SupabaseHttpError, userClient } from '../_shared/supabase.ts';

interface OrderRow {
  id: string;
  status: string;
  total_hnl: number;
  reservation_expires_at: string | null;
  customer_id: string;
  merchants: { name: string } | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return error('method_not_allowed', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return error('not_authenticated', 401);

  let body: Partial<CreatePaymentRequest>;
  try {
    body = (await req.json()) as Partial<CreatePaymentRequest>;
  } catch {
    return error('invalid_json', 400);
  }
  if (!body.orderId || typeof body.orderId !== 'string') return error('order_id_required', 400);
  if (body.returnUrl !== undefined && typeof body.returnUrl !== 'string') {
    return error('invalid_return_url', 400);
  }

  const user = await getUser(authHeader);
  if (!user) return error('not_authenticated', 401);

  // RLS garantiza que solo el dueño del pedido (o el comercio/admin) lo puede leer.
  let order: OrderRow | null;
  try {
    order = await userClient(authHeader).selectOne<OrderRow>(
      'orders',
      `select=id,status,total_hnl,reservation_expires_at,customer_id,merchants(name)&id=eq.${
        encodeURIComponent(body.orderId)
      }`,
    );
  } catch (e) {
    if (e instanceof SupabaseHttpError) return error('db_error', 500, e.message);
    throw e;
  }

  if (!order || order.customer_id !== user.id) return error('order_not_found', 404);
  if (order.status !== 'pending_payment') return error('invalid_state', 409, order.status);
  if (order.reservation_expires_at && new Date(order.reservation_expires_at) <= new Date()) {
    return error('reservation_expired', 409);
  }

  const provider = getPaymentProvider();
  const session = await provider.createCheckout(
    {
      id: order.id,
      totalHnl: Number(order.total_hnl),
      merchantName: order.merchants?.name ?? '',
      customerPhone: user.phone,
      expiresAt: order.reservation_expires_at,
    },
    {
      functionsBaseUrl: functionsBaseUrl(req),
      ...(body.returnUrl ? { returnUrl: body.returnUrl } : {}),
    },
  );

  const res: CreatePaymentResponse = {
    checkoutUrl: session.checkoutUrl,
    provider: provider.name,
    providerPaymentId: session.providerPaymentId,
    amountHnl: Number(order.total_hnl),
  };
  return json(res);
});
