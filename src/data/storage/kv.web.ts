import type { KeyValueStore } from './types';

const ls = () => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
};

const fallback = new Map<string, string>();

export const kv: KeyValueStore = {
  async getItem(k) {
    const s = ls();
    return s ? s.getItem(k) : (fallback.get(k) ?? null);
  },
  async setItem(k, v) {
    const s = ls();
    try {
      if (s) s.setItem(k, v);
      else fallback.set(k, v);
    } catch {
      fallback.set(k, v);
    }
  },
  async removeItem(k) {
    const s = ls();
    if (s) s.removeItem(k);
    fallback.delete(k);
  },
};
