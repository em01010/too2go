import type { OrderStatus } from '@too2go/shared';
import { t } from '@too2go/shared';
import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';

export function Page({
  title,
  subtitle,
  actions,
  children,
}: PropsWithChildren<{ title: string; subtitle?: string | undefined; actions?: ReactNode }>) {
  return (
    <>
      <div className="row between mb">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="row">{actions}</div> : null}
      </div>
      {children}
    </>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: 'accent' | 'primary';
}) {
  return (
    <div className="card stat">
      <span
        className="value"
        style={
          tone === 'accent'
            ? { color: 'var(--color-accent)' }
            : tone === 'primary'
              ? { color: 'var(--color-primary)' }
              : undefined
        }
      >
        {value}
      </span>
      <span className="label">{label}</span>
    </div>
  );
}

export function Loading() {
  return <p className="muted">{t.comun.cargando}</p>;
}

export function Empty({ children }: PropsWithChildren) {
  return (
    <div className="card center">
      <p className="muted">{children}</p>
    </div>
  );
}

export function ErrorMsg({ children }: PropsWithChildren) {
  if (!children) return null;
  return <p className="error">{children}</p>;
}

const statusTone: Record<OrderStatus, string> = {
  pending_payment: 'accent',
  paid: 'primary',
  picked_up: 'success',
  no_show: 'danger',
  cancelled_by_customer: '',
  cancelled_by_merchant: 'danger',
  expired: '',
  refunded: '',
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <span className={`pill ${statusTone[status]}`}>{t.pedido.estados[status] ?? status}</span>;
}

/** Mensaje flotante que desaparece solo. */
export function useToast() {
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(''), 2500);
    return () => clearTimeout(id);
  }, [msg]);
  return { toast: msg ? <div className="toast">{msg}</div> : null, show: setMsg };
}

export function Field({
  label,
  children,
  inline,
}: PropsWithChildren<{ label: string; inline?: boolean }>) {
  return (
    <label className={`field${inline ? ' inline' : ''}`}>
      {inline ? children : null}
      <span>{label}</span>
      {inline ? null : children}
    </label>
  );
}
