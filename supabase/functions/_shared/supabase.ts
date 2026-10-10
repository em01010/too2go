// Cliente mínimo sobre PostgREST / GoTrue usando fetch (sin dependencias externas).
// Suficiente para las edge functions: leer con el JWT del usuario (RLS) y llamar RPC con service role.

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

export class SupabaseHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'SupabaseHttpError';
  }
}

interface PostgrestError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

async function parseError(res: Response): Promise<SupabaseHttpError> {
  let body: PostgrestError = {};
  try {
    body = (await res.json()) as PostgrestError;
  } catch {
    // sin cuerpo JSON
  }
  return new SupabaseHttpError(res.status, body.code ?? null, body.message ?? res.statusText);
}

export interface AuthUser {
  id: string;
  phone: string | null;
}

/** Valida el JWT del usuario contra GoTrue y devuelve su id. */
export async function getUser(authHeader: string): Promise<AuthUser | null> {
  const res = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: env('SUPABASE_ANON_KEY'), Authorization: authHeader },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id: string; phone?: string | null };
  return { id: data.id, phone: data.phone ?? null };
}

export interface Client {
  /** SELECT sobre una tabla o vista. `query` es la query string de PostgREST (select=..., id=eq....). */
  select<T>(table: string, query: string): Promise<T[]>;
  selectOne<T>(table: string, query: string): Promise<T | null>;
  /** Llama una función de Postgres expuesta por PostgREST. */
  rpc<T>(fn: string, args: Record<string, unknown>): Promise<T>;
}

function makeClient(apikey: string, authorization: string): Client {
  const base = `${env('SUPABASE_URL')}/rest/v1`;
  const headers = {
    apikey,
    Authorization: authorization,
    'Content-Type': 'application/json',
  };
  return {
    async select<T>(table: string, query: string): Promise<T[]> {
      const res = await fetch(`${base}/${table}?${query}`, { headers });
      if (!res.ok) throw await parseError(res);
      return (await res.json()) as T[];
    },
    async selectOne<T>(table: string, query: string): Promise<T | null> {
      const rows = await this.select<T>(table, `${query}&limit=1`);
      return rows[0] ?? null;
    },
    async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
      const res = await fetch(`${base}/rpc/${fn}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args),
      });
      if (!res.ok) throw await parseError(res);
      return (await res.json()) as T;
    },
  };
}

/** Cliente con el JWT del usuario: respeta RLS. */
export function userClient(authHeader: string): Client {
  return makeClient(env('SUPABASE_ANON_KEY'), authHeader);
}

/** Cliente con service role: solo para webhooks y tareas de servidor. */
export function serviceClient(): Client {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  return makeClient(key, `Bearer ${key}`);
}
