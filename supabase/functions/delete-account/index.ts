// POST /functions/v1/delete-account  (requiere JWT del cliente)
// Elimina la cuenta del usuario autenticado: anonimiza el perfil, borra favoritos y tokens push
// y hace soft-delete del usuario en GoTrue (los pedidos pagados se conservan de forma anónima
// por razones contables; por eso no se puede borrar la fila de profiles).
import { corsHeaders, error, json } from '../_shared/http.ts';
import { getUser, serviceClient, SupabaseHttpError } from '../_shared/supabase.ts';

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return error('method_not_allowed', 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return error('not_authenticated', 401);
  const user = await getUser(authHeader);
  if (!user) return error('not_authenticated', 401);

  const svc = serviceClient();
  const base = `${env('SUPABASE_URL')}/rest/v1`;
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  try {
    // No permitir si tiene una bolsa pagada pendiente de recoger.
    const pending = await svc.select<{ id: string }>(
      'orders',
      `select=id&customer_id=eq.${user.id}&status=in.(paid,pending_payment)`,
    );
    if (pending.length > 0) return error('has_pending_orders', 409);

    const del = async (table: string, filter: string) => {
      const r = await fetch(`${base}/${table}?${filter}`, { method: 'DELETE', headers });
      if (!r.ok) throw new SupabaseHttpError(r.status, null, `No se pudo limpiar ${table}`);
    };
    await del('favorites', `customer_id=eq.${user.id}`);
    await del('push_tokens', `user_id=eq.${user.id}`);

    const upd = await fetch(`${base}/profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ full_name: 'Cuenta eliminada', phone: null }),
    });
    if (!upd.ok) throw new SupabaseHttpError(upd.status, null, 'No se pudo anonimizar el perfil');

    // Soft delete en GoTrue: marca deleted_at y ofusca teléfono/email; la fila sigue existiendo
    // para que los pedidos históricos conserven su FK.
    const gotrue = await fetch(`${env('SUPABASE_URL')}/auth/v1/admin/users/${user.id}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ should_soft_delete: true }),
    });
    if (!gotrue.ok) {
      const txt = await gotrue.text();
      throw new SupabaseHttpError(gotrue.status, null, `GoTrue: ${txt}`);
    }
    return json({ ok: true });
  } catch (e) {
    if (e instanceof SupabaseHttpError) return error('delete_failed', 500, e.message);
    throw e;
  }
});
