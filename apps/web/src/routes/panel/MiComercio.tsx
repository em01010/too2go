import { useMutation } from '@tanstack/react-query';
import { normalizarTelefonoHN, t } from '@too2go/shared';
import type { FoodCategory } from '@too2go/shared';
import { useState, type FormEvent } from 'react';

import { ErrorMsg, Field, Page, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const CATEGORIAS = Object.keys(t.categorias) as FoodCategory[];

/** El comercio edita lo que ven los clientes (no comisión, estado ni datos fiscales: eso es del admin). */
export function MiComercio() {
  const { merchant, reload } = useAuth();
  const { toast, show } = useToast();
  const [form, setForm] = useState(() => ({
    name: merchant?.name ?? '',
    category: merchant?.category ?? 'otro',
    description: merchant?.description ?? '',
    address: merchant?.address ?? '',
    zone: merchant?.zone ?? '',
    whatsapp: merchant?.whatsapp ?? '',
    pickup_instructions: merchant?.pickup_instructions ?? '',
    has_parking: merchant?.has_parking ?? false,
  }));
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: async () => {
      const wa = form.whatsapp.trim() ? normalizarTelefonoHN(form.whatsapp) : null;
      if (form.whatsapp.trim() && !wa) throw new Error('phone');
      const { error: err } = await supabase
        .from('merchants')
        .update({
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim() || null,
          address: form.address.trim(),
          zone: form.zone.trim() || null,
          whatsapp: wa,
          pickup_instructions: form.pickup_instructions.trim() || null,
          has_parking: form.has_parking,
        })
        .eq('id', merchant?.id ?? '');
      if (err) throw err;
    },
    onSuccess: () => {
      show(t.miComercio.guardado);
      void reload();
    },
    onError: (e) =>
      setError(e.message === 'phone' ? t.login.telefonoInvalido : t.comun.errorGenerico),
  });

  if (!merchant) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    save.mutate();
  };

  return (
    <Page title={t.miComercio.titulo} subtitle={t.miComercio.texto}>
      {toast}
      <form className="card" onSubmit={submit} style={{ maxWidth: 720 }}>
        <div className="form-grid">
          <Field label={t.admin.comercios.campos.name}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label={t.admin.comercios.categoria}>
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
        <Field label={t.admin.comercios.campos.description}>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label={t.admin.comercios.campos.address}>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            required
          />
        </Field>
        <div className="form-grid">
          <Field label={t.admin.comercios.campos.zone}>
            <input value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
          </Field>
          <Field label={t.admin.comercios.campos.whatsapp}>
            <input
              inputMode="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t.miComercio.instrucciones}>
          <textarea
            value={form.pickup_instructions}
            onChange={(e) => setForm({ ...form, pickup_instructions: e.target.value })}
            placeholder={t.miComercio.instruccionesPlaceholder}
          />
        </Field>
        <Field label={t.admin.comercios.campos.has_parking} inline>
          <input
            type="checkbox"
            checked={form.has_parking}
            onChange={(e) => setForm({ ...form, has_parking: e.target.checked })}
          />
        </Field>
        <ErrorMsg>{error}</ErrorMsg>
        <button className="btn" disabled={save.isPending}>
          {t.comun.guardar}
        </button>
      </form>
    </Page>
  );
}
