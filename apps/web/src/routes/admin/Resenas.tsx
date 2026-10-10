import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@too2go/shared';

import { Empty, Loading, Page } from '@/components/ui';
import { adminKeys, useAdminReviews, type ReviewRow } from '@/lib/adminQueries';
import { fechaHoraHN } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

export function AdminResenas() {
  const reviews = useAdminReviews();
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: async (r: ReviewRow) => {
      const { error } = await supabase.from('reviews').update({ hidden: !r.hidden }).eq('id', r.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: adminKeys.reviews }),
  });

  return (
    <Page title={t.admin.resenas.titulo}>
      {reviews.isLoading ? <Loading /> : null}
      {reviews.data?.length === 0 ? <Empty>{t.admin.resenas.vacio}</Empty> : null}
      {(reviews.data ?? []).map((r) => (
        <div key={r.id} className="card mb row between">
          <div className="grow">
            <div className="row">
              <strong style={{ color: 'var(--color-accent)' }}>{'★'.repeat(r.rating)}</strong>
              <span>{r.merchants?.name}</span>
              <span className="muted small">
                {r.profiles?.full_name ?? '—'} · {fechaHoraHN(r.created_at)}
              </span>
              {r.tags.map((tag) => (
                <span key={tag} className="pill">
                  {t.pedido.resenaTags[tag] ?? tag}
                </span>
              ))}
              {r.hidden ? <span className="pill danger">{t.admin.resenas.oculta}</span> : null}
            </div>
            <p style={{ marginTop: 6, marginBottom: 0 }}>
              {r.comment ?? <span className="muted">—</span>}
            </p>
          </div>
          <button className="btn secondary sm" onClick={() => toggle.mutate(r)}>
            {r.hidden ? t.admin.resenas.mostrar : t.admin.resenas.ocultar}
          </button>
        </div>
      ))}
    </Page>
  );
}
