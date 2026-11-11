import { DEFAULT_FILTERS } from '@/domain/filters';
import { AuthRequiredError, ConflictError, NotFoundError, NotSupportedError, OfflineError } from '../../api';
import { MemoryKV } from '../../storage/types';
import { HttpApi } from '../HttpApi';
import { HttpClient } from '../client';
import { formatOpeningHours, makeId, parseId } from '../mappers';
import { isOlder } from '../version';

jest.mock('../config', () => ({
  API_BASE: 'https://api.test/api/v1',
  API_URL: 'https://api.test',
  USE_HTTP_API: true,
  REQUEST_TIMEOUT_MS: 1000,
  GOOGLE_WEB_CLIENT_ID: undefined,
  GOOGLE_IOS_CLIENT_ID: undefined,
}));
const mockMem = new Map<string, string>();
jest.mock('../tokenStore', () => ({
  tokenStore: {
    get: async () => mockMem.get('t') ?? null,
    set: async (v: string) => void mockMem.set('t', v),
    clear: async () => void mockMem.clear(),
    getProvider: async () => mockMem.get('p') ?? null,
    setProvider: async (v: string) => void mockMem.set('p', v),
  },
}));
jest.mock('../socialAuth', () => ({
  appleSignIn: jest.fn(async () => ({ identityToken: 'apple-id-token', authorizationCode: 'code', firstName: 'Ana', lastName: 'Mora' })),
  appleAuthorizationCode: jest.fn(async () => 'fresh-code'),
  googleSignIn: jest.fn(async () => 'google-id-token'),
  googleSignOut: jest.fn(async () => {}),
}));

type Route = (url: URL, init: RequestInit) => { status?: number; body?: unknown };
let routes: Record<string, Route> = {};
const calls: { method: string; path: string; body?: unknown; auth?: string }[] = [];

beforeEach(() => {
  mockMem.clear();
  routes = {};
  calls.length = 0;
  global.fetch = jest.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/api/v1', '');
    const key = `${init.method ?? 'GET'} ${path}`;
    calls.push({ method: init.method ?? 'GET', path, body: init.body ? JSON.parse(String(init.body)) : undefined, auth: (init.headers as Record<string, string>)?.Authorization });
    const r = routes[key];
    if (!r) return new Response(JSON.stringify({ message: `no route ${key}` }), { status: 404 });
    const out = r(url, init);
    return new Response(out.status === 204 ? null : JSON.stringify(out.body ?? {}), { status: out.status ?? 200 });
  }) as typeof fetch;
});

const page = <T,>(data: T[]) => ({ data, page: 1, pageSize: 100, total: data.length });
const CATS = page([{ id: 1, name: 'Museos' }, { id: 2, name: 'Parques' }]);
const PLACE = {
  id: 'aaaa', cantonId: 101, categoryId: 1, sourceId: null, name: 'Museo del Jade', description: 'Joyas', latitude: 9.9366, longitude: -84.0727,
  address: 'Calle 13', openingHours: { monday: [{ open: '09:00', close: '17:00' }], tuesday: [{ open: '09:00', close: '17:00' }] }, targetAudience: 'EVERYONE',
  status: 'PUBLISHED', verifiedAt: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
};
const USER = { id: 'u1', email: 'ana@x.cr', name: 'Ana', surnames: 'Mora', ageRange: null, role: 'USER' };

const make = () => {
  const client = new HttpClient();
  return { api: new HttpApi(client, new MemoryKV()), client };
};
const LOC = { lat: 9.9333, lng: -84.0833 };

describe('ids and mappers', () => {
  it('round-trips prefixed ids', () => {
    expect(parseId(makeId('e', 'abc-1'))).toEqual({ kind: 'e', uuid: 'abc-1' });
    expect(parseId('abc')).toEqual({ kind: 'p', uuid: 'abc' });
  });
  it('groups consecutive days with the same hours', () => {
    expect(formatOpeningHours(PLACE.openingHours)).toBe('Lun–Mar · 9:00 a.m.–5:00 p.m.');
    expect(formatOpeningHours(null)).toBeUndefined();
  });
  it('compares semver', () => {
    expect(isOlder('1.0.0', '1.2.0')).toBe(true);
    expect(isOlder('1.2.0', '1.2.0')).toBe(false);
    expect(isOlder('2.0.0', '1.9.9')).toBe(false);
  });
});

describe('HttpClient errors', () => {
  it('maps network failure to OfflineError', async () => {
    global.fetch = jest.fn(async () => { throw new TypeError('Network request failed'); }) as typeof fetch;
    await expect(new HttpClient().get('/categories')).rejects.toBeInstanceOf(OfflineError);
  });
  it('maps statuses to app errors and signals 401 only for authenticated calls', async () => {
    const client = new HttpClient();
    const onUnauthorized = jest.fn();
    client.onUnauthorized = onUnauthorized;
    routes['GET /x'] = () => ({ status: 401, body: { message: 'no' } });
    await expect(client.get('/x', { auth: false })).rejects.toBeInstanceOf(AuthRequiredError);
    expect(onUnauthorized).not.toHaveBeenCalled();
    mockMem.set('t', 'jwt');
    await expect(client.get('/x')).rejects.toBeInstanceOf(AuthRequiredError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(mockMem.has('t')).toBe(false);
    routes['GET /y'] = () => ({ status: 409, body: { message: 'dup' } });
    await expect(client.get('/y')).rejects.toBeInstanceOf(ConflictError);
    routes['GET /z'] = () => ({ status: 404 });
    await expect(client.get('/z')).rejects.toBeInstanceOf(NotFoundError);
  });
  it('requires a token when asked', async () => {
    await expect(new HttpClient().get('/me', { auth: 'required' })).rejects.toBeInstanceOf(AuthRequiredError);
    expect(calls).toHaveLength(0);
  });
  it('honours the offline switch before touching the network', async () => {
    const client = new HttpClient();
    client.isOffline = () => true;
    await expect(client.get('/categories')).rejects.toBeInstanceOf(OfflineError);
    expect(calls).toHaveLength(0);
  });
});

describe('HttpApi', () => {
  it('lists places near the user, mapped to the app model, with distance filtering', async () => {
    const { api } = make();
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /places'] = (u) => {
      expect(u.searchParams.get('radiusKm')).toBe('5');
      expect(u.searchParams.get('lat')).toBe(String(LOC.lat));
      return { body: page([PLACE, { ...PLACE, id: 'far', latitude: 10.6, longitude: -85.4 }]) };
    };
    routes['GET /events'] = () => ({ body: page([]) });
    const res = await api.listVuelticas({ filters: DEFAULT_FILTERS, location: LOC });
    expect(res.items.map((v) => v.id)).toEqual(['p-aaaa']); // the far one is dropped by nearMe/distanceKm
    expect(res.items[0]).toMatchObject({ type: 'lugar', category: 'Museos', province: 'San José', openingHours: 'Lun–Mar · 9:00 a.m.–5:00 p.m.' });
  });

  it('maps events through their place and skips events without one', async () => {
    const { api } = make();
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /places'] = () => ({ body: page([]) });
    routes['GET /places/aaaa'] = () => ({ body: PLACE });
    const ev = { id: 'e1', placeId: 'aaaa', categoryId: 2, sourceId: null, title: 'Noche', description: null, startsAt: '2026-10-24T00:00:00.000Z', endsAt: null, targetAudience: 'SENIORS', status: 'PUBLISHED', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' };
    routes['GET /events'] = () => ({ body: page([ev, { ...ev, id: 'e2', placeId: null }]) });
    const res = await api.listVuelticas({ filters: DEFAULT_FILTERS, location: LOC });
    expect(res.items.map((v) => v.id)).toEqual(['e-e1']);
    expect(res.items[0]).toMatchObject({ type: 'evento', audiences: ['ciudadanosOro'], lat: PLACE.latitude });
  });

  it('signs in with Google, stores the token and returns the app user', async () => {
    const { api } = make();
    routes['POST /auth/google'] = () => ({ body: { user: USER, token: 'jwt', expiresIn: '7d' } });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    const u = await api.signIn({ provider: 'google' });
    expect(calls[0].body).toEqual({ token: 'google-id-token' });
    expect(u).toMatchObject({ id: 'u1', displayName: 'Ana Mora', initials: 'AM', provider: 'google', email: 'ana@x.cr' });
    expect(mockMem.get('t')).toBe('jwt');
    expect((await api.currentUser())?.id).toBe('u1');
    expect(calls.at(-1)?.auth).toBe('Bearer jwt');
  });

  it('sends the Apple identity token and name', async () => {
    const { api } = make();
    routes['POST /auth/apple'] = () => ({ body: { user: USER, token: 'jwt', expiresIn: '7d' } });
    await api.signIn({ provider: 'apple' });
    expect(calls[0].body).toEqual({ identityToken: 'apple-id-token', firstName: 'Ana', lastName: 'Mora' });
  });

  it('refuses email sign-in (no such endpoint)', async () => {
    await expect(make().api.signIn({ provider: 'email', email: 'a@b.cr' })).rejects.toBeInstanceOf(NotSupportedError);
  });

  it('keeps the user signed in from cache when offline, and signs out on 401', async () => {
    const store = new MemoryKV();
    const first = new HttpApi(new HttpClient(), store);
    routes['POST /auth/google'] = () => ({ body: { user: USER, token: 'jwt', expiresIn: '7d' } });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    await first.signIn({ provider: 'google' });

    const relaunched = new HttpApi(new HttpClient(), store);
    global.fetch = jest.fn(async () => { throw new TypeError('offline'); }) as typeof fetch;
    expect((await relaunched.currentUser())?.id).toBe('u1');

    global.fetch = jest.fn(async () => new Response('{}', { status: 401 })) as typeof fetch;
    expect(await relaunched.currentUser()).toBeNull();
    expect(mockMem.has('t')).toBe(false);
  });

  it('creates a place submission with the central canton of the province and the category id', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    routes['POST /me/submissions'] = (_u, init) => {
      const b = JSON.parse(String(init.body));
      return { status: 201, body: { id: 's1', userId: 'u1', type: b.type, data: b.data, status: 'PENDING', reviewedById: null, reviewedAt: null, reviewNote: null, createdAt: '2026-10-20T00:00:00.000Z' } };
    };
    const out = await api.createVueltica({
      type: 'lugar', name: ' Parque ', category: 'parques', description: 'Lindo', lat: 10.0, lng: -84.1, address: 'Heredia centro', province: 'Heredia',
      pricePerPerson: 0, freeFor: [], audiences: ['familias'], wheelchair: false, photos: [],
    });
    const body = calls.find((c) => c.path === '/me/submissions')!.body as { type: string; data: Record<string, unknown> };
    expect(body.type).toBe('PLACE');
    expect(body.data).toMatchObject({ cantonId: 401, categoryId: 2, name: 'Parque', targetAudience: 'CHILDREN', latitude: 10.0 });
    expect(out.vueltica).toMatchObject({ id: 's-s1', status: 'pendiente', name: 'Parque' });
    expect(out.moderation.votesNeeded).toBe(1);
  });

  it('favorites places and refuses events', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['PUT /places/aaaa/favorite'] = () => ({ status: 204 });
    await api.saveVueltica('p-aaaa');
    expect(calls[0]).toMatchObject({ method: 'PUT', path: '/places/aaaa/favorite' });
    await expect(api.saveVueltica('e-1')).rejects.toBeInstanceOf(NotSupportedError);
  });

  it('degrades unsupported reads and rejects unsupported writes', async () => {
    const { api } = make();
    expect((await api.listReviews({ vuelticaId: 'p-1', sort: 'recientes' })).items).toEqual([]);
    expect(await api.flushQueuedVerifications()).toBe(0);
    await expect(api.report({ vuelticaId: 'p-1', reason: 'spam' })).rejects.toBeInstanceOf(NotSupportedError);
    await expect(api.verify({ vuelticaId: 'p-1', stillHappening: 'si' })).rejects.toBeInstanceOf(NotSupportedError);
  });

  it('moderation: approve publishes, reject sends a reason; non-moderators see an empty queue', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /me'] = () => ({ body: { ...USER, role: 'MODERATOR', interests: [] } });
    routes['POST /submissions/s1/approve'] = () => ({ body: {} });
    routes['POST /submissions/s2/reject'] = () => ({ body: {} });
    await api.vote({ vuelticaId: 's-s1', choice: 'for' });
    await api.vote({ vuelticaId: 's-s2', choice: 'against' });
    expect(calls.find((c) => c.path === '/submissions/s2/reject')?.body).toEqual({ reason: expect.any(String) });
    expect((await api.reputationSummary()).level.number).toBe(3);
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    expect(await make().api.moderationCount()).toBe(0); // plain user: no request to /submissions
  });

  it('deletes the account asking Apple for a fresh code, then clears the session', async () => {
    const { api } = make();
    routes['POST /auth/apple'] = () => ({ body: { user: USER, token: 'jwt', expiresIn: '7d' } });
    routes['POST /me'] = () => ({ status: 204 });
    await api.signIn({ provider: 'apple' });
    await api.deleteAccount();
    expect(calls.find((c) => c.path === '/me' && c.method === 'POST')?.body).toEqual({ appleAuthCode: 'fresh-code' });
    expect(mockMem.has('t')).toBe(false);
  });
});
