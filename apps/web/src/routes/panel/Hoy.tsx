import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatFranja, formatLempiras, t } from '@too2go/shared';
import type { Offer } from '@too2go/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { Empty, ErrorMsg, Loading, OrderStatusPill, Page, Stat, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { rangoDiaHN } from '@/lib/dates';
import { useMerchantOffers, useMerchantOrders, type OrderSummary } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

export function Hoy() {
  const { merchant } = useAuth();
  const { desde } = rangoDiaHN();
  const offers = useMerchantOffers(merchant?.id, desde);
  const orders = useMerchantOrders(merchant?.id, desde);

  const byOffer = useMemo(() => {
    const map = new Map<string, OrderSummary[]>();
    for (const o of orders.data ?? []) {
      const list = map.get(o.offer_id) ?? [];
      list.push(o);
      map.set(o.offer_id, list);
    }
    return map;
  }, [orders.data]);

  const totals = useMemo(() => {
    const all = orders.data ?? [];
    const paid = all.filter((o) => o.status === 'paid');
    const picked = all.filter((o) => o.status === 'picked_up');
    return {
      publicadas: (offers.data ?? [])
        .filter((o) => o.status === 'published')
        .reduce((s, o) => s + o.quantity_total, 0),
      reservadas: (offers.data ?? []).reduce((s, o) => s + o.quantity_reserved, 0),
      porRecoger: paid.reduce((s, o) => s + o.quantity, 0),
      recogidas: picked.reduce((s, o) => s + o.quantity, 0),
    };
  }, [offers.data, orders.data]);

  if (!merchant) return null;
  if (merchant.status === 'pending') return <Empty>{t.panel.comercioPendiente}</Empty>;
  if (merchant.status === 'suspended') return <Empty>{t.panel.comercioSuspendido}</Empty>;

  return (
    <Page
      title={t.panel.hoy.titulo}
      subtitle={merchant.name}
      actions={
        <Link className="btn" to="/panel/publicar">
          {t.panel.hoy.publicarAhora}
        </Link>
      }
    >
      <div className="grid mb">
        <Stat label={t.panel.hoy.publicadas} value={totals.publicadas} />
        <Stat label={t.panel.hoy.reservadas} value={totals.reservadas} tone="accent" />
        <Stat label={t.panel.hoy.pendientesRecoger} value={totals.porRecoger} tone="primary" />
        <Stat label={t.panel.hoy.recogidas} value={totals.recogidas} />
      </div>

      {offers.isLoading ? <Loading /> : null}
      {offers.data?.length === 0 ? <Empty>{t.panel.hoy.sinOfertas}</Empty> : null}
      {(offers.data ?? []).map((offer) => (
        <OfferBlock key={offer.id} offer={offer} orders={byOffer.get(offer.id) ?? []} />
      ))}
    </Page>
  );
}

function OfferBlock({ offer, orders }: { offer: Offer; orders: OrderSummary[] }) {
  const qc = useQueryClient();
  const { toast, show } = useToast();
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const available = offer.quantity_total - offer.quantity_reserved;

  const cancel = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.rpc('cancel_offer_by_merchant', {
        p_offer: offer.id,
        p_reason: reason.trim() || 'Sin sobrante hoy',
      });
      if (err) throw err;
    },
    onSuccess: () => {
      show(t.panel.hoy.cancelada);
      setConfirming(false);
      void qc.invalidateQueries({ queryKey: ['offers'] });
      void qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: () => setError(t.comun.errorGenerico),
  });

  return (
    <div className="card mb">
      {toast}
      <div className="row between">
        <div>
          <h2 style={{ marginBottom: 0 }}>{offer.title}</h2>
          <p className="muted">
            {formatFranja(offer.pickup_start, offer.pickup_end)} ·{' '}
            <span className="price">{formatLempiras(offer.price_hnl)}</span> ·{' '}
            {t.panel.hoy.disponibles}: {available}/{offer.quantity_total}
          </p>
        </div>
        <div className="row">
          <span
            className={`pill ${offer.status === 'published' ? 'success' : offer.status === 'cancelled' ? 'danger' : ''}`}
          >
            {t.estadosOferta[offer.status] ?? offer.status}
          </span>
          {offer.status === 'published' ? (
            <button className="btn sm ghost" onClick={() => setConfirming((c) => !c)}>
              {t.panel.hoy.cancelarOferta}
            </button>
          ) : null}
        </div>
      </div>
      {confirming ? (
        <div
          className="card pad-sm mt"
          style={{ background: 'var(--color-danger-soft)', border: 0 }}
        >
          <p>{t.panel.hoy.cancelarOfertaConfirm}</p>
          <input
            placeholder={t.panel.hoy.cancelarMotivo}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="row mt">
            <button
              className="btn danger sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {t.comun.confirmar}
            </button>
            <button className="btn ghost sm" onClick={() => setConfirming(false)}>
              {t.comun.cancelar}
            </button>
          </div>
          <ErrorMsg>{error}</ErrorMsg>
        </div>
      ) : null}

      <h3 className="mt">{t.panel.hoy.pedidos}</h3>
      {orders.length === 0 ? (
        <p className="muted">{t.panel.hoy.sinPedidos}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.panel.hoy.cliente}</th>
                <th>{t.panel.hoy.cantidad}</th>
                <th>{t.panel.hoy.codigo}</th>
                <th>{t.panel.hoy.total}</th>
                <th>{t.panel.hoy.estado}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.customer_name ?? '—'}</td>
                  <td>{o.quantity}</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: 2 }}>
                    {o.status === 'paid' ? o.pickup_code : '••••••'}
                  </td>
                  <td>{formatLempiras(o.total_hnl)}</td>
                  <td>
                    <OrderStatusPill status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
