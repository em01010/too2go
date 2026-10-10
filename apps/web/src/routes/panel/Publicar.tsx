import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@too2go/shared';
import type { FoodCategory, OfferTemplate } from '@too2go/shared';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';

import { ErrorMsg, Field, Page } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { hoyHN, isoDesdeHN } from '@/lib/dates';
import { useTemplates } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

const CATEGORIAS = Object.keys(t.categorias) as FoodCategory[];
const DIETAS = Object.entries(t.oferta.dietas);

export function Publicar() {
  const { merchant } = useAuth();
  const templates = useTemplates(merchant?.id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: 'Bolsa sorpresa',
    description: '',
    category: merchant?.category ?? 'otro',
    allergens_note: '',
    price_hnl: '',
    original_value_hnl: '',
    quantity_total: '5',
    date: hoyHN(),
    start: '17:00',
    end: '18:00',
    dietary_tags: [] as string[],
  });
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyTemplate = (tpl: OfferTemplate) => {
    setForm((f) => ({
      ...f,
      title: tpl.title,
      description: tpl.description ?? '',
      category: tpl.category,
      price_hnl: String(tpl.price_hnl),
      original_value_hnl: String(tpl.original_value_hnl),
      quantity_total: String(tpl.quantity),
      start: tpl.pickup_start_local.slice(0, 5),
      end: tpl.pickup_end_local.slice(0, 5),
      dietary_tags: tpl.dietary_tags,
    }));
  };

  const publish = useMutation({
    mutationFn: async () => {
      const price = Number(form.price_hnl);
      const original = Number(form.original_value_hnl);
      const qty = Number(form.quantity_total);
      if (!(price > 0) || !(original >= price)) throw new Error('precio');
      if (!(qty >= 1)) throw new Error('cantidad');
      const start = isoDesdeHN(form.date, form.start);
      const end = isoDesdeHN(form.date, form.end);
      if (!(new Date(end) > new Date(start)) || new Date(end) <= new Date())
        throw new Error('horario');
      const { error: err } = await supabase.from('offers').insert({
        merchant_id: merchant?.id ?? '',
        title: form.title.trim() || 'Bolsa sorpresa',
        description: form.description.trim() || null,
        category: form.category,
        allergens_note: form.allergens_note.trim() || null,
        price_hnl: price,
        original_value_hnl: original,
        quantity_total: qty,
        pickup_start: start,
        pickup_end: end,
        dietary_tags: form.dietary_tags,
      });
      if (err) throw err;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['offers'] });
      void navigate('/panel/hoy');
    },
    onError: (e) => {
      const k = e.message as keyof typeof t.panel.publicar.errores;
      setError(t.panel.publicar.errores[k] ?? t.comun.errorGenerico);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    publish.mutate();
  };

  return (
    <Page title={t.panel.publicar.titulo} subtitle={merchant?.name}>
      {templates.data && templates.data.length > 0 ? (
        <div className="row mb">
          <span className="muted">{t.panel.publicar.desdePlantilla}:</span>
          {templates.data.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="btn secondary sm"
              onClick={() => applyTemplate(tpl)}
            >
              {tpl.title}
            </button>
          ))}
        </div>
      ) : null}
      <form className="card" onSubmit={submit}>
        <div className="form-grid">
          <Field label={t.panel.publicar.tituloCampo}>
            <input value={form.title} onChange={set('title')} required />
          </Field>
          <Field label={t.panel.publicar.categoria}>
            <select value={form.category} onChange={set('category')}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {t.categorias[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t.panel.publicar.descripcion}>
          <textarea value={form.description} onChange={set('description')} />
        </Field>
        <p className="muted small" style={{ fontWeight: 600 }}>
          {t.panel.publicar.dietas}
        </p>
        <div className="days mb">
          {DIETAS.map(([key, label]) => {
            const on = form.dietary_tags.includes(key);
            return (
              <label key={key} className={on ? 'on' : ''}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setForm((f) => ({
                      ...f,
                      dietary_tags: on
                        ? f.dietary_tags.filter((x) => x !== key)
                        : [...f.dietary_tags, key],
                    }))
                  }
                />
                {label}
              </label>
            );
          })}
        </div>
        <Field label={t.panel.publicar.alergenos}>
          <input
            value={form.allergens_note}
            onChange={set('allergens_note')}
            placeholder="Puede contener gluten, lácteos…"
          />
        </Field>
        <div className="form-grid">
          <Field label={t.panel.publicar.precio}>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.price_hnl}
              onChange={set('price_hnl')}
              required
            />
          </Field>
          <Field label={t.panel.publicar.valorOriginal}>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.original_value_hnl}
              onChange={set('original_value_hnl')}
              required
            />
          </Field>
          <Field label={t.panel.publicar.cantidad}>
            <input
              type="number"
              min="1"
              max="200"
              value={form.quantity_total}
              onChange={set('quantity_total')}
              required
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label={t.comun.hoy}>
            <input type="date" value={form.date} min={hoyHN()} onChange={set('date')} />
          </Field>
          <Field label={t.panel.publicar.inicio}>
            <input type="time" value={form.start} onChange={set('start')} />
          </Field>
          <Field label={t.panel.publicar.fin}>
            <input type="time" value={form.end} onChange={set('end')} />
          </Field>
        </div>
        <ErrorMsg>{error}</ErrorMsg>
        <button className="btn" disabled={publish.isPending}>
          {publish.isPending ? t.panel.publicar.publicando : t.panel.publicar.publicar}
        </button>
      </form>
    </Page>
  );
}
