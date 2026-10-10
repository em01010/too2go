/**
 * Formatea un monto en lempiras: `L 90.00`.
 * Acepta number o string numérico (Postgres devuelve `numeric` como string).
 */
export function formatLempiras(amount: number | string | null | undefined): string {
  const n = typeof amount === 'string' ? Number(amount) : (amount ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  const fixed = safe.toFixed(2);
  const [whole = '0', decimals = '00'] = fixed.split('.');
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `L ${withThousands}.${decimals}`;
}

/** Porcentaje de descuento entero, ej. 64 para 90 sobre 250. */
export function discountPercent(price: number | string, originalValue: number | string): number {
  const p = Number(price);
  const o = Number(originalValue);
  if (!Number.isFinite(p) || !Number.isFinite(o) || o <= 0) return 0;
  return Math.max(0, Math.round((1 - p / o) * 100));
}

/** Hora corta en formato de Honduras, ej. `5:30 p. m.` */
export function formatHora(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-HN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Tegucigalpa',
  }).format(d);
}

/** Fecha corta, ej. `vie 10 oct`. */
export function formatFecha(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('es-HN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Tegucigalpa',
  }).format(d);
}

/** Rango de franja de retiro, ej. `5:00 p. m. – 6:00 p. m.` */
export function formatFranja(start: string | Date, end: string | Date): string {
  return `${formatHora(start)} – ${formatHora(end)}`;
}

/** Distancia legible: `350 m` o `2.4 km`. */
export function formatDistancia(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Cuenta regresiva mm:ss a partir de segundos. */
export function formatCuentaRegresiva(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/** Normaliza un teléfono hondureño a E.164 (+504XXXXXXXX). */
export function normalizarTelefonoHN(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 8) return `+504${digits}`;
  if (digits.length === 11 && digits.startsWith('504')) return `+${digits}`;
  return null;
}
