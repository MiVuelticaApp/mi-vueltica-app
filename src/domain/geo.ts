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

/** Zoom level ↔ degrees span helper (web-mercator-ish) for supercluster. */
export function zoomForLatDelta(latDelta: number): number {
  return Math.max(0, Math.min(20, Math.round(Math.log2(360 / Math.max(latDelta, 1e-6)))));
}
