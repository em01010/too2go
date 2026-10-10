import { formatLempiras, t } from '@too2go/shared';
import { useMemo } from 'react';

import { Loading, Page, Stat } from '@/components/ui';
import {
  useAdminCustomerCount,
  useAdminMerchants,
  useAdminOffers,
  useAdminOrders,
} from '@/lib/adminQueries';
import { fechaCortaHN, hoyHN, rangoDiaHN, sumarDias } from '@/lib/dates';

const PAGADOS = new Set(['paid', 'picked_up', 'no_show']);

export function AdminMetricas() {
  const hoy = rangoDiaHN();
  const hace30 = rangoDiaHN(sumarDias(hoyHN(), -30)).desde;
  const orders = useAdminOrders(hace30);
  const offers = useAdminOffers(hace30);
  const merchants = useAdminMerchants();
  const customers = useAdminCustomerCount();

  const m = useMemo(() => {
    const os = orders.data ?? [];
    const pagadosHoy = os.filter(
      (o) => PAGADOS.has(o.status) && o.paid_at && o.paid_at >= hoy.desde && o.paid_at < hoy.hasta,
    );
    const ofertasHoy = (offers.data ?? []).filter(
      (o) => o.pickup_start >= hoy.desde && o.pickup_start < hoy.hasta,
    );
    const dias = Array.from({ length: 7 }, (_, i) => {
      const date = sumarDias(hoyHN(), i - 6);
      const r = rangoDiaHN(date);
      const n = os.filter(
        (o) => PAGADOS.has(o.status) && o.paid_at && o.paid_at >= r.desde && o.paid_at < r.hasta,
      ).length;
      return { label: fechaCortaHN(date + 'T12:00:00-06:00'), n };
    });
    return {
      bolsasHoy: ofertasHoy.reduce((s, o) => s + o.quantity_total, 0),
      pedidosHoy: pagadosHoy.length,
      ventasHoy: pagadosHoy.reduce((s, o) => s + Number(o.total_hnl), 0),
      comisionHoy: pagadosHoy.reduce((s, o) => s + Number(o.commission_hnl), 0),
      recogidas30: os.filter((o) => o.status === 'picked_up').length,
      noShow30: os.filter((o) => o.status === 'no_show').length,
      sobrante30: (offers.data ?? [])
        .filter((o) => o.status === 'closed')
        .reduce((s, o) => s + (o.quantity_unsold ?? 0), 0),
      dias,
      max: Math.max(1, ...dias.map((d) => d.n)),
    };
  }, [orders.data, offers.data, hoy.desde, hoy.hasta]);

  const loading = orders.isLoading || offers.isLoading || merchants.isLoading;

  return (
    <Page title={t.admin.metricas.titulo}>
      {loading ? <Loading /> : null}
      <div className="grid mb">
        <Stat label={t.admin.metricas.bolsasHoy} value={m.bolsasHoy} />
        <Stat label={t.admin.metricas.pedidosHoy} value={m.pedidosHoy} tone="primary" />
        <Stat label={t.admin.metricas.ventasHoy} value={formatLempiras(m.ventasHoy)} />
        <Stat
          label={t.admin.metricas.comisionHoy}
          value={formatLempiras(m.comisionHoy)}
          tone="accent"
        />
        <Stat
          label={t.admin.metricas.comerciosActivos}
          value={(merchants.data ?? []).filter((x) => x.status === 'active').length}
        />
        <Stat label={t.admin.metricas.clientes} value={customers.data ?? 0} />
        <Stat label={t.admin.metricas.recogidas30} value={m.recogidas30} />
        <Stat label={t.admin.metricas.noShow30} value={m.noShow30} />
        <Stat label={t.admin.metricas.sobrante30} value={m.sobrante30} />
      </div>
      <div className="card">
        <h2>{t.admin.metricas.ultimos7}</h2>
        <p className="muted">{t.admin.metricas.pedidosHoy}</p>
        <div className="bars">
          {m.dias.map((d) => (
            <div key={d.label} className="bar" title={`${d.label}: ${d.n}`}>
              <span>{d.n}</span>
              <i style={{ height: `${(d.n / m.max) * 100}%` }} />
              <span>{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
