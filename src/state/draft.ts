import { create } from 'zustand';
import { DEFAULT_LOCATION } from '@/domain/geo';
import type { Audience, Province, VuelticaType } from '@/domain/types';
import { now } from '@/lib/clock';

export interface Draft {
  type: VuelticaType;
  name: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  province: Province;
  hasLocation: boolean;
  date: string;
  start: string;
  end: string;
  openingHours: string;
  paid: boolean;
  price: string;
  freeStudents: boolean;
  freeSeniors: boolean;
  audiences: Audience[];
  wheelchair: boolean;
  photos: string[];
  confirm: boolean;
}

const base = (): Draft => {
  const d = now();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 9, 0, 0);
  const end = new Date(day.getTime() + 7 * 3600_000);
  return {
    type: 'evento', name: '', category: '', description: '', lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng, address: '', province: 'San José', hasLocation: false,
    date: day.toISOString(), start: day.toISOString(), end: end.toISOString(), openingHours: '', paid: false, price: '', freeStudents: false, freeSeniors: false,
    audiences: ['todo'], wheelchair: false, photos: [], confirm: false,
  };
};

interface DraftState {
  draft: Draft;
  patch: (p: Partial<Draft>) => void;
  reset: () => void;
}

/** New-vueltica form state, shared with the location picker. Not persisted (a discarded draft is gone). */
export const useDraft = create<DraftState>((set) => ({
  draft: base(),
  patch: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
  reset: () => set({ draft: base() }),
}));

export const isDirty = (d: Draft) => d.name.trim() !== '' || d.description.trim() !== '' || d.photos.length > 0 || d.hasLocation || d.category !== '' || d.price !== '';
