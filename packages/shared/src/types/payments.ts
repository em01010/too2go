/** Contrato compartido entre la app y las edge functions de pago. */

export type PaymentProviderName = 'mock';

export interface CreatePaymentRequest {
  orderId: string;
}

export interface CreatePaymentResponse {
  /** URL a la que se envía al cliente para pagar. */
  checkoutUrl: string;
  provider: PaymentProviderName;
  /** Referencia del pago en el proveedor. */
  providerPaymentId: string;
  /** Monto cobrado en lempiras. */
  amountHnl: number;
}

export type PaymentWebhookStatus = 'paid' | 'failed';

export interface PaymentWebhookPayload {
  provider: PaymentProviderName;
  providerPaymentId: string;
  orderId: string;
  status: PaymentWebhookStatus;
}
