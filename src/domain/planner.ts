import { haversineKm } from './geo';
import type { LatLng } from './types';

/**
 * "Armame el plan" (#32): an ordered outing for a time window and a number of stops, built on the device from the
 * plans near the user. Greedy and deterministic: from where you are and the window's start, take the best stop that
 * still fits (fixed-time events first, then the closest / best rated), until the stops are reached or the window ends.
 * Asking for more than fits returns only what fits.
 *
 * Times are Costa Rica wall-clock (UTC−6 all year, no daylight saving), like the rest of the app.
 */

const CR_OFFSET_MS = -6 * 3600_000;
const MIN = 60_000;

/** Shortest stay that still counts as a stop. Short on purpose: 10 stops in half an hour gives whatever fits. */
export const MIN_STAY_MIN = 10;
/** Default visit length for a place, and for an event with no end time. */
export const PLACE_STAY_MIN = 60;
export const EVENT_DEFAULT_MIN = 90;
/** Longest stay at one event, so a long festival does not eat the whole window. */
export const EVENT_MAX_STAY_MIN = 120;
/** Waiting more than this for an event to start is not a plan. */
export const MAX_WAIT_MIN = 45;
/** Plans further than this from the user are not considered. */
export const PLAN_RADIUS_KM = 15;

/** Open ranges per Costa Rica weekday (0 = Sunday … 6 = Saturday), in minutes since midnight. */
export type WeeklyHours = [number, number][][];

export interface PlanCandidate {
  id: string;
  type: 'lugar' | 'evento';
  lat: number;
  lng: number;
  /** Events: fixed time. */
  startAt?: Date;
  endAt?: Date;
  /** Places: `'always'`, the week's ranges, or null when unknown (allowed, flagged). */
  hours?: WeeklyHours | 'always' | null;
  ratingAvg: number;
}

export interface PlanRequest {
  start: Date;
  end: Date;
  stops: number;
  from: LatLng;
  /** Stops of the previous plan, pushed down so "Otra opción" gives a different one. */
  avoid?: ReadonlySet<string>;
}

export interface PlanStop {
  id: string;
  /** Minutes travelling from the previous stop (or from the user). */
  travelMin: number;
  arrive: Date;
  /** When the visit starts: the arrival, or the event's start when you get there early. */
  begin: Date;
  leave: Date;
  hoursUnknown: boolean;
}

export interface Plan {
  stops: PlanStop[];
  requested: number;
  /** Fewer stops than asked because nothing else fits in the window. */
  short: boolean;
}

const crDay = (d: Date) => new Date(d.getTime() + CR_OFFSET_MS).getUTCDay();
const crMinutes = (d: Date) => {
  const x = new Date(d.getTime() + CR_OFFSET_MS);
  return x.getUTCHours() * 60 + x.getUTCMinutes();
};
const addMin = (d: Date, m: number) => new Date(d.getTime() + m * MIN);
const minutesBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / MIN;

/** City travel: straight line × 1.3 at about 30 km/h, rounded up to 5 minutes (at least 5). */
export function travelMinutes(a: LatLng, b: LatLng): number {
  const km = haversineKm(a, b) * 1.3;
  return Math.max(5, Math.ceil(((km / 30) * 60) / 5) * 5);
}

/** Minutes the place stays open from `at` on (0 when closed), or null when the hours are unknown. */
export function openFor(hours: PlanCandidate['hours'], at: Date): number | null {
  if (hours === 'always') return Infinity;
  if (!hours) return null;
  const m = crMinutes(at);
  for (const [open, close] of hours[crDay(at)] ?? []) {
    if (m >= open && m < close) return close - m;
  }
  return 0;
}

interface Fit {
  c: PlanCandidate;
  travelMin: number;
  arrive: Date;
  begin: Date;
  leave: Date;
  score: number;
  hoursUnknown: boolean;
}

function fit(c: PlanCandidate, from: LatLng, t: Date, end: Date, budgetMin: number, avoid?: ReadonlySet<string>): Fit | null {
  const travelMin = travelMinutes(from, c);
  const arrive = addMin(t, travelMin);
  let begin = arrive;
  let stay: number;
  let hoursUnknown = false;
  if (c.type === 'evento') {
    if (!c.startAt) return null;
    const evEnd = c.endAt ?? addMin(c.startAt, EVENT_DEFAULT_MIN);
    if (c.startAt > arrive) begin = c.startAt;
    if (minutesBetween(arrive, begin) > MAX_WAIT_MIN) return null;
    stay = Math.min(minutesBetween(begin, evEnd), EVENT_MAX_STAY_MIN, budgetMin);
  } else {
    const open = openFor(c.hours, arrive);
    if (open === 0) return null;
    hoursUnknown = open === null;
    stay = Math.min(PLACE_STAY_MIN, budgetMin, open ?? Infinity);
  }
  // Whole 5-minute stays read better ("11:10–12:05", not "11:10–12:07").
  stay = Math.floor(Math.min(stay, minutesBetween(begin, end)) / 5) * 5;
  if (stay < MIN_STAY_MIN) return null;
  const wait = minutesBetween(arrive, begin);
  // Lower is better: time lost getting there, fixed-time events first, good ratings a little ahead, unknown hours last.
  const score = travelMin + wait - (c.type === 'evento' ? 30 : 0) - c.ratingAvg * 3 + (hoursUnknown ? 15 : 0) + (avoid?.has(c.id) ? 60 : 0);
  return { c, travelMin, arrive, begin, leave: addMin(begin, stay), score, hoursUnknown };
}

export function planItinerary(candidates: readonly PlanCandidate[], req: PlanRequest): Plan {
  const stops: PlanStop[] = [];
  const used = new Set<string>();
  let t = req.start;
  let pos: LatLng = req.from;
  const wanted = Math.max(1, Math.floor(req.stops));
  while (stops.length < wanted && t < req.end) {
    // Share the time left between the stops still to go, so asking for many gives short visits instead of one long one.
    const budget = Math.max(MIN_STAY_MIN, minutesBetween(t, req.end) / (wanted - stops.length));
    let best: Fit | null = null;
    for (const c of candidates) {
      if (used.has(c.id)) continue;
      const f = fit(c, pos, t, req.end, budget, req.avoid);
      if (f && (!best || f.score < best.score || (f.score === best.score && f.c.id < best.c.id))) best = f;
    }
    if (!best) break;
    used.add(best.c.id);
    stops.push({ id: best.c.id, travelMin: best.travelMin, arrive: best.arrive, begin: best.begin, leave: best.leave, hoursUnknown: best.hoursUnknown });
    t = best.leave;
    pos = best.c;
  }
  return { stops, requested: wanted, short: stops.length < wanted };
}
