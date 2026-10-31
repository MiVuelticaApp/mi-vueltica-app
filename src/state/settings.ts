import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultSettings } from '@/data/mock/seed';
import type { Settings } from '@/domain/types';
import { persistStorage } from './storage';

interface SettingsState {
  settings: Settings;
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
}

/** Local source of truth for settings ("also stored locally for offline use"). Synced to the API by `useSyncSettings`. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings(),
      hydrated: false,
      update: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'mv.settings',
      storage: persistStorage,
      partialize: (s) => ({ settings: s.settings }),
      merge: (persisted, current) => ({ ...current, settings: { ...current.settings, ...((persisted as Partial<SettingsState>)?.settings ?? {}) } }),
      onRehydrateStorage: () => () => useSettings.setState({ hydrated: true }),
    },
  ),
);

export const getSettings = () => useSettings.getState().settings;
