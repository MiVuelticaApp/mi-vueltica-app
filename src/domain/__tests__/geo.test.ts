import { inBounds, queryBounds } from '../geo';

describe('map area (#37)', () => {
  it('pads the visible area by a fifth and rounds it outward to 0.01°', () => {
    expect(queryBounds({ south: 9.9, north: 10, west: -84.2, east: -84 })).toEqual({ south: 9.88, north: 10.02, west: -84.24, east: -83.96 });
  });

  it('gives the same area for small pans, so the cached answer is reused', () => {
    const a = queryBounds({ south: 9.901, north: 10.001, west: -84.201, east: -84.001 });
    const b = queryBounds({ south: 9.903, north: 10.003, west: -84.203, east: -84.003 });
    expect(a).toEqual(b);
  });

  it('checks whether a point is inside', () => {
    const area = { south: 9, north: 10, west: -85, east: -84 };
    expect(inBounds(area, { lat: 9.5, lng: -84.5 })).toBe(true);
    expect(inBounds(area, { lat: 10.5, lng: -84.5 })).toBe(false);
  });
});
