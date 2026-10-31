import { activeFilterCount, applyFilters, DEFAULT_FILTERS, sortVuelticas, summarize, weekendRange } from '../filters';
import type { VuelticaView } from '../types';

const base: VuelticaView = {
  id: 'a', type: 'lugar', name: 'Parque', category: 'Parque', description: '', photos: [], lat: 0, lng: 0, address: 'San José', province: 'San José',
  priceTier: 'gratis', pricePerPerson: 0, freeFor: [], audiences: ['todo'], wheelchair: false, status: 'publicada', authorId: null, authorName: 'x',
  createdAt: '2026-01-01T00:00:00Z', verificationCount: 0, ratingAvg: 4, ratingCount: 1, views: 0, distanceKm: 1,
};
const mk = (o: Partial<VuelticaView>): VuelticaView => ({ ...base, ...o });
const now = new Date('2026-10-20T10:00:00-06:00'); // Tuesday

describe('filters', () => {
  const list = [
    mk({ id: '1' }),
    mk({ id: '2', priceTier: 'hasta2500', audiences: ['estudiantes'], distanceKm: 3 }),
    mk({ id: '3', type: 'evento', priceTier: 'hasta5000', freeFor: ['estudiantes'], distanceKm: 6, startAt: '2026-10-24T18:00:00-06:00', endAt: '2026-10-24T22:00:00-06:00' }),
  ];
  it('limits to 5 km when nearMe is on (default)', () => {
    expect(applyFilters(list, DEFAULT_FILTERS, now).map((v) => v.id)).toEqual(['1', '2']);
  });
  it('filters by price and students', () => {
    expect(applyFilters(list, { ...DEFAULT_FILTERS, maxPrice: 'gratis' }, now).map((v) => v.id)).toEqual(['1']);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, students: true }, now).map((v) => v.id)).toEqual(['2']);
  });
  it('respects the user max price setting', () => {
    expect(applyFilters(list, DEFAULT_FILTERS, now, 'gratis').map((v) => v.id)).toEqual(['1']);
  });
  it('matches the weekend for events and keeps places', () => {
    const f = { ...DEFAULT_FILTERS, distanceKm: 5, date: 'finDeSemana' as const };
    expect(applyFilters(list, f, now).map((v) => v.id)).toEqual(['1', '2']);
    const wide = [mk({ id: 'e', type: 'evento', startAt: '2026-10-24T18:00:00-06:00', endAt: '2026-10-24T22:00:00-06:00' })];
    expect(applyFilters(wide, f, now)).toHaveLength(1);
    expect(applyFilters(wide, { ...f, date: 'hoy' }, now)).toHaveLength(0);
  });
  it('searches names ignoring accents and case', () => {
    const l = [mk({ name: 'Museo de los Niños' })];
    expect(applyFilters(l, { ...DEFAULT_FILTERS, text: 'MUSEO ninos' }, now)).toHaveLength(1);
    expect(applyFilters(l, { ...DEFAULT_FILTERS, text: 'zzz' }, now)).toHaveLength(0);
  });
  it('counts active filters', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, students: true })).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, students: true, maxPrice: 'gratis', types: ['lugar'] })).toBe(3);
  });
  it('sorts and summarizes', () => {
    expect(sortVuelticas(list, 'cercanos', now)[0].id).toBe('1');
    expect(sortVuelticas(list, 'fecha', now)[0].id).toBe('3');
    expect(summarize(list)).toEqual({ count: 3, free: 1 });
  });
  it('computes the weekend range', () => {
    const r = weekendRange(now);
    expect(r.from.getDay()).toBe(6);
    expect(r.to.getDay()).toBe(0);
  });
});
