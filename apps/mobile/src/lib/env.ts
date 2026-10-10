/** Lectura tipada de variables EXPO_PUBLIC_*. Falla temprano si falta algo esencial. */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Copiá .env.example a .env.`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
  googleMapsKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '',
  supportWhatsapp: process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '',
};
