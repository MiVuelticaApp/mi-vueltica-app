import { parseOpeningHours } from '@/data/http/mappers';
import type { OpeningHoursDto } from '@/data/http/dto';
import type { PlanCandidate, WeeklyHours } from '@/domain/planner';
import type { VuelticaView } from '@/domain/types';

const DAY_KEYS: (keyof OpeningHoursDto)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/**
 * The place's hours for the planner, from the text the app shows ("Mar–Dom · 9:00 a.m.–5:00 p.m."). "Todos los días"
 * is every day; "Siempre abierta" is always open; anything else that does not parse is unknown hours (still allowed).
 */
export function hoursFromText(text: string | undefined): WeeklyHours | 'always' | null {
  if (!text?.trim()) return null;
  if (/siempre abiert/i.test(text)) return 'always';
  const parsed = parseOpeningHours(text.replace(/todos los d[ií]as/gi, 'Lun–Dom'));
  if (!parsed) return null;
  return DAY_KEYS.map((k) => (parsed[k] ?? []).map((r) => [toMin(r.open), toMin(r.close)] as [number, number]));
}

/** Plans the planner may use: published, with a location, and (events) with a start time. */
export function toCandidates(items: readonly VuelticaView[]): PlanCandidate[] {
  const out: PlanCandidate[] = [];
  for (const v of items) {
    if (v.noLocation || v.status !== 'publicada') continue;
    if (v.type === 'evento') {
      if (!v.startAt) continue;
      out.push({ id: v.id, type: 'evento', lat: v.lat, lng: v.lng, startAt: new Date(v.startAt), endAt: v.endAt ? new Date(v.endAt) : undefined, ratingAvg: v.ratingAvg });
    } else {
      out.push({ id: v.id, type: 'lugar', lat: v.lat, lng: v.lng, hours: hoursFromText(v.openingHours), ratingAvg: v.ratingAvg });
    }
  }
  return out;
}
