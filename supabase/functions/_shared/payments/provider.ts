import type { PaymentOrder, PaymentProviderName, PaymentWebhookPayload } from './types.ts';

export interface CheckoutSession {
  checkoutUrl: string;
  providerPaymentId: string;
}

export interface CreateCheckoutOptions {
  /** Base pública de las edge functions, ej. http://192.168.1.10:54321/functions/v1 */
  functionsBaseUrl: string;
  returnUrl?: string;
}

/**
 * Contrato que debe cumplir cualquier pasarela (mock hoy; PixelPay, BAC, etc. después).
 * La lógica de negocio (confirm_payment, expiración, reembolsos) vive en Postgres;
 * el proveedor solo cobra y nos avisa por webhook.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Crea una sesión de pago y devuelve la URL a la que mandar al cliente. */
  createCheckout(order: PaymentOrder, opts: CreateCheckoutOptions): Promise<CheckoutSession>;
  /** Verifica la autenticidad del webhook y lo traduce al formato común. Lanza si es inválido. */
  parseWebhook(req: Request): Promise<PaymentWebhookPayload>;
  /** Reembolsa un pago (cancelación por comercio, queja de calidad). */
  refund(providerPaymentId: string, amountHnl: number): Promise<void>;
}

export class WebhookVerificationError extends Error {
  override readonly name = 'WebhookVerificationError';
}
