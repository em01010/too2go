import { useMutation } from '@tanstack/react-query';
import { formatLempiras, t } from '@too2go/shared';
import type { Order } from '@too2go/shared';
import { useCallback, useState, type FormEvent } from 'react';

import { QrScanner } from '@/components/QrScanner';
import { ErrorMsg, Page } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { rangoDiaHN } from '@/lib/dates';
import { rpcErrorCode, supabase } from '@/lib/supabase';

interface Result {
  order: Order;
  customerName: string;
}

export function Validar() {
  const { merchant } = useAuth();
  const [code, setCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const redeem = useMutation({
    mutationFn: async (input: { offerId?: string | undefined; code: string }): Promise<Result> => {
      let offerId = input.offerId;
      // Sin QR solo tenemos el código: buscamos el pedido pagado de hoy con ese código.
      if (!offerId) {
        const { desde } = rangoDiaHN();
        const { data } = await supabase
          .from('order_summaries')
          .select('offer_id, customer_name, status')
          .eq('merchant_id', merchant?.id ?? '')
          .eq('pickup_code', input.code)
          .gte('pickup_start', desde)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!data?.offer_id) throw new Error('code_not_found');
        offerId = data.offer_id;
      }
      const { data: order, error: err } = await supabase.rpc('redeem_pickup_code', {
        p_offer: offerId,
        p_code: input.code,
      });
      if (err) throw err;
      const { data: summary } = await supabase
        .from('order_summaries')
        .select('customer_name')
        .eq('id', order.id)
        .maybeSingle();
      return { order, customerName: summary?.customer_name ?? '' };
    },
    onSuccess: (r) => {
      setResult(r);
      setError('');
      setCode('');
      setScanning(false);
    },
    onError: (e) => {
      const key = rpcErrorCode(e);
      setResult(null);
      setError(t.panel.validar.errores[key] ?? t.comun.errorGenerico);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) return;
    redeem.mutate({ code: clean });
  };

  const onScan = useCallback(
    (text: string) => {
      // Formato del QR de la app: too2go:<offerId>:<codigo>
      const m = /^too2go:([0-9a-f-]{36}):(\d{6})$/i.exec(text.trim());
      if (m) redeem.mutate({ offerId: m[1], code: m[2] ?? '' });
      else setError(t.panel.validar.errores.code_not_found ?? '');
      setScanning(false);
    },
    [redeem],
  );
  const onCamError = useCallback(() => {
    setScanning(false);
    setError(t.panel.validar.camaraError);
  }, []);

  return (
    <Page title={t.panel.validar.titulo} subtitle={t.panel.validar.instruccion}>
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <label className="field">
            <span>{t.panel.validar.codigo}</span>
            <input
              className="big"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
            />
          </label>
          <button
            className="btn"
            style={{ width: '100%' }}
            disabled={redeem.isPending || code.replace(/\D/g, '').length !== 6}
          >
            {t.panel.validar.validar}
          </button>
          <button
            type="button"
            className="btn secondary mt"
            style={{ width: '100%' }}
            onClick={() => setScanning((s) => !s)}
          >
            {scanning ? t.panel.validar.detenerEscaner : t.panel.validar.escanear}
          </button>
          {scanning ? (
            <div className="mt">
              <QrScanner onResult={onScan} onError={onCamError} />
            </div>
          ) : null}
          <ErrorMsg>{error}</ErrorMsg>
        </form>

        {result ? (
          <div
            className="card"
            style={{ background: 'var(--color-primary-soft)', borderColor: 'var(--color-primary)' }}
          >
            <h2 className="ok">{t.panel.validar.exito}</h2>
            <p style={{ fontSize: 20 }}>
              {t.panel.validar.entregar(
                result.order.quantity,
                result.customerName || t.panel.hoy.cliente,
              )}
            </p>
            <p className="muted">
              {t.panel.hoy.codigo} {result.order.pickup_code} ·{' '}
              {formatLempiras(result.order.total_hnl)}
            </p>
          </div>
        ) : null}
      </div>
    </Page>
  );
}
