import { create } from 'zustand';

/** Pin highlighted while its Detalle sheet is open (selected pins are always full strength). */
export const useMapSelection = create<{ id: string | null; set: (id: string | null) => void }>((set) => ({ id: null, set: (id) => set({ id }) }));
