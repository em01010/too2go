import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatLempiras, t } from '@too2go/shared';
import type { OrderStatus } from '@too2go/shared';
import { useState } from 'react';

import { Empty, Loading, OrderStatusPill, Page } from '@/components/ui';
import { adminKeys, useAdminOrders } from '@/lib/adminQueries';
import { fechaHoraHN } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

const ESTADOS = Object.keys(t.pedido.estados) as OrderStatus[];

export function AdminPedidos() {
  const orders = useAdminOrders();
  const qc = useQueryClient();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');

  const refund = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').update({ status: 'refunded' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKeys.orders }),
  });

  const list = (orders.data ?? []).filter((o) => {
    if (status && o.status !== status) return false;
    if (search) {
      const s = search.toLowerCase();
      return [o.customer_name, o.customer_phone, o.merchant_name, o.pickup_code, o.id].some((v) =>
        v?.toLowerCase().includes(s),
      );
    }
    return true;
  });

  return (
    <Page
      title={t.admin.pedidos.titulo}
      actions={
        <>
          <input
            placeholder={t.comun.buscar}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
            style={{ width: 220 }}
          >
            <option value="">{t.comun.todos}</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {t.pedido.estados[s]}
              </option>
            ))}
          </select>
        </>
      }
    >
      {orders.isLoading ? <Loading /> : null}
      {!orders.isLoading && list.length === 0 ? <Empty>{t.admin.pedidos.vacio}</Empty> : null}
      {list.length > 0 ? (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admin.pedidos.fecha}</th>
                <th>{t.admin.pedidos.cliente}</th>
                <th>{t.admin.pedidos.comercio}</th>
                <th>{t.panel.hoy.cantidad}</th>
                <th>{t.admin.pedidos.total}</th>
                <th>{t.panel.hoy.estado}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td>{fechaHoraHN(o.created_at)}</td>
                  <td>
                    {o.customer_name ?? '—'}
                    <div className="muted small">{o.customer_phone ?? ''}</div>
                  </td>
                  <td>{o.merchant_name}</td>
                  <td>{o.quantity}</td>
                  <td>{formatLempiras(o.total_hnl)}</td>
                  <td>
                    <OrderStatusPill status={o.status} />
                  </td>
                  <td className="right">
                    {['paid', 'picked_up', 'no_show', 'cancelled_by_merchant'].includes(
                      o.status,
                    ) ? (
                      <button
                        className="btn ghost sm"
                        onClick={() => {
                          if (window.confirm(t.admin.pedidos.reembolsadoConfirm))
                            refund.mutate(o.id);
                        }}
                      >
                        {t.admin.pedidos.marcarReembolsado}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Page>
  );
}
