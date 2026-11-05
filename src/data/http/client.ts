import { AuthRequiredError, ConflictError, ForbiddenError, NotFoundError, OfflineError, ValidationError } from '../api';
import { API_BASE, REQUEST_TIMEOUT_MS } from './config';
import { tokenStore } from './tokenStore';

export type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Send the bearer token when there is one (default). `'required'` throws AuthRequiredError without a token. */
  auth?: boolean | 'required';
  reason?: AuthRequiredError['reason'];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface Page<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

function qs(q?: Query): string {
  if (!q) return '';
  const parts = Object.entries(q)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Thin fetch wrapper for mi-vueltica-api: bearer token, JSON, and the API's `{ message }` errors mapped to the app's error classes. */
export class HttpClient {
  /** Called when an authenticated request is answered with 401 (expired / revoked token). */
  onUnauthorized: () => void = () => {};
  /** Mirrors MockApi: the dev "Simular sin conexión" switch and the OS flag fail requests before they leave the device. */
  isOffline: () => boolean = () => false;

  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    if (!API_BASE) throw new Error('EXPO_PUBLIC_API_URL is not set');
    if (this.isOffline()) throw new OfflineError();
    const token = opts.auth === false ? null : await tokenStore.get();
    if (opts.auth === 'required' && !token) throw new AuthRequiredError(opts.reason ?? 'save');

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}${qs(opts.query)}`, {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        signal: ctrl.signal,
      });
    } catch {
      // fetch only rejects on network failure / timeout.
      throw new OfflineError();
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 204) return undefined as T;
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      /* empty or non-JSON body */
    }
    if (res.ok) return json as T;

    const message = (json as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
    switch (res.status) {
      case 401:
        if (token) {
          await tokenStore.clear();
          this.onUnauthorized();
        }
        throw new AuthRequiredError(opts.reason ?? 'save');
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError();
      case 409:
        throw new ConflictError(message);
      case 400:
      case 422:
        throw new ValidationError('', message);
      default:
        throw new ApiError(res.status, message);
    }
  }

  get = <T>(path: string, opts?: RequestOptions) => this.request<T>('GET', path, opts);
  post = <T>(path: string, body?: unknown, opts?: RequestOptions) => this.request<T>('POST', path, { ...opts, body });
  put = <T>(path: string, body?: unknown, opts?: RequestOptions) => this.request<T>('PUT', path, { ...opts, body });
  del = <T>(path: string, opts?: RequestOptions) => this.request<T>('DELETE', path, opts);

  /** Follows `page` until `total` is reached or `maxPages` is hit (the API caps `pageSize` at 100). */
  async getAll<T>(path: string, query: Query = {}, opts: RequestOptions = {}, maxPages = 5): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const res = await this.get<Page<T>>(path, { ...opts, query: { ...query, page, pageSize: 100 } });
      out.push(...res.data);
      if (out.length >= res.total || res.data.length === 0) break;
    }
    return out;
  }
}
