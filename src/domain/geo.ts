import type { LatLng } from './types';

export const DEFAULT_LOCATION: LatLng = { lat: 9.9333, lng: -84.0833 };

export const PROVINCE_CENTERS: Record<string, LatLng> = {
  'San José': { lat: 9.9333, lng: -84.0833 },
  Alajuela: { lat: 10.0162, lng: -84.2116 },
  Cartago: { lat: 9.8644, lng: -83.9194 },
  Heredia: { lat: 9.9987, lng: -84.1165 },
  Guanacaste: { lat: 10.6267, lng: -85.4437 },
  Puntarenas: { lat: 9.9763, lng: -84.8384 },
  Limón: { lat: 9.9907, lng: -83.0359 },
};

const R = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Bounding box (degrees) that contains a radius around a center. */
export function boundsAround(c: LatLng, km: number): Bounds {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.cos(toRad(c.lat)));
  return { north: c.lat + dLat, south: c.lat - dLat, east: c.lng + dLng, west: c.lng - dLng };
}

/** Equirectangular projection of a coordinate into a w×h box covering `b`. */
export function project(p: LatLng, b: Bounds, w: number, h: number): { x: number; y: number } {
  return {
    x: ((p.lng - b.west) / (b.east - b.west)) * w,
    y: ((b.north - p.lat) / (b.north - b.south)) * h,
  };
}

export function unproject(x: number, y: number, b: Bounds, w: number, h: number): LatLng {
  return { lng: b.west + (x / w) * (b.east - b.west), lat: b.north - (y / h) * (b.north - b.south) };
}

/** Zoom level ↔ degrees span helper (web-mercator-ish) for supercluster. */
export function zoomForLatDelta(latDelta: number): number {
  return Math.max(0, Math.min(20, Math.round(Math.log2(360 / Math.max(latDelta, 1e-6)))));
}
