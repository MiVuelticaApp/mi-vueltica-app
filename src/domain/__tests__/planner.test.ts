import { openFor, planItinerary, travelMinutes, type PlanCandidate, type WeeklyHours } from '../planner';

// Tuesday 20 Oct 2026, Costa Rica time (UTC−6).
const at = (hm: string) => new Date(`2026-10-20T${hm}:00-06:00`);
const HOME = { lat: 9.9333, lng: -84.0833 };
// ~0.5 km apart, so each leg is the 5 minute minimum.
const near = (i: number) => ({ lat: 9.9333 + i * 0.004, lng: -84.0833 });
const ALL_DAY: WeeklyHours = Array.from({ length: 7 }, () => [[8 * 60, 18 * 60]] as [number, number][]);

const place = (id: string, i: number, hours: PlanCandidate['hours'] = ALL_DAY, ratingAvg = 4): PlanCandidate => ({ id, type: 'lugar', ...near(i), hours, ratingAvg });
const event = (id: string, i: number, start: string, end?: string): PlanCandidate => ({ id, type: 'evento', ...near(i), startAt: at(start), endAt: end ? at(end) : undefined, ratingAvg: 4 });

describe('planner (#32)', () => {
  it('travel time: at least 5 minutes, longer for far stops', () => {
    expect(travelMinutes(HOME, near(1))).toBe(5);
    expect(travelMinutes(HOME, { lat: 10.0, lng: -84.2 })).toBeGreaterThan(20);
  });

  it('opening hours: open, closed, unknown and always', () => {
    expect(openFor(ALL_DAY, at('10:00'))).toBe(8 * 60);
    expect(openFor(ALL_DAY, at('19:00'))).toBe(0);
    expect(openFor(null, at('10:00'))).toBeNull();
    expect(openFor('always', at('03:00'))).toBe(Infinity);
  });

  it('builds the asked number of stops in order, inside the window', () => {
    const plan = planItinerary([place('a', 1), place('b', 2), place('c', 3), place('d', 4)], { start: at('10:00'), end: at('14:00'), stops: 3, from: HOME });
    expect(plan.stops).toHaveLength(3);
    expect(plan.short).toBe(false);
    for (let i = 1; i < plan.stops.length; i++) expect(plan.stops[i].arrive.getTime()).toBeGreaterThanOrEqual(plan.stops[i - 1].leave.getTime());
    expect(plan.stops[plan.stops.length - 1].leave.getTime()).toBeLessThanOrEqual(at('14:00').getTime());
  });

  it('asking for 10 stops in half an hour returns only what fits (the two events)', () => {
    const plan = planItinerary([event('e1', 1, '13:30', '14:30'), event('e2', 2, '13:45', '14:30')], { start: at('13:25'), end: at('14:00'), stops: 10, from: HOME });
    expect(plan.stops.map((s) => s.id)).toEqual(['e1', 'e2']);
    expect(plan.short).toBe(true);
  });

  it('never schedules a closed place or an event outside its time', () => {
    const closed = place('closed', 1, Array.from({ length: 7 }, () => [[18 * 60, 20 * 60]] as [number, number][]));
    const past = event('past', 2, '08:00', '09:00');
    const tooLate = event('late', 3, '16:00', '17:00');
    const plan = planItinerary([closed, past, tooLate], { start: at('10:00'), end: at('12:00'), stops: 3, from: HOME });
    expect(plan.stops).toEqual([]);
    expect(plan.short).toBe(true);
  });

  it('prefers a fixed-time event, waits for it when it starts soon, and leaves a long event in time', () => {
    const plan = planItinerary([place('p', 1), event('e', 2, '10:20', '18:00')], { start: at('10:00'), end: at('12:00'), stops: 2, from: HOME });
    expect(plan.stops[0].id).toBe('e');
    expect(plan.stops[0].begin.getTime()).toBe(at('10:20').getTime());
    expect(plan.stops[1].id).toBe('p');
  });

  it('allows places with unknown hours, flagged, after the ones with known hours', () => {
    const plan = planItinerary([place('unknown', 1, null, 5), place('known', 1.5)], { start: at('10:00'), end: at('13:00'), stops: 2, from: HOME });
    expect(plan.stops.map((s) => [s.id, s.hoursUnknown])).toEqual([['known', false], ['unknown', true]]);
  });

  it('is deterministic, and "Otra opción" gives a different plan', () => {
    const cands = [place('a', 1), place('b', 2), place('c', 3), place('d', 4)];
    const req = { start: at('10:00'), end: at('12:00'), stops: 2, from: HOME };
    const first = planItinerary(cands, req);
    expect(planItinerary(cands, req)).toEqual(first);
    const other = planItinerary(cands, { ...req, avoid: new Set(first.stops.map((s) => s.id)) });
    expect(other.stops.map((s) => s.id)).not.toEqual(first.stops.map((s) => s.id));
  });

  it('no candidates → empty plan', () => {
    expect(planItinerary([], { start: at('10:00'), end: at('12:00'), stops: 2, from: HOME })).toEqual({ stops: [], requested: 2, short: true });
  });
});
