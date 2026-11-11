import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LatLng, Province, User } from '@/domain/types';
import { persistStorage } from './storage';

export type PendingAction =
  | { kind: 'save'; id: string }
  | { kind: 'review'; id: string }
  | { kind: 'contribute' }
  | { kind: 'moderate' }
  | { kind: 'useful'; reviewId: string }
  | null;

interface SessionState {
  user: User | null;
  userLoaded: boolean;
  /** First-run flow (08) finished (allow / province / "Ahora no"). */
  onboarded: boolean;
  coords: LatLng | null;
  province: Province | null;
  pending: PendingAction;
  hydrated: boolean;
  setUser: (u: User | null) => void;
  setOnboarded: (v: boolean) => void;
  setCoords: (c: LatLng | null) => void;
  setProvince: (p: Province | null) => void;
  setPending: (p: PendingAction) => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      userLoaded: false,
      onboarded: false,
      coords: null,
      province: null,
      pending: null,
      hydrated: false,
      setUser: (user) => set({ user, userLoaded: true }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setCoords: (coords) => set({ coords }),
      setProvince: (province) => set({ province }),
      setPending: (pending) => set({ pending }),
    }),
    {
      name: 'mv.session',
      storage: persistStorage,
      partialize: (s) => ({ onboarded: s.onboarded, province: s.province }),
      onRehydrateStorage: () => () => useSession.setState({ hydrated: true }),
    },
  ),
);
