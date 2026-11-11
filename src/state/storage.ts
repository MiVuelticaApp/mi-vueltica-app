import { createJSONStorage } from 'zustand/middleware';
import { kv } from '@/data/storage/kv';

/** zustand `persist` storage backed by the app key-value store (sqlite kv on native, localStorage on web). */
export const persistStorage = createJSONStorage(() => ({
  getItem: (k: string) => kv.getItem(k),
  setItem: (k: string, v: string) => kv.setItem(k, v),
  removeItem: (k: string) => kv.removeItem(k),
}));
