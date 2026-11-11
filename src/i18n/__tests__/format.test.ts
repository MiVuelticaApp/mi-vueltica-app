import { formatCRC, formatDistance, formatEventWhen, formatLongDate, formatTime, formatTimeRange, initialsOf } from '../format';

describe('formatCRC', () => {
  it('uses dots as thousands separator with the colon sign', () => {
    expect(formatCRC(5000)).toBe('₡5.000');
    expect(formatCRC(2500)).toBe('₡2.500');
    expect(formatCRC(0)).toBe('₡0');
    expect(formatCRC(1234567)).toBe('₡1.234.567');
  });
});

describe('dates', () => {
  it('formats long dates in Spanish', () => {
    expect(formatLongDate(new Date(2026, 9, 24))).toBe('Sábado 24 de octubre');
    expect(formatLongDate(new Date(2025, 9, 24))).toBe('Viernes 24 de octubre');
  });
  it('formats 12-hour time with a.m./p.m.', () => {
    expect(formatTime(new Date(2026, 0, 1, 18, 0))).toBe('6:00 p.m.');
    expect(formatTime(new Date(2026, 0, 1, 0, 5))).toBe('12:05 a.m.');
    expect(formatTime(new Date(2026, 0, 1, 12, 0))).toBe('12:00 p.m.');
  });
  it('formats ranges', () => {
    expect(formatTimeRange(new Date(2026, 0, 1, 18), new Date(2026, 0, 1, 22))).toBe('6–10 p.m.');
    expect(formatTimeRange(new Date(2026, 0, 1, 9), new Date(2026, 0, 1, 14, 30))).toBe('9:00 a.m.–2:30 p.m.');
  });
  it('formats event strings', () => {
    expect(formatEventWhen('2026-10-24T18:00:00-06:00', '2026-10-24T22:00:00-06:00')).toContain('de octubre');
  });
});

describe('misc', () => {
  it('formats distance with a decimal comma', () => {
    expect(formatDistance(2.4)).toBe('2,4 km');
    expect(formatDistance(0.45)).toMatch(/m$/);
  });
  it('computes initials', () => {
    expect(initialsOf('Ana Mora')).toBe('AM');
    expect(initialsOf('Pablo')).toBe('P');
  });
});
