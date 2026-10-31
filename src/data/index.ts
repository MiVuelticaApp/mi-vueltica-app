import { isOffline } from '@/state/network';
import type { MiVuelticaApi } from './api';
import { MockApi } from './mock/MockApi';
import { kv } from './storage/kv';

/**
 * The single place that chooses the backend. Swap `MockApi` for `HttpApi` here when the real API exists.
 */
export const mockApi = new MockApi({ store: kv, isOffline });
export const api: MiVuelticaApi = mockApi;
export { kv };
