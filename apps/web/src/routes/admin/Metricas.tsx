import { formatLempiras, t } from '@too2go/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { Loading, Page, Stat } from '@/components/ui';
import {
  useAdminCustomerCount,
  useAdminMerchants,
  useAdminOffers,
  useAdminOrders,
} from '@/lib/adminQueries';
import { fechaCortaHN, hoyHN, rangoDiaHN, sumarDias } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

const PAGADOS = new Set(['paid', 'picked_up', 'no_show']);

export function AdminMetricas() {
  const hoy = rangoDiaHN();
  const hace30 = rangoDiaHN(sumarDias(hoyHN(), -30)).desde;
  const orders = useAdminOrders(hace30);
  const offers = useAdminOffers(hace30);
  const merchants = useAdminMerchants();
  const customers = useAdminCustomerCount();
  const impact = useQuery({
    queryKey: ['community_impact'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('community_impact');
      if (error) throw error;
      return (
        (data as unknown as { bags_rescued: number; saved_hnl: number; co2e_kg: number }[])[0] ??
        null
      );
    },
  });

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
      {impact.data ? (
        <>
          <h2>{t.admin.metricas.impacto}</h2>
          <div className="grid mb">
            <Stat
              label={t.admin.metricas.bolsasRescatadas}
              value={impact.data.bags_rescued}
              tone="primary"
            />
            <Stat
              label={t.admin.metricas.ahorroClientes}
              value={formatLempiras(impact.data.saved_hnl)}
            />
            <Stat label={t.admin.metricas.co2} value={impact.data.co2e_kg} />
          </div>
        </>
      ) : null}
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
