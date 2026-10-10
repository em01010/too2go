/** Utilidades de fecha para Honduras (America/Tegucigalpa, UTC-6 sin horario de verano). */

const TZ = 'America/Tegucigalpa';

/** Fecha de hoy en Honduras como `YYYY-MM-DD`. */
export function hoyHN(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Construye un instante ISO a partir de fecha y hora locales de Honduras. */
export function isoDesdeHN(date: string, time: string): string {
  return new Date(`${date}T${time}:00-06:00`).toISOString();
}

/** Inicio (inclusive) y fin (exclusivo) del día de Honduras como ISO. */
export function rangoDiaHN(date = hoyHN()): { desde: string; hasta: string } {
  const desde = new Date(`${date}T00:00:00-06:00`);
  const hasta = new Date(desde.getTime() + 86_400_000);
  return { desde: desde.toISOString(), hasta: hasta.toISOString() };
}

/** Lunes de la semana actual (HN) como `YYYY-MM-DD`. */
export function lunesDeEstaSemanaHN(): string {
  const hoy = hoyHN();
  const d = new Date(`${hoy}T12:00:00-06:00`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function sumarDias(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00-06:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Hora local HN `HH:MM` de un ISO. */
export function horaHN(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function fechaCortaHN(iso: string | Date): string {
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function fechaHoraHN(iso: string): string {
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso));
}
