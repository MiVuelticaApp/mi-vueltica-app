import { isOffline } from '@/state/network';
import { useSession } from '@/state/session';
import type { MiVuelticaApi } from './api';
import { HttpApi } from './http/HttpApi';
import { HttpClient } from './http/client';
import { USE_HTTP_API } from './http/config';
import { MockApi } from './mock/MockApi';
import { kv } from './storage/kv';

/** Always available: the e2e hooks and `/__kit` use the mock directly. */
export const mockApi = new MockApi({ store: kv, isOffline });

const client = new HttpClient();
client.isOffline = isOffline;
const httpApi = new HttpApi(client, kv);
// An expired / revoked JWT: the client already dropped the token, so sign the UI out too.
client.onUnauthorized = () => {
  void httpApi.clearLocalSession();
  useSession.getState().setUser(null);
};

/**
 * The single place that chooses the backend: mi-vueltica-api when `EXPO_PUBLIC_API_URL` is set (not under e2e),
 * otherwise the in-app `MockApi` demo data.
 */
export const api: MiVuelticaApi = USE_HTTP_API ? httpApi : mockApi;
export { client as httpClient, kv };
