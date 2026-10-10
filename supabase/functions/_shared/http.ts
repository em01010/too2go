export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-mock-signature',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extra },
  });
}

export function error(code: string, status: number, message?: string): Response {
  return json({ error: code, message }, status);
}

export function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
  });
}

/**
 * Base pública de las edge functions, tal como la ve el cliente que hizo la petición.
 * Permite que el teléfono (en la red Wi‑Fi) reciba URLs con la IP de la computadora y no 127.0.0.1.
 */
export function functionsBaseUrl(req: Request): string {
  const override = Deno.env.get('FUNCTIONS_PUBLIC_URL');
  if (override) return override.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  let host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '127.0.0.1:54321';
  // Kong (gateway local) manda el host sin puerto y el puerto en x-forwarded-port.
  const port = req.headers.get('x-forwarded-port');
  const defaultPort = proto === 'https' ? '443' : '80';
  if (!host.includes(':') && port && port !== defaultPort) host = `${host}:${port}`;
  return `${proto}://${host}/functions/v1`;
}

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
