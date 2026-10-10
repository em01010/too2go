/** Lectura tipada de variables VITE_*. */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Copiá .env.example a .env.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    'VITE_SUPABASE_URL',
    import.meta.env.VITE_SUPABASE_URL as string | undefined,
  ),
  supabaseAnonKey: required(
    'VITE_SUPABASE_ANON_KEY',
    import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  ),
  googleMapsKey: (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined) ?? '',
  supportWhatsapp: (import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined) ?? '',
};
