import { MockPaymentProvider } from './mock.ts';
import type { PaymentProvider } from './provider.ts';

export * from './provider.ts';
export * from './types.ts';
export { MockPaymentProvider };

/**
 * Selecciona el proveedor por variable de entorno. Hoy solo existe `mock`;
 * cuando se integre una pasarela real se agrega acá sin tocar las funciones.
 */
export function getPaymentProvider(): PaymentProvider {
  const name = Deno.env.get('PAYMENT_PROVIDER') ?? 'mock';
  switch (name) {
    case 'mock':
      return getMockProvider();
    default:
      throw new Error(`Proveedor de pago desconocido: ${name}`);
  }
}

export function getMockProvider(): MockPaymentProvider {
  return new MockPaymentProvider(Deno.env.get('MOCK_WEBHOOK_SECRET') ?? 'mock-secret-local');
}
