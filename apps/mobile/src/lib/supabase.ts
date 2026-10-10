import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@too2go/shared';
import { AppState } from 'react-native';

import { env } from './env';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refrescar el token solo cuando la app está en primer plano.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});

/** Extrae el código de error de negocio que lanzan las RPC (ej. 'sold_out'). */
export function rpcErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = String(error.message);
    return msg.split(':')[0] ?? msg;
  }
  return 'unknown';
}

export class FunctionError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    detail?: string,
  ) {
    super(detail ?? code);
    this.name = 'FunctionError';
  }
}

/**
 * Llama una edge function con el JWT de la sesión actual.
 * Las funciones devuelven `{ error: string, message?: string }` en los errores 4xx/5xx.
 */
export async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new FunctionError('not_authenticated', 401);

  const res = await fetch(`${env.supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json as { error?: string; message?: string } | null;
    throw new FunctionError(err?.error ?? 'unknown', res.status, err?.message);
  }
  return json as T;
}
