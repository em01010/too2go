import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatLempiras, t } from '@too2go/shared';
import { useState } from 'react';

import { Empty, ErrorMsg, Loading, Page, useToast } from '@/components/ui';
import { adminKeys, useAdminPayouts } from '@/lib/adminQueries';
import { fechaCortaHN, lunesDeEstaSemanaHN, sumarDias } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

export function AdminLiquidaciones() {
  const payouts = useAdminPayouts();
  const qc = useQueryClient();
  const { toast, show } = useToast();
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const invalidate = () => void qc.invalidateQueries({ queryKey: adminKeys.payouts });

  const generate = useMutation({
    mutationFn: async () => {
      const lunes = lunesDeEstaSemanaHN();
      const { data, error: err } = await supabase.rpc('admin_generate_payouts', {
        p_start: sumarDias(lunes, -7),
        p_end: sumarDias(lunes, -1),
      });
      if (err) throw err;
      return data;
    },
    onSuccess: (n) => {
      invalidate();
      show(t.admin.liquidaciones.generadas(n));
    },
    onError: () => setError(t.comun.errorGenerico),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase
        .from('payouts')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          reference: refs[id]?.trim() || null,
        })
        .eq('id', id);
      if (err) throw err;
    },
    onSuccess: invalidate,
    onError: () => setError(t.comun.errorGenerico),
  });

  return (
    <Page
      title={t.admin.liquidaciones.titulo}
      actions={
        <button className="btn" disabled={generate.isPending} onClick={() => generate.mutate()}>
          {t.admin.liquidaciones.generar}
        </button>
      }
    >
      {toast}
      <ErrorMsg>{error}</ErrorMsg>
      {payouts.isLoading ? <Loading /> : null}
      {payouts.data?.length === 0 ? <Empty>{t.admin.liquidaciones.vacio}</Empty> : null}
      {payouts.data && payouts.data.length > 0 ? (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.admin.pedidos.comercio}</th>
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
                  <td>{p.merchants?.name}</td>
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
                  <td>
                    {p.status === 'paid' ? (
                      (p.reference ?? '—')
                    ) : (
                      <div className="row">
                        <input
                          placeholder={t.admin.liquidaciones.referencia}
                          value={refs[p.id] ?? ''}
                          onChange={(e) => setRefs({ ...refs, [p.id]: e.target.value })}
                          style={{ width: 160 }}
                        />
                        <button
                          className="btn sm"
                          disabled={markPaid.isPending}
                          onClick={() => markPaid.mutate(p.id)}
                        >
                          {t.admin.liquidaciones.marcarPagada}
                        </button>
                      </div>
                    )}
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
