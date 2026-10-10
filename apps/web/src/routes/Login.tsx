import { normalizarTelefonoHN, t } from '@too2go/shared';
import { useState, type FormEvent } from 'react';

import { ErrorMsg, Field } from '@/components/ui';
import { env } from '@/lib/env';
import { useAuth } from '@/lib/auth';

export function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isLocal = /localhost|127\.0\.0\.1|192\.168\./.test(env.supabaseUrl);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const e164 = normalizarTelefonoHN(phoneInput);
    if (!e164) return setError(t.login.telefonoInvalido);
    setBusy(true);
    setError('');
    try {
      await sendOtp(e164);
      setPhone(e164);
      setStep('code');
    } catch {
      setError(t.comun.errorGenerico);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await verifyOtp(phone, code.trim());
    } catch {
      setError(t.login.codigoInvalido);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="brand" style={{ fontSize: 28, padding: 0, marginBottom: 16 }}>
        {t.app.nombre}
      </div>
      <div className="card">
        <h1>{t.panel.login.titulo}</h1>
        <p className="muted">
          {step === 'phone' ? t.panel.login.subtitulo : t.login.codigoSubtitulo(phone)}
        </p>
        {step === 'phone' ? (
          <form onSubmit={(e) => void send(e)}>
            <Field label={t.login.telefono}>
              <input
                autoFocus
                inputMode="tel"
                placeholder={t.login.telefonoPlaceholder}
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </Field>
            <ErrorMsg>{error}</ErrorMsg>
            <button className="btn" disabled={busy} style={{ width: '100%' }}>
              {t.login.enviarCodigo}
            </button>
            {isLocal ? <p className="muted small mt">{t.login.localHint}</p> : null}
          </form>
        ) : (
          <form onSubmit={(e) => void verify(e)}>
            <Field label={t.login.codigoTitulo}>
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder={t.login.codigoPlaceholder}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </Field>
            <ErrorMsg>{error}</ErrorMsg>
            <button
              className="btn"
              disabled={busy || code.trim().length < 6}
              style={{ width: '100%' }}
            >
              {t.login.verificar}
            </button>
            <button type="button" className="btn ghost mt" onClick={() => setStep('phone')}>
              {t.login.cambiarNumero}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
