import type { CheckoutSession, CreateCheckoutOptions, PaymentProvider } from './provider.ts';
import { WebhookVerificationError } from './provider.ts';
import type { PaymentOrder, PaymentWebhookPayload, PaymentWebhookStatus } from './types.ts';

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Pasarela simulada para desarrollo y demos.
 * - El checkout es una página HTML servida por la función `mock-checkout`.
 * - El webhook es un POST JSON firmado con HMAC-SHA256 en el header `x-mock-signature`.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock' as const;

  constructor(private readonly secret: string) {}

  static providerPaymentId(orderId: string): string {
    return `MOCK-${orderId}`;
  }

  /** Firma usada en la URL del checkout para que no se pueda abrir con cualquier pedido. */
  signCheckout(orderId: string): Promise<string> {
    return hmacHex(this.secret, `checkout:${orderId}`);
  }

  async verifyCheckoutSignature(orderId: string, sig: string): Promise<boolean> {
    return timingSafeEqual(await this.signCheckout(orderId), sig);
  }

  async createCheckout(order: PaymentOrder, opts: CreateCheckoutOptions): Promise<CheckoutSession> {
    const providerPaymentId = MockPaymentProvider.providerPaymentId(order.id);
    const url = new URL(`${opts.functionsBaseUrl}/mock-checkout`);
    url.searchParams.set('order', order.id);
    url.searchParams.set('sig', await this.signCheckout(order.id));
    if (opts.returnUrl) url.searchParams.set('return_url', opts.returnUrl);
    return { checkoutUrl: url.toString(), providerPaymentId };
  }

  /** Construye el cuerpo y la firma del webhook (lo usa la página de checkout). */
  async buildWebhook(
    orderId: string,
    status: PaymentWebhookStatus,
  ): Promise<{ body: string; signature: string }> {
    const payload: PaymentWebhookPayload = {
      provider: 'mock',
      providerPaymentId: MockPaymentProvider.providerPaymentId(orderId),
      orderId,
      status,
    };
    const body = JSON.stringify(payload);
    return { body, signature: await hmacHex(this.secret, body) };
  }

  async parseWebhook(req: Request): Promise<PaymentWebhookPayload> {
    const signature = req.headers.get('x-mock-signature') ?? '';
    const body = await req.text();
    const expected = await hmacHex(this.secret, body);
    if (!signature || !timingSafeEqual(expected, signature)) {
      throw new WebhookVerificationError('Firma inválida');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new WebhookVerificationError('Cuerpo no es JSON');
    }
    if (!isWebhookPayload(parsed)) {
      throw new WebhookVerificationError('Cuerpo con formato inesperado');
    }
    return parsed;
  }

  refund(_providerPaymentId: string, _amountHnl: number): Promise<void> {
    // La pasarela mock no mueve dinero: no hay nada que reembolsar.
    return Promise.resolve();
  }
}

function isWebhookPayload(x: unknown): x is PaymentWebhookPayload {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    o.provider === 'mock' &&
    typeof o.providerPaymentId === 'string' &&
    typeof o.orderId === 'string' &&
    (o.status === 'paid' || o.status === 'failed')
  );
}
