import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatLempiras, t } from '@too2go/shared';
import type { FoodCategory, OfferTemplate } from '@too2go/shared';
import { useState, type FormEvent } from 'react';

import { Empty, ErrorMsg, Field, Loading, Page, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useTemplates } from '@/lib/queries';
import { supabase } from '@/lib/supabase';

const CATEGORIAS = Object.keys(t.categorias) as FoodCategory[];
const DIETAS = Object.entries(t.oferta.dietas);
const DIAS = t.panel.plantillas.diasSemana;

interface FormState {
  id?: string;
  title: string;
  description: string;
  category: FoodCategory;
  price_hnl: string;
  original_value_hnl: string;
  quantity: string;
  weekdays: number[];
  start: string;
  end: string;
  active: boolean;
  dietary_tags: string[];
}

const empty = (category: FoodCategory): FormState => ({
  title: 'Bolsa sorpresa',
  description: '',
  category,
  price_hnl: '',
  original_value_hnl: '',
  quantity: '5',
  weekdays: [1, 2, 3, 4, 5],
  start: '17:00',
  end: '18:00',
  active: true,
  dietary_tags: [],
});

export function Plantillas() {
  const { merchant } = useAuth();
  const templates = useTemplates(merchant?.id);
  const qc = useQueryClient();
  const { toast, show } = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['templates', merchant?.id] });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const price = Number(f.price_hnl);
      const original = Number(f.original_value_hnl);
      if (!(price > 0) || !(original >= price)) throw new Error('precio');
      if (f.weekdays.length === 0 || !(f.end > f.start)) throw new Error('horario');
      const row = {
        merchant_id: merchant?.id ?? '',
        title: f.title.trim() || 'Bolsa sorpresa',
        description: f.description.trim() || null,
        category: f.category,
        price_hnl: price,
        original_value_hnl: original,
        quantity: Number(f.quantity) || 1,
        weekdays: f.weekdays,
        pickup_start_local: f.start,
        pickup_end_local: f.end,
        active: f.active,
        dietary_tags: f.dietary_tags,
      };
      const { error: err } = f.id
        ? await supabase.from('offer_templates').update(row).eq('id', f.id)
        : await supabase.from('offer_templates').insert(row);
      if (err) throw err;
    },
    onSuccess: () => {
      invalidate();
      setForm(null);
      show(t.panel.plantillas.guardada);
    },
    onError: (e) => {
      const k = e.message as keyof typeof t.panel.publicar.errores;
      setError(t.panel.publicar.errores[k] ?? t.comun.errorGenerico);
    },
  });

  const toggle = useMutation({
    mutationFn: async (tpl: OfferTemplate) => {
      const { error: err } = await supabase
        .from('offer_templates')
        .update({ active: !tpl.active })
        .eq('id', tpl.id);
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from('offer_templates').delete().eq('id', id);
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const edit = (tpl: OfferTemplate) =>
    setForm({
      id: tpl.id,
      title: tpl.title,
      description: tpl.description ?? '',
      category: tpl.category,
      price_hnl: String(tpl.price_hnl),
      original_value_hnl: String(tpl.original_value_hnl),
      quantity: String(tpl.quantity),
      weekdays: tpl.weekdays,
      start: tpl.pickup_start_local.slice(0, 5),
      end: tpl.pickup_end_local.slice(0, 5),
      active: tpl.active,
      dietary_tags: tpl.dietary_tags,
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form) {
      setError('');
      save.mutate(form);
    }
  };

  return (
    <Page
      title={t.panel.plantillas.titulo}
      subtitle={t.panel.plantillas.texto}
      actions={
        <button className="btn" onClick={() => setForm(empty(merchant?.category ?? 'otro'))}>
          {t.panel.plantillas.nueva}
        </button>
      }
    >
      {toast}
      {form ? (
        <form className="card mb" onSubmit={submit}>
          <div className="form-grid">
            <Field label={t.panel.publicar.tituloCampo}>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </Field>
            <Field label={t.panel.publicar.categoria}>
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
          <Field label={t.panel.publicar.descripcion}>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="form-grid">
            <Field label={t.panel.publicar.precio}>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.price_hnl}
                onChange={(e) => setForm({ ...form, price_hnl: e.target.value })}
                required
              />
            </Field>
            <Field label={t.panel.publicar.valorOriginal}>
              <input
                type="number"
                min="1"
                step="0.01"
                value={form.original_value_hnl}
                onChange={(e) => setForm({ ...form, original_value_hnl: e.target.value })}
                required
              />
            </Field>
            <Field label={t.panel.publicar.cantidad}>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label={t.panel.publicar.inicio}>
              <input
                type="time"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </Field>
            <Field label={t.panel.publicar.fin}>
              <input
                type="time"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
              />
            </Field>
          </div>
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
                      setForm({
                        ...form,
                        dietary_tags: on
                          ? form.dietary_tags.filter((x) => x !== key)
                          : [...form.dietary_tags, key],
                      })
                    }
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <p className="muted small" style={{ fontWeight: 600 }}>
            {t.panel.plantillas.dias}
          </p>
          <div className="days mb">
            {DIAS.map((d, i) => {
              const on = form.weekdays.includes(i);
              return (
                <label key={d} className={on ? 'on' : ''}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setForm({
                        ...form,
                        weekdays: on
                          ? form.weekdays.filter((x) => x !== i)
                          : [...form.weekdays, i].sort(),
                      })
                    }
                  />
                  {d}
                </label>
              );
            })}
          </div>
          <Field label={t.panel.plantillas.activa} inline>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
          </Field>
          <ErrorMsg>{error}</ErrorMsg>
          <div className="row">
            <button className="btn" disabled={save.isPending}>
              {t.comun.guardar}
            </button>
            <button type="button" className="btn ghost" onClick={() => setForm(null)}>
              {t.comun.cancelar}
            </button>
          </div>
        </form>
      ) : null}

      {templates.isLoading ? <Loading /> : null}
      {templates.data?.length === 0 && !form ? <Empty>{t.panel.plantillas.vacio}</Empty> : null}
      {(templates.data ?? []).map((tpl) => (
        <div key={tpl.id} className="card mb row between">
          <div>
            <h3 style={{ marginBottom: 2 }}>
              {tpl.title}{' '}
              <span className={`pill ${tpl.active ? 'success' : ''}`}>
                {tpl.active ? t.panel.plantillas.activa : t.panel.plantillas.inactiva}
              </span>
            </h3>
            <p className="muted">
              {tpl.weekdays.map((d) => DIAS[d]).join(', ')} · {tpl.pickup_start_local.slice(0, 5)}–
              {tpl.pickup_end_local.slice(0, 5)} · {tpl.quantity} {t.comun.bolsas} ·{' '}
              <span className="price">{formatLempiras(tpl.price_hnl)}</span>
            </p>
          </div>
          <div className="row">
            <button className="btn secondary sm" onClick={() => edit(tpl)}>
              {t.comun.editar}
            </button>
            <button className="btn ghost sm" onClick={() => toggle.mutate(tpl)}>
              {tpl.active ? t.panel.plantillas.inactiva : t.panel.plantillas.activa}
            </button>
            <button
              className="btn ghost sm"
              style={{ color: 'var(--color-danger)' }}
              onClick={() => {
                if (window.confirm(t.panel.plantillas.eliminarConfirm)) remove.mutate(tpl.id);
              }}
            >
              {t.comun.eliminar}
            </button>
          </div>
        </div>
      ))}
    </Page>
  );
}
