import * as Location from 'expo-location';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';

export type LocationResult = 'granted' | 'denied' | 'unavailable';

/** Foreground-only permission + one position read. Never throws. */
export async function requestAndLocate(): Promise<LocationResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      useSettings.getState().update({ locationPermission: 'denied' });
      return 'denied';
    }
    useSettings.getState().update({ locationPermission: 'granted' });
    await refreshPosition();
    return 'granted';
  } catch {
    return 'unavailable';
  }
}

export async function refreshPosition(): Promise<boolean> {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    useSession.getState().setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    return true;
  } catch {
    return false;
  }
}

/** On launch: if the permission was already granted, read the position; if it was revoked, remember it. */
export async function syncLocationPermission(): Promise<void> {
  try {
    const perm = await Location.getForegroundPermissionsAsync();
    const status = perm.status === 'granted' ? 'granted' : perm.status === 'denied' ? 'denied' : 'undetermined';
    useSettings.getState().update({ locationPermission: status });
    if (status === 'granted') await refreshPosition();
    else useSession.getState().setCoords(null);
  } catch {
    /* location unavailable (e.g. web without geolocation) */
  }
}
