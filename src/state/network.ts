import { create } from 'zustand';
import { nowIso } from '@/lib/clock';

interface NetworkState {
  connected: boolean;
  /** Dev tool "Simular sin conexión" (also exposed to e2e through `window.__mv`). */
  simulatedOffline: boolean;
  lastOnlineAt: string | null;
  setConnected: (c: boolean) => void;
  setSimulated: (s: boolean) => void;
}

export const useNetwork = create<NetworkState>((set) => ({
  connected: true,
  simulatedOffline: false,
  lastOnlineAt: null,
  setConnected: (connected) => set((s) => ({ connected, lastOnlineAt: connected ? null : (s.lastOnlineAt ?? nowIso()) })),
  setSimulated: (simulatedOffline) => set((s) => ({ simulatedOffline, lastOnlineAt: simulatedOffline ? (s.lastOnlineAt ?? nowIso()) : null })),
}));

export const isOffline = () => {
  const s = useNetwork.getState();
  return !s.connected || s.simulatedOffline;
};

export const useIsOffline = () => useNetwork((s) => !s.connected || s.simulatedOffline);
