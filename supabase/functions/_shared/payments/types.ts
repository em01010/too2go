// Espejo del contrato en packages/shared/src/types/payments.ts.
// Las edge functions corren en Deno y se despliegan solas, por eso no importan del monorepo.

export type PaymentProviderName = 'mock';

export interface CreatePaymentRequest {
  orderId: string;
  /** URL a la que vuelve el cliente al terminar (deep link de la app). */
  returnUrl?: string;
}

export interface CreatePaymentResponse {
  checkoutUrl: string;
  provider: PaymentProviderName;
  providerPaymentId: string;
  amountHnl: number;
}

export type PaymentWebhookStatus = 'paid' | 'failed';

export interface PaymentWebhookPayload {
  provider: PaymentProviderName;
  providerPaymentId: string;
  orderId: string;
  status: PaymentWebhookStatus;
}

/** Datos mínimos del pedido que necesita cualquier proveedor para cobrar. */
export interface PaymentOrder {
  id: string;
  totalHnl: number;
  merchantName: string;
  customerPhone: string | null;
  /** Hasta cuándo es válida la reserva (ISO). */
  expiresAt: string | null;
}
