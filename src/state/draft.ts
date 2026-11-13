import { create } from 'zustand';
import { DEFAULT_LOCATION } from '@/domain/geo';
import type { Audience, Province, VuelticaType, VuelticaView } from '@/domain/types';
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
  /** INEC canton id; required for places (mi-vueltica-api #40). */
  cantonId: number | null;
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
  /** Set when editing a pending suggestion (`PUT /me/submissions/:id`); the type cannot change then. */
  editingId: string | null;
}

const base = (): Draft => {
  const d = now();
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7, 9, 0, 0);
  const end = new Date(day.getTime() + 7 * 3600_000);
  return {
    type: 'evento', name: '', category: '', description: '', lat: DEFAULT_LOCATION.lat, lng: DEFAULT_LOCATION.lng, address: '', province: 'San José', cantonId: null, hasLocation: false,
    date: day.toISOString(), start: day.toISOString(), end: end.toISOString(), openingHours: '', paid: false, price: '', freeStudents: false, freeSeniors: false,
    audiences: ['todo'], wheelchair: false, photos: [], confirm: false, editingId: null,
  };
};

/** The form prefilled with a pending suggestion, to edit it. */
export function draftFromVueltica(v: VuelticaView): Draft {
  const b = base();
  return {
    ...b,
    type: v.type, name: v.name, category: v.category, description: v.description, lat: v.lat, lng: v.lng, address: v.address, province: v.province,
    cantonId: v.cantonId ?? null, hasLocation: true,
    date: v.startAt ?? b.date, start: v.startAt ?? b.start, end: v.endAt ?? b.end, openingHours: v.openingHours ?? '',
    paid: v.pricePerPerson > 0 || !!v.priceUnknown, price: v.pricePerPerson > 0 && !v.priceUnknown ? String(v.pricePerPerson) : '',
    freeStudents: v.freeFor.includes('estudiantes'), freeSeniors: v.freeFor.includes('ciudadanosOro'),
    audiences: v.audiences.length ? v.audiences : ['todo'], wheelchair: v.wheelchair, photos: v.photos, confirm: true, editingId: v.id,
  };
}

interface DraftState {
  draft: Draft;
  patch: (p: Partial<Draft>) => void;
  reset: () => void;
  load: (d: Draft) => void;
}

/** New-vueltica form state, shared with the location picker. Not persisted (a discarded draft is gone). */
export const useDraft = create<DraftState>((set) => ({
  draft: base(),
  patch: (p) => set((s) => ({ draft: { ...s.draft, ...p } })),
  reset: () => set({ draft: base() }),
  load: (draft) => set({ draft }),
}));

export const isDirty = (d: Draft) => d.name.trim() !== '' || d.description.trim() !== '' || d.photos.length > 0 || d.hasLocation || d.category !== '' || d.price !== '';
