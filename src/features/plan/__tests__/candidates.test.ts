import { hoursFromText } from '../candidates';

describe('plan candidates (#32): opening hours from the text the app shows', () => {
  it('reads day ranges (Sunday first)', () => {
    const h = hoursFromText('Mar–Dom · 8:30 a.m. – 4:30 p.m.');
    expect(h).not.toBeNull();
    const week = h as [number, number][][];
    expect(week[1]).toEqual([]); // Monday closed
    expect(week[2]).toEqual([[8 * 60 + 30, 16 * 60 + 30]]);
    expect(week[0]).toEqual([[8 * 60 + 30, 16 * 60 + 30]]);
  });

  it('"Todos los días" is every day, "Siempre abierta" is always, the rest is unknown', () => {
    const week = hoursFromText('Todos los días · 5:00 a.m. – 7:00 p.m.') as [number, number][][];
    expect(week.every((d) => d.length === 1 && d[0][0] === 300 && d[0][1] === 19 * 60)).toBe(true);
    expect(hoursFromText('Siempre abierta')).toBe('always');
    expect(hoursFromText('Gratis los domingos')).toBeNull();
    expect(hoursFromText(undefined)).toBeNull();
  });
});
