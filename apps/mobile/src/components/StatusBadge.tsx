import { t } from '@too2go/shared';
import type { OrderStatus } from '@too2go/shared';

import { Pill } from '@/components/ui';

const tones: Record<OrderStatus, 'neutral' | 'accent' | 'success' | 'danger' | 'primary'> = {
  pending_payment: 'accent',
  paid: 'primary',
  picked_up: 'success',
  no_show: 'danger',
  cancelled_by_customer: 'neutral',
  cancelled_by_merchant: 'danger',
  expired: 'neutral',
  refunded: 'neutral',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Pill tone={tones[status]}>{t.pedido.estados[status] ?? status}</Pill>;
}
