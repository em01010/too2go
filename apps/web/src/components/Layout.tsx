import { t } from '@too2go/shared';
import { NavLink, Outlet } from 'react-router';

import { useAuth } from '@/lib/auth';

interface Item {
  to: string;
  label: string;
  end?: boolean;
}

export function Layout({ items, title }: { items: Item[]; title: string }) {
  const { profile, merchants, merchant, setMerchantId, signOut, isAdmin } = useAuth();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          {t.app.nombre}
          <div className="muted small" style={{ fontWeight: 500 }}>
            {title}
          </div>
        </div>
        {merchants.length > 1 ? (
          <select
            value={merchant?.id ?? ''}
            onChange={(e) => setMerchantId(e.target.value)}
            style={{ marginBottom: 8 }}
          >
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : null}
        {items.map((i) => (
          <NavLink key={i.to} to={i.to} end={i.end ?? false}>
            {i.label}
          </NavLink>
        ))}
        {isAdmin && !title.startsWith(t.admin.titulo) ? (
          <NavLink to="/admin">{t.admin.titulo}</NavLink>
        ) : null}
        {isAdmin && merchants.length > 0 && title.startsWith(t.admin.titulo) ? (
          <NavLink to="/panel/hoy">{t.panel.titulo}</NavLink>
        ) : null}
        <div className="spacer" />
        <div className="who">
          <div>{profile?.full_name ?? ''}</div>
          <div>{profile?.phone ?? ''}</div>
          <button
            className="btn ghost sm"
            style={{ padding: 0, marginTop: 6 }}
            onClick={() => void signOut()}
          >
            {t.comun.salir}
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
