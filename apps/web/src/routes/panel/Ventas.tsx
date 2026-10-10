import { formatLempiras, t } from '@too2go/shared';
import { useMemo } from 'react';

import { Empty, Loading, OrderStatusPill, Page, Stat } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fechaCortaHN, fechaHoraHN, lunesDeEstaSemanaHN, rangoDiaHN } from '@/lib/dates';
import { useMerchantOrders, usePayouts } from '@/lib/queries';

const LIQUIDABLES = new Set(['picked_up', 'no_show']);

export function Ventas() {
  const { merchant } = useAuth();
  const orders = useMerchantOrders(merchant?.id);
  const payouts = usePayouts(merchant?.id);
  const semanaDesde = rangoDiaHN(lunesDeEstaSemanaHN()).desde;

  const semana = useMemo(() => {
    const list = (orders.data ?? []).filter(
      (o) => LIQUIDABLES.has(o.status) && o.paid_at && o.paid_at >= semanaDesde,
    );
    return {
      pedidos: list.length,
      bruto: list.reduce((s, o) => s + Number(o.total_hnl), 0),
      comision: list.reduce((s, o) => s + Number(o.commission_hnl), 0),
      neto: list.reduce((s, o) => s + Number(o.merchant_net_hnl), 0),
    };
  }, [orders.data, semanaDesde]);

  const pct = `${Math.round(Number(merchant?.commission_rate ?? 0) * 100)}%`;

  return (
    <Page title={t.panel.ventas.titulo} subtitle={t.panel.ventas.comisionNota(pct)}>
      <h2>{t.panel.ventas.resumenSemana}</h2>
      <div className="grid mb">
        <Stat label={t.panel.ventas.pedidos} value={semana.pedidos} />
        <Stat label={t.panel.ventas.bruto} value={formatLempiras(semana.bruto)} />
        <Stat
          label={t.panel.ventas.comision}
          value={formatLempiras(semana.comision)}
          tone="accent"
        />
        <Stat label={t.panel.ventas.neto} value={formatLempiras(semana.neto)} tone="primary" />
      </div>

      <h2>{t.panel.ventas.liquidaciones}</h2>
      {payouts.isLoading ? <Loading /> : null}
      {payouts.data?.length === 0 ? <Empty>{t.panel.ventas.sinLiquidaciones}</Empty> : null}
      {payouts.data && payouts.data.length > 0 ? (
        <div className="card table-wrap mb">
          <table>
            <thead>
              <tr>
                <th>{t.panel.ventas.periodo}</th>
                <th>{t.panel.ventas.bruto}</th>
                <th>{t.panel.ventas.comision}</th>
                <th>{t.panel.ventas.neto}</th>
                <th>{t.panel.ventas.estado}</th>
                <th>{t.panel.ventas.referencia}</th>
              </tr>
            </thead>
            <tbody>
              {payouts.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    {fechaCortaHN(p.period_start + 'T12:00:00-06:00')} –{' '}
                    {fechaCortaHN(p.period_end + 'T12:00:00-06:00')}
                  </td>
                  <td>{formatLempiras(p.gross_hnl)}</td>
                  <td>{formatLempiras(p.commission_hnl)}</td>
                  <td className="price">{formatLempiras(p.net_hnl)}</td>
                  <td>
                    <span
                      className={`pill ${p.status === 'paid' ? 'success' : p.status === 'failed' ? 'danger' : 'accent'}`}
                    >
                      {t.panel.ventas.estados[p.status]}
                    </span>
                  </td>
                  <td>{p.reference ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h2>{t.panel.ventas.pedidos}</h2>
      {orders.isLoading ? <Loading /> : null}
      {orders.data && orders.data.length > 0 ? (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admin.pedidos.fecha}</th>
                <th>{t.panel.hoy.cliente}</th>
                <th>{t.panel.hoy.cantidad}</th>
                <th>{t.panel.hoy.total}</th>
                <th>{t.panel.ventas.neto}</th>
                <th>{t.panel.hoy.estado}</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.slice(0, 100).map((o) => (
                <tr key={o.id}>
                  <td>{fechaHoraHN(o.created_at)}</td>
                  <td>{o.customer_name ?? '—'}</td>
                  <td>{o.quantity}</td>
                  <td>{formatLempiras(o.total_hnl)}</td>
                  <td>{formatLempiras(o.merchant_net_hnl)}</td>
                  <td>
                    <OrderStatusPill status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !orders.isLoading && <Empty>{t.panel.hoy.sinPedidos}</Empty>
      )}
    </Page>
  );
}
