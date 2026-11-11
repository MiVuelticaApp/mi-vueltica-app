import Storage from 'expo-sqlite/kv-store';
import type { KeyValueStore } from './types';

export const kv: KeyValueStore = {
  getItem: (k) => Storage.getItem(k),
  setItem: (k, v) => Storage.setItem(k, v),
  removeItem: async (k) => {
    await Storage.removeItem(k);
  },
};
