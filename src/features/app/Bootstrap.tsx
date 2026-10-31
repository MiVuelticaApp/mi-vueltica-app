import * as Network from 'expo-network';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api, mockApi } from '@/data';
import { useInvalidateAll } from '@/data/queries';
import { useResumePending } from '@/features/auth/useResumePending';
import { syncLocationPermission } from '@/lib/location';
import { setupNotificationHandler, syncReminders } from '@/lib/notifications';
import { queryClient } from '@/lib/queryClient';
import { useIsOffline, useNetwork } from '@/state/network';
import { useSession } from '@/state/session';
import { useSettings } from '@/state/settings';

/** Renders nothing; wires app-wide side effects (network, user, settings sync, reminders, e2e hooks). */
export function Bootstrap() {
  const onboarded = useSession((s) => s.onboarded);
  const user = useSession((s) => s.user);
  const settings = useSettings((s) => s.settings);
  const offline = useIsOffline();
  const invalidate = useInvalidateAll();
  useResumePending();

  useEffect(() => {
    setupNotificationHandler();
    void api.currentUser().then((u) => useSession.getState().setUser(u));
    void api.getSettings().then(() => {});
    let mounted = true;
    void Network.getNetworkStateAsync().then((s) => mounted && useNetwork.getState().setConnected(s.isConnected !== false)).catch(() => {});
    const sub = Network.addNetworkStateListener((s) => useNetwork.getState().setConnected(s.isConnected !== false));
    if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_E2E === '1') {
      // Test hooks for Playwright (never present in production builds).
      (globalThis as unknown as { __mv: unknown }).__mv = {
        api: mockApi,
        queryClient,
        setOffline: (v: boolean) => useNetwork.getState().setSimulated(v),
        simulate: (i: Parameters<typeof api.simulateCommunity>[0]) => api.simulateCommunity(i).then(() => queryClient.invalidateQueries()),
        reset: async () => { await mockApi.reset(); await queryClient.invalidateQueries(); },
      };
    }
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (onboarded) void syncLocationPermission();
  }, [onboarded]);

  // Local mirror of settings → "backend"; then re-create the local reminders from it.
  useEffect(() => {
    void api.updateSettings(settings).then(() => (useSession.getState().user ? syncReminders() : undefined));
  }, [settings]);

  // Back online: send queued verifications and refresh everything.
  useEffect(() => {
    if (offline) return;
    void api.flushQueuedVerifications().then((n) => (n > 0 ? invalidate() : undefined)).catch(() => {});
  }, [offline, invalidate]);

  useEffect(() => {
    if (user) void syncReminders();
  }, [user]);

  return null;
}
