import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@too2go/shared';
import type { FoodCategory } from '@too2go/shared';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { ErrorMsg, Field, Loading, Page } from '@/components/ui';
import { adminKeys, useAdminMerchants } from '@/lib/adminQueries';
import { supabase } from '@/lib/supabase';

const CATEGORIAS = Object.keys(t.categorias) as FoodCategory[];

export function AdminComercios() {
  const merchants = useAdminMerchants();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    category: 'panaderia' as FoodCategory,
    address: '',
    zone: '',
    lat: '14.0723',
    lng: '-87.1921',
    whatsapp: '',
    commission_rate: '0.25',
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.from('merchants').insert({
        name: form.name.trim(),
        category: form.category,
        address: form.address.trim(),
        zone: form.zone.trim() || null,
        lat: Number(form.lat),
        lng: Number(form.lng),
        whatsapp: form.whatsapp.trim() || null,
        commission_rate: Number(form.commission_rate),
        status: 'pending',
      });
      if (err) throw err;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.merchants });
      setCreating(false);
    },
    onError: () => setError(t.comun.errorGenerico),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    create.mutate();
  };

  const pendientes = (merchants.data ?? []).filter((m) => m.status === 'pending').length;
  const orden = { pending: 0, active: 1, suspended: 2 } as const;
  const lista = [...(merchants.data ?? [])].sort((a, b) => orden[a.status] - orden[b.status]);

  return (
    <Page
      title={t.admin.comercios.titulo}
      subtitle={pendientes > 0 ? t.admin.comercios.pendientes(pendientes) : undefined}
      actions={
        <button className="btn" onClick={() => setCreating((c) => !c)}>
          {t.admin.comercios.nuevo}
        </button>
      }
    >
      {creating ? (
        <form className="card mb" onSubmit={submit}>
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
            <Field label={t.admin.comercios.campos.address}>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </Field>
            <Field label={t.admin.comercios.campos.zone}>
              <input
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
              />
            </Field>
            <Field label={t.admin.comercios.campos.lat}>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                required
              />
            </Field>
            <Field label={t.admin.comercios.campos.lng}>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                required
              />
            </Field>
            <Field label={t.admin.comercios.campos.whatsapp}>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="+504…"
              />
            </Field>
            <Field label={t.admin.comercios.campos.commission_rate}>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.commission_rate}
                onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
              />
            </Field>
          </div>
          <ErrorMsg>{error}</ErrorMsg>
          <div className="row">
            <button className="btn" disabled={create.isPending}>
              {t.comun.guardar}
            </button>
            <button type="button" className="btn ghost" onClick={() => setCreating(false)}>
              {t.comun.cancelar}
            </button>
          </div>
        </form>
      ) : null}

      {merchants.isLoading ? <Loading /> : null}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.admin.comercios.nombre}</th>
              <th>{t.admin.comercios.categoria}</th>
              <th>{t.admin.comercios.zona}</th>
              <th>{t.admin.comercios.comision}</th>
              <th>{t.admin.comercios.estado}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.name}</strong>
                </td>
                <td>{t.categorias[m.category]}</td>
                <td>{m.zone ?? '—'}</td>
                <td>{Math.round(Number(m.commission_rate) * 100)}%</td>
                <td>
                  <span
                    className={`pill ${m.status === 'active' ? 'success' : m.status === 'suspended' ? 'danger' : 'accent'}`}
                  >
                    {t.admin.comercios.estados[m.status]}
                  </span>
                </td>
                <td className="right">
                  <Link className="btn secondary sm" to={`/admin/comercios/${m.id}`}>
                    {t.comun.editar}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
