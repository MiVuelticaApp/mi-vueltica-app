import { tierRank } from './rules';
import type { DateFilter, Filters, MaxPrice, SortKey, VuelticaView } from './types';

export const MAX_DISTANCE_KM = 5;

export const DEFAULT_FILTERS: Filters = {
  text: '',
  types: ['lugar', 'evento'],
  maxPrice: 'hasta5000',
  students: false,
  seniors: false,
  families: false,
  distanceKm: MAX_DISTANCE_KM,
  date: 'any',
  wheelchair: false,
  nearMe: true,
};

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

/** Range of the current/next weekend (Saturday 00:00 – Sunday 23:59). */
export function weekendRange(now: Date): { from: Date; to: Date } {
  const day = now.getDay(); // 0 Sun … 6 Sat
  const from = startOfDay(now);
  if (day === 0) from.setDate(from.getDate() - 1);
  else from.setDate(from.getDate() + (6 - day));
  const to = endOfDay(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

export function dateRange(date: DateFilter, now: Date): { from: Date; to: Date } | null {
  if (date === 'any') return null;
  if (date === 'hoy') return { from: startOfDay(now), to: endOfDay(now) };
  if (date === 'finDeSemana') return weekendRange(now);
  return { from: startOfDay(new Date(date.from)), to: endOfDay(new Date(date.to)) };
}

function eventInRange(v: VuelticaView, range: { from: Date; to: Date }): boolean {
  if (!v.startAt) return true;
  const s = new Date(v.startAt).getTime();
  const e = new Date(v.endAt ?? v.startAt).getTime();
  return s <= range.to.getTime() && e >= range.from.getTime();
}

export function maxTierRank(m: MaxPrice): number {
  return m === 'gratis' ? 0 : m === 'hasta2500' ? 1 : 2;
}

export function matchesFilters(v: VuelticaView, f: Filters, now: Date, userMax?: MaxPrice): boolean {
  if (!f.types.includes(v.type)) return false;
  const cap = Math.min(maxTierRank(f.maxPrice), userMax ? maxTierRank(userMax) : 2);
  if (tierRank(v.priceTier) > cap) return false;
  if (f.students && !(v.audiences.includes('estudiantes') || v.freeFor.includes('estudiantes'))) return false;
  if (f.seniors && !(v.audiences.includes('ciudadanosOro') || v.freeFor.includes('ciudadanosOro'))) return false;
  if (f.families && !v.audiences.includes('familias')) return false;
  if (f.wheelchair && !v.wheelchair) return false;
  // "Cerca de mí" applies the distance limit; the map always passes nearMe: true.
  if (f.nearMe && v.distanceKm > f.distanceKm) return false;
  const range = dateRange(f.date, now);
  if (range && v.type === 'evento' && !eventInRange(v, range)) return false;
  const q = f.text.trim().toLowerCase();
  if (q) {
    const hay = `${v.name} ${v.address}`.toLowerCase();
    const h = normalize(hay);
    if (!normalize(q).split(/\s+/).every((tok) => h.includes(tok))) return false;
  }
  return true;
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function applyFilters(list: VuelticaView[], f: Filters, now: Date, userMax?: MaxPrice): VuelticaView[] {
  return list.filter((v) => matchesFilters(v, f, now, userMax));
}

/** Number shown in "Filtros · N". Type chips both on, default price and 5 km don't count. */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.types.length === 1) n += 1;
  if (f.maxPrice !== 'hasta5000') n += 1;
  if (f.students) n += 1;
  if (f.seniors) n += 1;
  if (f.families) n += 1;
  if (f.distanceKm < MAX_DISTANCE_KM) n += 1;
  if (f.date !== 'any') n += 1;
  if (f.wheelchair) n += 1;
  return n;
}

export function sortVuelticas(list: VuelticaView[], key: SortKey, now: Date): VuelticaView[] {
  const copy = [...list];
  switch (key) {
    case 'cercanos':
      return copy.sort((a, b) => a.distanceKm - b.distanceKm);
    case 'calificados':
      return copy.sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount);
    case 'recientes':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'fecha': {
      const t = now.getTime();
      const key2 = (v: VuelticaView) => (v.startAt ? Math.max(new Date(v.startAt).getTime(), t) : Number.MAX_SAFE_INTEGER);
      return copy.sort((a, b) => key2(a) - key2(b) || a.distanceKm - b.distanceKm);
    }
  }
}

export interface ResultSummary {
  count: number;
  free: number;
}

export function summarize(list: VuelticaView[]): ResultSummary {
  return { count: list.length, free: list.filter((v) => v.priceTier === 'gratis').length };
}
