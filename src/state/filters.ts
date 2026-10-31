import { create } from 'zustand';
import { DEFAULT_FILTERS } from '@/domain/filters';
import type { Filters, SortKey } from '@/domain/types';

interface FiltersState {
  filters: Filters;
  sort: SortKey;
  /** "Todo / Lugares / Eventos" segment of Lista (kept in `filters.types`, mirrored here for the control). */
  set: (patch: Partial<Filters>) => void;
  reset: () => void;
  setSort: (s: SortKey) => void;
  toggleType: (t: 'lugar' | 'evento') => void;
}

export const useFilters = create<FiltersState>((set) => ({
  filters: DEFAULT_FILTERS,
  sort: 'cercanos',
  set: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  reset: () => set({ filters: DEFAULT_FILTERS }),
  setSort: (sort) => set({ sort }),
  toggleType: (t) =>
    set((s) => {
      const has = s.filters.types.includes(t);
      const next = has ? s.filters.types.filter((x) => x !== t) : [...s.filters.types, t];
      // Never allow "no type": switching off the last one goes back to both.
      return { filters: { ...s.filters, types: next.length === 0 ? ['lugar', 'evento'] : next } };
    }),
}));
