import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatFranja, t } from '@too2go/shared';
import type { LeftoverDisposition, Offer } from '@too2go/shared';
import { useState } from 'react';

import { Empty, ErrorMsg, Loading, Page, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fechaCortaHN, rangoDiaHN, sumarDias, hoyHN } from '@/lib/dates';
import { useMerchantOffers } from '@/lib/queries';
import { rpcErrorCode, supabase } from '@/lib/supabase';

const OPCIONES: LeftoverDisposition[] = ['kept_by_merchant', 'discarded', 'donated'];

export function Cierre() {
  const { merchant } = useAuth();
  const { desde } = rangoDiaHN(sumarDias(hoyHN(), -14));
  const offers = useMerchantOffers(merchant?.id, desde);
  const closed = (offers.data ?? []).filter((o) => o.status === 'closed');

  return (
    <Page title={t.panel.cierre.titulo} subtitle={t.panel.cierre.texto}>
      {offers.isLoading ? <Loading /> : null}
      {closed.length === 0 && !offers.isLoading ? <Empty>{t.panel.cierre.vacio}</Empty> : null}
      {closed.map((o) => (
        <ClosedOffer key={o.id} offer={o} />
      ))}
    </Page>
  );
}

function ClosedOffer({ offer }: { offer: Offer }) {
  const qc = useQueryClient();
  const { toast, show } = useToast();
  const [error, setError] = useState('');
  const unsold = offer.quantity_unsold ?? 0;

  const set = useMutation({
    mutationFn: async (d: LeftoverDisposition) => {
      const { error: err } = await supabase.rpc('set_leftover_disposition', {
        p_offer: offer.id,
        p_disposition: d,
      });
      if (err) throw err;
    },
    onSuccess: () => {
      show(t.panel.cierre.registrado);
      void qc.invalidateQueries({ queryKey: ['offers'] });
    },
    onError: (e) => {
      setError(
        rpcErrorCode(e) === 'donation_not_enabled'
          ? t.panel.cierre.donacionNoDisponible
          : t.comun.errorGenerico,
      );
    },
  });

  return (
    <div className="card mb">
      {toast}
      <div className="row between">
        <div>
          <h3 style={{ marginBottom: 2 }}>
            {offer.title} · {fechaCortaHN(offer.pickup_start)}
          </h3>
          <p className="muted">
            {formatFranja(offer.pickup_start, offer.pickup_end)} · {offer.quantity_total}{' '}
            {t.comun.bolsas}
          </p>
        </div>
        <span className={`pill ${unsold === 0 ? 'success' : 'accent'}`}>
          {unsold === 0 ? t.panel.cierre.sinSobrante : t.panel.cierre.sobrante(unsold)}
        </span>
      </div>
      {unsold > 0 ? (
        <div className="row mt">
          <span className="muted">{t.panel.cierre.destino}:</span>
          {OPCIONES.map((d) => (
            <button
              key={d}
              className={`btn sm ${offer.leftover_disposition === d ? '' : 'secondary'}`}
              disabled={set.isPending}
              onClick={() => {
                setError('');
                set.mutate(d);
              }}
            >
              {t.panel.cierre.destinos[d]}
            </button>
          ))}
        </div>
      ) : null}
      <ErrorMsg>{error}</ErrorMsg>
    </div>
  );
}
