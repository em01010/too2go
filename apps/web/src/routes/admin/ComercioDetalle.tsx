import { useMutation, useQueryClient } from '@tanstack/react-query';
import { normalizarTelefonoHN, t } from '@too2go/shared';
import type { FoodCategory, Merchant, MerchantStatus } from '@too2go/shared';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';

import { ErrorMsg, Field, Loading, Page, useToast } from '@/components/ui';
import { adminKeys, useAdminMembers, useAdminMerchant } from '@/lib/adminQueries';
import { supabase } from '@/lib/supabase';

const CATEGORIAS = Object.keys(t.categorias) as FoodCategory[];

type FormState = Pick<
  Merchant,
  | 'name'
  | 'legal_name'
  | 'rtn'
  | 'category'
  | 'description'
  | 'address'
  | 'zone'
  | 'whatsapp'
  | 'has_parking'
> & {
  lat: string;
  lng: string;
  commission_rate: string;
};

export function AdminComercioDetalle() {
  const { id } = useParams<{ id: string }>();
  const merchant = useAdminMerchant(id);
  if (merchant.isLoading) return <Loading />;
  if (!merchant.data) return <p>{t.comun.errorGenerico}</p>;
  // key: si cambia el comercio, el formulario se reinicia con sus datos.
  return <Detalle key={merchant.data.id} m={merchant.data} />;
}

function Detalle({ m }: { m: Merchant }) {
  const id = m.id;
  const members = useAdminMembers(id);
  const qc = useQueryClient();
  const { toast, show } = useToast();
  const [form, setForm] = useState<FormState>(() => ({
    name: m.name,
    legal_name: m.legal_name,
    rtn: m.rtn,
    category: m.category,
    description: m.description,
    address: m.address,
    zone: m.zone,
    whatsapp: m.whatsapp,
    has_parking: m.has_parking,
    lat: String(m.lat),
    lng: String(m.lng),
    commission_rate: String(m.commission_rate),
  }));
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: adminKeys.merchants });
    void qc.invalidateQueries({ queryKey: adminKeys.merchant(id) });
  };

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const { error: err } = await supabase
        .from('merchants')
        .update({
          name: f.name.trim(),
          legal_name: f.legal_name?.trim() || null,
          rtn: f.rtn?.trim() || null,
          category: f.category,
          description: f.description?.trim() || null,
          address: f.address.trim(),
          zone: f.zone?.trim() || null,
          whatsapp: f.whatsapp?.trim() || null,
          has_parking: f.has_parking,
          lat: Number(f.lat),
          lng: Number(f.lng),
          commission_rate: Number(f.commission_rate),
        })
        .eq('id', id);
      if (err) throw err;
    },
    onSuccess: () => {
      invalidate();
      show(t.admin.comercios.guardado);
    },
    onError: () => setError(t.comun.errorGenerico),
  });

  const setStatus = useMutation({
    mutationFn: async (status: MerchantStatus) => {
      const { error: err } = await supabase.from('merchants').update({ status }).eq('id', id);
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  const addMember = useMutation({
    mutationFn: async () => {
      const e164 = normalizarTelefonoHN(phone);
      if (!e164) throw new Error('phone');
      // Los perfiles guardan el teléfono con o sin '+', según cómo lo creó GoTrue.
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .in('phone', [e164, e164.slice(1)])
        .maybeSingle();
      if (!prof) throw new Error('not_found');
      const { error: err } = await supabase
        .from('merchant_members')
        .insert({ merchant_id: id, user_id: prof.id, role: 'staff' });
      if (err) throw err;
      await supabase
        .from('profiles')
        .update({ role: 'merchant' })
        .eq('id', prof.id)
        .eq('role', 'customer');
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.members(id) });
      setPhone('');
      show(t.admin.comercios.miembroAgregado);
    },
    onError: (e) =>
      setError(
        e.message === 'not_found'
          ? t.admin.comercios.usuarioNoEncontrado
          : e.message === 'phone'
            ? t.login.telefonoInvalido
            : t.comun.errorGenerico,
      ),
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error: err } = await supabase
        .from('merchant_members')
        .delete()
        .eq('merchant_id', id)
        .eq('user_id', userId);
      if (err) throw err;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKeys.members(id) }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    save.mutate(form);
  };

  return (
    <Page
      title={m.name}
      subtitle={`${t.categorias[m.category]} · ${t.admin.comercios.estados[m.status]}`}
      actions={
        <>
          <Link className="btn ghost" to="/admin/comercios">
            ← {t.comun.volver}
          </Link>
          {m.status !== 'active' ? (
            <button className="btn" onClick={() => setStatus.mutate('active')}>
              {m.status === 'pending' ? t.admin.comercios.aprobar : t.admin.comercios.reactivar}
            </button>
          ) : (
            <button className="btn danger" onClick={() => setStatus.mutate('suspended')}>
              {t.admin.comercios.suspender}
            </button>
          )}
        </>
      }
    >
      {toast}
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
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
            <Field label={t.admin.comercios.campos.legal_name}>
              <input
                value={form.legal_name ?? ''}
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              />
            </Field>
            <Field label={t.admin.comercios.campos.rtn}>
              <input
                value={form.rtn ?? ''}
                onChange={(e) => setForm({ ...form, rtn: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t.admin.comercios.campos.description}>
            <textarea
              value={form.description ?? ''}
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
              <input
                value={form.zone ?? ''}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
              />
            </Field>
            <Field label={t.admin.comercios.campos.whatsapp}>
              <input
                value={form.whatsapp ?? ''}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </Field>
            <Field label={t.admin.comercios.campos.lat}>
              <input
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
              />
            </Field>
            <Field label={t.admin.comercios.campos.lng}>
              <input
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
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

        <div className="card">
          <h2>{t.admin.comercios.miembros}</h2>
          <table>
            <tbody>
              {(members.data ?? []).map((mb) => (
                <tr key={mb.user_id}>
                  <td>{mb.profiles?.full_name ?? '—'}</td>
                  <td>{mb.profiles?.phone ?? ''}</td>
                  <td>
                    <span className="pill">{mb.role}</span>
                  </td>
                  <td className="right">
                    <button
                      className="btn ghost sm"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => removeMember.mutate(mb.user_id)}
                    >
                      {t.comun.eliminar}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form
            className="row mt"
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              addMember.mutate();
            }}
          >
            <input
              className="grow"
              placeholder={t.admin.comercios.agregarMiembro}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button className="btn secondary" disabled={addMember.isPending}>
              {t.comun.guardar}
            </button>
          </form>
        </div>
      </div>
    </Page>
  );
}
