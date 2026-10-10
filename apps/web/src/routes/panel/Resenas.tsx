import { useQuery } from '@tanstack/react-query';
import { t } from '@too2go/shared';
import { useMemo } from 'react';

import { Empty, Loading, Page, Stat } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { fechaHoraHN } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[];
  created_at: string;
  customer_first_name: string;
}

export function Resenas() {
  const { merchant } = useAuth();
  const reviews = useQuery({
    queryKey: ['merchant_reviews', merchant?.id],
    enabled: !!merchant,
    queryFn: async (): Promise<ReviewRow[]> => {
      const { data, error } = await supabase
        .from('merchant_reviews')
        .select('*')
        .eq('merchant_id', merchant?.id ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ReviewRow[];
    },
  });

  const stats = useMemo(() => {
    const list = reviews.data ?? [];
    const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;
    const counts = new Map<string, number>();
    for (const r of list) for (const tag of r.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return { avg, count: list.length, tags: [...counts.entries()].sort((a, b) => b[1] - a[1]) };
  }, [reviews.data]);

  return (
    <Page title={t.panelResenas.titulo} subtitle={merchant?.name}>
      <div className="grid mb">
        <Stat
          label={t.panelResenas.promedio}
          value={stats.count ? `★ ${stats.avg.toFixed(1)}` : '–'}
          tone="accent"
        />
        <Stat label={t.panelResenas.total} value={stats.count} />
      </div>
      {stats.tags.length > 0 ? (
        <div className="card mb">
          <h3>{t.panelResenas.destacan}</h3>
          <div className="row">
            {stats.tags.map(([tag, n]) => (
              <span key={tag} className="pill success">
                {t.pedido.resenaTags[tag] ?? tag} · {n}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {reviews.isLoading ? <Loading /> : null}
      {reviews.data?.length === 0 ? <Empty>{t.panelResenas.vacio}</Empty> : null}
      {(reviews.data ?? []).map((r) => (
        <div key={r.id} className="card mb">
          <div className="row">
            <strong style={{ color: 'var(--color-accent)' }}>{'★'.repeat(r.rating)}</strong>
            <span className="muted small">
              {r.customer_first_name} · {fechaHoraHN(r.created_at)}
            </span>
            {r.tags.map((tag) => (
              <span key={tag} className="pill">
                {t.pedido.resenaTags[tag] ?? tag}
              </span>
            ))}
          </div>
          {r.comment ? <p style={{ marginTop: 6, marginBottom: 0 }}>{r.comment}</p> : null}
        </div>
      ))}
    </Page>
  );
}
