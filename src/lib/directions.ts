import { Linking, Platform } from 'react-native';
import type { SettingsDirections, VuelticaView } from '@/domain/types';

export type DirectionsApp = Exclude<SettingsDirections, 'preguntar'>;

/** Apple Maps is offered on iOS only (FR-8.1). */
export const availableApps = (): DirectionsApp[] => (Platform.OS === 'ios' ? ['apple', 'waze', 'google'] : ['waze', 'google']);

export function directionsUrl(app: DirectionsApp, v: Pick<VuelticaView, 'lat' | 'lng' | 'name'>): string {
  const ll = `${v.lat},${v.lng}`;
  switch (app) {
    case 'apple':
      return `maps://?daddr=${ll}&q=${encodeURIComponent(v.name)}`;
    case 'waze':
      return `https://waze.com/ul?ll=${ll}&navigate=yes`;
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&destination=${ll}`;
  }
}

/** Opens the chosen maps app (universal links fall back to the browser when the app is not installed). */
export async function openDirections(app: DirectionsApp, v: Pick<VuelticaView, 'lat' | 'lng' | 'name'>): Promise<boolean> {
  try {
    await Linking.openURL(directionsUrl(app, v));
    return true;
  } catch {
    return false;
  }
}
