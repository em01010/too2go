import { useMutation } from '@tanstack/react-query';
import { normalizarTelefonoHN, t } from '@too2go/shared';
import type { FoodCategory } from '@too2go/shared';
import { useState, type FormEvent } from 'react';

import { ErrorMsg, Field } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { rpcErrorCode, supabase } from '@/lib/supabase';

const CATEGORIAS = Object.keys(t.categorias) as FoodCategory[];

/** Formulario de autoregistro: crea el comercio en estado pendiente vía register_merchant. */
export function RegistroComercio() {
  const { profile, reload, signOut } = useAuth();
  const [form, setForm] = useState({
    name: '',
    category: 'panaderia' as FoodCategory,
    address: '',
    zone: '',
    whatsapp: profile?.phone ?? '',
    description: '',
    has_parking: false,
    lat: '',
    lng: '',
  });
  const [geo, setGeo] = useState<'idle' | 'ok' | 'error'>('idle');
  const [error, setError] = useState('');

  const locate = () => {
    if (!navigator.geolocation) return setGeo('error');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setGeo('ok');
      },
      () => setGeo('error'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const register = useMutation({
    mutationFn: async () => {
      const whatsapp = form.whatsapp.trim() ? normalizarTelefonoHN(form.whatsapp) : null;
      if (form.whatsapp.trim() && !whatsapp) throw new Error('invalid_phone');
      const { error: err } = await supabase.rpc('register_merchant', {
        p_name: form.name,
        p_category: form.category,
        p_address: form.address,
        p_zone: form.zone,
        p_lat: Number(form.lat),
        p_lng: Number(form.lng),
        p_description: form.description,
        p_has_parking: form.has_parking,
        ...(whatsapp ? { p_whatsapp: whatsapp } : {}),
      });
      if (err) throw err;
    },
    onSuccess: () => void reload(),
    onError: (e) => {
      const code = rpcErrorCode(e);
      setError(
        code === 'invalid_phone'
          ? t.login.telefonoInvalido
          : (t.panel.registro.errores[code] ?? t.comun.errorGenerico),
      );
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    register.mutate();
  };

  return (
    <div className="login" style={{ maxWidth: 640 }}>
      <div className="row between mb">
        <div className="brand" style={{ fontSize: 28, padding: 0 }}>
          {t.app.nombre}
        </div>
        <button className="btn ghost sm" onClick={() => void signOut()}>
          {t.comun.salir}
        </button>
      </div>
      <form className="card" onSubmit={submit}>
        <h1>{t.panel.registro.formTitulo}</h1>
        <p className="muted mb">{t.panel.registro.subtitulo}</p>

        <div className="form-grid">
          <Field label={t.panel.registro.nombre}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label={t.panel.registro.categoria}>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as FoodCategory })}
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {t.categorias[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t.panel.registro.direccion}>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
            placeholder="Ej. Blvd. Morazán, frente a..."
          />
        </Field>
        <div className="form-grid">
          <Field label={t.panel.registro.zona}>
            <input
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              placeholder="Ej. Palmira"
            />
          </Field>
          <Field label={t.panel.registro.whatsapp}>
            <input
              inputMode="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="9999-9999"
            />
          </Field>
        </div>
        <Field label={t.panel.registro.descripcion}>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label={t.panel.registro.estacionamiento} inline>
          <input
            type="checkbox"
            checked={form.has_parking}
            onChange={(e) => setForm({ ...form, has_parking: e.target.checked })}
          />
        </Field>

        <h3 className="mt">{t.panel.registro.ubicacion}</h3>
        <p className="muted small">{t.panel.registro.ubicacionAyuda}</p>
        <div className="row mb">
          <button type="button" className="btn secondary sm" onClick={locate}>
            {t.panel.registro.usarMiUbicacion}
          </button>
          {geo === 'ok' ? (
            <span className="ok small">{t.panel.registro.ubicacionObtenida}</span>
          ) : null}
          {geo === 'error' ? (
            <span className="error small" style={{ margin: 0 }}>
              {t.panel.registro.ubicacionError}
            </span>
          ) : null}
        </div>
        <div className="form-grid">
          <Field label={t.panel.registro.lat}>
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              required
              placeholder="14.0723"
            />
          </Field>
          <Field label={t.panel.registro.lng}>
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              required
              placeholder="-87.1921"
            />
          </Field>
        </div>

        <ErrorMsg>{error}</ErrorMsg>
        <button className="btn" style={{ width: '100%' }} disabled={register.isPending}>
          {register.isPending ? t.panel.registro.enviando : t.panel.registro.enviar}
        </button>
      </form>
    </div>
  );
}
