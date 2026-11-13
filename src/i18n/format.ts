/** Locale formatting for es-CR. Hand-written: Intl gives "₡5 000" instead of "₡5.000". */

/**
 * Dates and times are shown in Costa Rica time (America/Costa_Rica, UTC−6 all year, no daylight saving), whatever
 * the device's time zone: a traveller sees the event's real hours (review m17). `cr(d)` is a Date whose UTC fields are
 * the Costa Rica wall-clock fields.
 */
const CR_OFFSET_MS = -6 * 3600_000;
const cr = (d: Date) => new Date(d.getTime() + CR_OFFSET_MS);

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function formatCRC(amount: number): string {
  const n = Math.round(Math.abs(amount));
  const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${amount < 0 ? '-' : ''}₡${s}`;
}

export function formatDistance(km: number): string {
  const m = Math.round((km * 1000) / 10) * 10;
  if (m < 1000) return `${m} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function formatLongDate(date: Date): string {
  const d = cr(date);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

export function formatShortDate(date: Date): string {
  const d = cr(date);
  return `${DAYS[d.getUTCDay()].slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

export function formatDayMonth(date: Date): string {
  const d = cr(date);
  return `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

/** "6:00 p.m." */
export function formatTime(date: Date): string {
  const d = cr(date);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const suffix = h >= 12 ? 'p.m.' : 'a.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "6–10 p.m." or "11:00 a.m.–2:00 p.m." */
export function formatTimeRange(start: Date, end?: Date): string {
  if (!end) return formatTime(start);
  const [s, e] = [cr(start), cr(end)];
  const sSuffix = s.getUTCHours() >= 12 ? 'p.m.' : 'a.m.';
  const eSuffix = e.getUTCHours() >= 12 ? 'p.m.' : 'a.m.';
  const simple = s.getUTCMinutes() === 0 && e.getUTCMinutes() === 0;
  if (simple && sSuffix === eSuffix) {
    const h = (x: Date) => (x.getUTCHours() % 12 === 0 ? 12 : x.getUTCHours() % 12);
    return `${h(s)}–${h(e)} ${eSuffix}`;
  }
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function formatEventWhen(startIso?: string, endIso?: string): string {
  if (!startIso) return '';
  const s = new Date(startIso);
  return `${formatLongDate(s)} · ${formatTimeRange(s, endIso ? new Date(endIso) : undefined)}`;
}

export function formatEventShort(startIso?: string, endIso?: string): string {
  if (!startIso) return '';
  const s = new Date(startIso);
  return `${formatShortDate(s)} · ${formatTimeRange(s, endIso ? new Date(endIso) : undefined)}`;
}

export function formatRating(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

/** "hace 5 min" / "hace 2 h" / "hace 3 días": age of a timestamp, for the offline banner. */
export function formatAgo(iso: string | null, now: Date): string {
  if (!iso) return 'hace un momento';
  const min = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  if (min < 24 * 60) return `hace ${Math.floor(min / 60)} h`;
  return formatRelative(iso, now);
}

/** "hace 3 días" style relative date, relative to `now`. */
export function formatRelative(iso: string, now: Date): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `hace ${w} ${plural(w, 'semana', 'semanas')}`;
  }
  return formatDayMonth(new Date(iso));
}

/** Calendar days from `from` to `to` in Costa Rica (0 = same day). */
export function daysUntil(to: Date, from: Date): number {
  const day = (x: Date) => Math.floor(cr(x).getTime() / 86400000);
  return day(to) - day(from);
}
