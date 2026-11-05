/**
 * Backend configuration. `EXPO_PUBLIC_API_URL` is the origin of mi-vueltica-api (e.g. `https://api.example.com`);
 * the `/api/v1` prefix is added here. Leave it unset to run against the in-app `MockApi`.
 */
const raw = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

export const API_URL: string | null = raw ? raw : null;
export const API_BASE = API_URL ? `${API_URL}/api/v1` : null;

/** Never use the real backend in the Playwright/Jest runs: they rely on the deterministic mock. */
export const USE_HTTP_API = !!API_BASE && process.env.EXPO_PUBLIC_E2E !== '1';

/** Google OAuth client ids (the API verifies the id token against its iOS and Android client ids). */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export const REQUEST_TIMEOUT_MS = 15_000;
