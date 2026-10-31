import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { kv } from '@/data/storage/kv';

export const queryClient = new QueryClient({
  defaultOptions: {
    // The mock decides offline behavior itself (OfflineError), so never pause on the OS flag.
    // retryOnMount: false: an errored (offline) query must not refetch on every mount, or screens that swap
    // skeleton/error/offline views loop forever (B5).
    queries: { networkMode: 'always', retryOnMount: false, staleTime: 15_000, gcTime: 7 * 24 * 3600_000, retry: 1 },
    mutations: { networkMode: 'always' },
  },
});

const KEY = 'mv.rq-cache';

/** Persists the query cache so saved and recently viewed plans are available offline (NFR-17). */
export const queryPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      await kv.setItem(KEY, JSON.stringify(client));
    } catch {
      /* ignore quota errors */
    }
  },
  restoreClient: async () => {
    try {
      const raw = await kv.getItem(KEY);
      return raw ? (JSON.parse(raw) as PersistedClient) : undefined;
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    await kv.removeItem(KEY);
  },
};

const PERSISTED = new Set(['list', 'detail', 'saved', 'recent']);
export const persistOptions = {
  persister: queryPersister,
  maxAge: 7 * 24 * 3600_000,
  dehydrateOptions: { shouldDehydrateQuery: (q: { state: { status: string }; queryKey: readonly unknown[] }) => q.state.status === 'success' && PERSISTED.has(String(q.queryKey[0])) },
};
