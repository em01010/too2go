import { createClient } from '@supabase/supabase-js';
import type { Database } from '@too2go/shared';

import { env } from './env';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);

/** Extrae el código de error de negocio que lanzan las RPC (ej. 'code_not_found'). */
export function rpcErrorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return 'unknown';
}
