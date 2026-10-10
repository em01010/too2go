import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { t } from '@too2go/shared';
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';

import { Layout } from '@/components/Layout';
import { Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AdminComercioDetalle } from '@/routes/admin/ComercioDetalle';
import { AdminComercios } from '@/routes/admin/Comercios';
import { AdminLiquidaciones } from '@/routes/admin/Liquidaciones';
import { AdminMetricas } from '@/routes/admin/Metricas';
import { AdminPedidos } from '@/routes/admin/Pedidos';
import { AdminResenas } from '@/routes/admin/Resenas';
import { Login } from '@/routes/Login';
import { Cierre } from '@/routes/panel/Cierre';
import { Hoy } from '@/routes/panel/Hoy';
import { Plantillas } from '@/routes/panel/Plantillas';
import { Publicar } from '@/routes/panel/Publicar';
import { Validar } from '@/routes/panel/Validar';
import { Ventas } from '@/routes/panel/Ventas';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5_000 } },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const panelNav = [
  { to: '/panel/hoy', label: t.panel.nav.hoy },
  { to: '/panel/validar', label: t.panel.nav.validar },
  { to: '/panel/publicar', label: t.panel.nav.publicar },
  { to: '/panel/plantillas', label: t.panel.nav.plantillas },
  { to: '/panel/cierre', label: t.panel.nav.cierre },
  { to: '/panel/ventas', label: t.panel.nav.ventas },
];

const adminNav = [
  { to: '/admin', label: t.admin.nav.metricas, end: true },
  { to: '/admin/comercios', label: t.admin.nav.comercios },
  { to: '/admin/pedidos', label: t.admin.nav.pedidos },
  { to: '/admin/resenas', label: t.admin.nav.resenas },
  { to: '/admin/liquidaciones', label: t.admin.nav.liquidaciones },
];

function Router() {
  const { session, loading, isAdmin, merchants } = useAuth();
  if (loading)
    return (
      <div className="main">
        <Loading />
      </div>
    );
  if (!session) return <Login />;

  const home = isAdmin ? '/admin' : '/panel/hoy';

  return (
    <Routes>
      <Route path="/" element={<Navigate to={home} replace />} />
      <Route path="/login" element={<Navigate to={home} replace />} />
      <Route element={<Layout items={panelNav} title={t.panel.titulo} />}>
        <Route
          path="/panel/hoy"
          element={
            <Guard ok={merchants.length > 0 || isAdmin}>
              <Hoy />
            </Guard>
          }
        />
        <Route
          path="/panel/validar"
          element={
            <Guard ok={merchants.length > 0}>
              <Validar />
            </Guard>
          }
        />
        <Route
          path="/panel/publicar"
          element={
            <Guard ok={merchants.length > 0}>
              <Publicar />
            </Guard>
          }
        />
        <Route
          path="/panel/plantillas"
          element={
            <Guard ok={merchants.length > 0}>
              <Plantillas />
            </Guard>
          }
        />
        <Route
          path="/panel/cierre"
          element={
            <Guard ok={merchants.length > 0}>
              <Cierre />
            </Guard>
          }
        />
        <Route
          path="/panel/ventas"
          element={
            <Guard ok={merchants.length > 0}>
              <Ventas />
            </Guard>
          }
        />
      </Route>
      <Route element={<Layout items={adminNav} title={t.admin.titulo} />}>
        <Route
          path="/admin"
          element={
            <Guard ok={isAdmin} msg={t.admin.soloAdmin}>
              <AdminMetricas />
            </Guard>
          }
        />
        <Route
          path="/admin/comercios"
          element={
            <Guard ok={isAdmin} msg={t.admin.soloAdmin}>
              <AdminComercios />
            </Guard>
          }
        />
        <Route
          path="/admin/comercios/:id"
          element={
            <Guard ok={isAdmin} msg={t.admin.soloAdmin}>
              <AdminComercioDetalle />
            </Guard>
          }
        />
        <Route
          path="/admin/pedidos"
          element={
            <Guard ok={isAdmin} msg={t.admin.soloAdmin}>
              <AdminPedidos />
            </Guard>
          }
        />
        <Route
          path="/admin/resenas"
          element={
            <Guard ok={isAdmin} msg={t.admin.soloAdmin}>
              <AdminResenas />
            </Guard>
          }
        />
        <Route
          path="/admin/liquidaciones"
          element={
            <Guard ok={isAdmin} msg={t.admin.soloAdmin}>
              <AdminLiquidaciones />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

function Guard({ ok, msg, children }: { ok: boolean; msg?: string; children: ReactNode }) {
  if (ok) return children;
  return (
    <div className="card">
      <p>{msg ?? t.panel.sinComercio}</p>
    </div>
  );
}
