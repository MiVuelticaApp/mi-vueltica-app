import { DEFAULT_FILTERS } from '@/domain/filters';
import { AuthRequiredError, ConflictError, DuplicateReportError, ForbiddenError, NotFoundError, OfflineError } from '../../api';
import { MemoryKV } from '../../storage/types';
import { HttpApi } from '../HttpApi';
import { HttpClient } from '../client';
import { formatOpeningHours, makeId, parseId, parseOpeningHours } from '../mappers';
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
const REVIEW = {
  id: 'r1', placeId: 'aaaa', eventId: null, rating: 4, comment: 'Bonito', wentWith: 'familia', spent: 'menos2500', photos: [], usefulCount: 0, markedUsefulByMe: false,
  status: 'PUBLISHED', createdAt: '2026-10-10T00:00:00.000Z', author: { id: 'u2', name: 'Ana', initials: 'AM' }, place: { id: 'aaaa', name: 'Museo' }, event: null,
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
  it('parses the contribute form hours back, or gives up', () => {
    expect(parseOpeningHours('Lun-Vie 8am-4pm, Sáb 9:00 a.m. – 12:00 p.m.')).toEqual({
      monday: [{ open: '08:00', close: '16:00' }], tuesday: [{ open: '08:00', close: '16:00' }], wednesday: [{ open: '08:00', close: '16:00' }],
      thursday: [{ open: '08:00', close: '16:00' }], friday: [{ open: '08:00', close: '16:00' }], saturday: [{ open: '09:00', close: '12:00' }],
    });
    expect(parseOpeningHours(formatOpeningHours(PLACE.openingHours))).toEqual(PLACE.openingHours);
    expect(parseOpeningHours('Todos los días')).toBeUndefined();
    expect(parseOpeningHours('Lun 5pm-9am')).toBeUndefined();
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

  it('maps events with their resolved location, price and audiences, and skips events without one', async () => {
    const { api } = make();
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /places'] = () => ({ body: page([]) });
    const ev = {
      id: 'e1', placeId: null, categoryId: 2, sourceId: null, title: 'Noche', description: null, startsAt: '2026-10-24T00:00:00.000Z', endsAt: null,
      latitude: 9.94, longitude: -84.08, address: 'Parque Central', place: null, targetAudience: 'EVERYONE', pricePerPerson: 2000, priceTier: 'hasta2500',
      freeFor: ['estudiantes'], audiences: ['familias', 'estudiantes'], wheelchair: true, status: 'PUBLISHED', hiddenReason: null, authorName: 'Ana M.',
      averageRating: 4.5, reviewCount: 2, coverPhotoUrl: 'https://api.test/api/v1/files/x', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
    };
    routes['GET /events'] = (u) => {
      expect(u.searchParams.get('radiusKm')).toBe('5'); // geo filter on events too (#37)
      return { body: page([ev, { ...ev, id: 'e2', latitude: null, longitude: null }]) };
    };
    const res = await api.listVuelticas({ filters: DEFAULT_FILTERS, location: LOC });
    expect(res.items.map((v) => v.id)).toEqual(['e-e1']);
    expect(res.items[0]).toMatchObject({
      type: 'evento', lat: 9.94, address: 'Parque Central', province: 'San José', priceTier: 'hasta2500', pricePerPerson: 2000, freeFor: ['estudiantes'],
      audiences: ['familias', 'estudiantes'], wheelchair: true, authorName: 'Ana M.', ratingAvg: 4.5, ratingCount: 2, photos: ['https://api.test/api/v1/files/x'],
    });
    expect(calls.filter((c) => c.path.startsWith('/places/'))).toHaveLength(0); // no N+1 any more
  });

  it('shows an unknown price as the hasta5000 tier and sends the price filters to the API', async () => {
    const { api } = make();
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /events'] = () => ({ body: page([]) });
    const sent: (string | null)[][] = [];
    routes['GET /places'] = (u) => {
      sent.push([u.searchParams.get('maxPrice'), u.searchParams.get('students')]);
      return { body: page([{ ...PLACE, pricePerPerson: null, priceTier: null, audiences: ['todo'], freeFor: ['estudiantes'] }]) };
    };
    const res = await api.listVuelticas({ filters: { ...DEFAULT_FILTERS, students: true, maxPrice: 'gratis' }, location: LOC });
    // The client re-applies the rules: an unknown price is "hasta ₡5.000", so it does not pass "solo gratis".
    expect(res.items).toHaveLength(0);
    const all = await api.listVuelticas({ filters: DEFAULT_FILTERS, location: LOC });
    expect(all.items[0]).toMatchObject({ priceTier: 'hasta5000', pricePerPerson: 5000 });
    expect(sent).toEqual([['gratis', 'true'], ['hasta5000', null]]);
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

  it('creates a place submission with the price fields, uploaded photos and parsed opening hours', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    routes['POST /uploads'] = () => ({ status: 201, body: { id: 'up1', url: 'https://api.test/api/v1/files/up1' } });
    routes['POST /me/submissions'] = (_u, init) => {
      const b = JSON.parse(String(init.body));
      return { status: 201, body: { id: 's1', userId: 'u1', type: b.type, data: b.data, status: 'PENDING', reviewedAt: null, reviewNote: null, created: null, createdAt: '2026-10-20T00:00:00.000Z' } };
    };
    const out = await api.createVueltica({
      type: 'lugar', name: ' Parque ', category: 'parques', description: 'Lindo', lat: 10.0, lng: -84.1, address: 'Heredia centro', province: 'Heredia',
      openingHours: 'Mar–Dom · 9:00 a.m. – 5:00 p.m.',
      pricePerPerson: 1500, freeFor: ['ciudadanosOro'], audiences: ['familias'], wheelchair: true, photos: ['https://cdn.test/a.jpg'],
    });
    const body = calls.find((c) => c.path === '/me/submissions')!.body as { type: string; data: Record<string, unknown> };
    expect(body.type).toBe('PLACE');
    expect(body.data).toMatchObject({
      cantonId: 401, categoryId: 2, name: 'Parque', targetAudience: 'CHILDREN', latitude: 10.0, pricePerPerson: 1500, freeFor: ['ciudadanosOro'],
      audiences: ['familias'], wheelchair: true, photos: ['https://cdn.test/a.jpg'],
    });
    expect((body.data.openingHours as Record<string, unknown>).sunday).toEqual([{ open: '09:00', close: '17:00' }]);
    expect(body.data.openingHours).not.toHaveProperty('monday');
    expect(out.vueltica).toMatchObject({ id: 's-s1', status: 'pendiente', name: 'Parque', priceTier: 'hasta2500' });
    expect(out.moderation.votesNeeded).toBe(5); // level 1 author
  });

  it('sends an event suggestion with its own location', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    routes['POST /me/submissions'] = (_u, init) => ({ status: 201, body: { id: 's2', userId: 'u1', type: 'EVENT', data: JSON.parse(String(init.body)).data, status: 'PENDING', reviewedAt: null, reviewNote: null, createdAt: '2026-10-20T00:00:00.000Z' } });
    await api.createVueltica({
      type: 'evento', name: 'Feria', category: 'Museos', description: '', lat: 9.9, lng: -84.0, address: 'Plaza', province: 'San José', startAt: '2026-11-01T15:00:00.000Z',
      pricePerPerson: 0, freeFor: [], audiences: ['todo'], wheelchair: false, photos: [],
    });
    const data = (calls.find((c) => c.path === '/me/submissions')!.body as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ placeId: null, latitude: 9.9, longitude: -84.0, address: 'Plaza', title: 'Feria', startsAt: '2026-11-01T15:00:00.000Z', pricePerPerson: 0 });
  });

  it('sends the canton picked in the form (#11), and lists cantons from the API', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    routes['GET /provinces'] = (u) => ({ body: page(u.searchParams.get('include') === 'cantons' ? [{ id: 4, name: 'Heredia', cantons: [{ id: 402, name: 'Barva' }, { id: 401, name: 'Heredia' }] }] : []) });
    routes['POST /me/submissions'] = (_u, init) => ({ status: 201, body: { id: 's3', userId: 'u1', type: 'PLACE', data: JSON.parse(String(init.body)).data, status: 'PENDING', reviewedAt: null, reviewNote: null, createdAt: '2026-10-20T00:00:00.000Z' } });
    expect((await api.listCantons('Heredia')).map((c) => c.name)).toEqual(['Heredia', 'Barva']);
    // Not in the API answer: the bundled INEC list.
    expect((await api.listCantons('Limón')).map((c) => c.id)).toEqual([701, 702, 703, 704, 705, 706]);
    const out = await api.createVueltica({
      type: 'lugar', name: 'Parque', category: 'Parques', description: '', lat: 10, lng: -84.1, address: 'Barva', province: 'Heredia', cantonId: 402,
      pricePerPerson: 0, freeFor: [], audiences: ['todo'], wheelchair: false, photos: [],
    });
    expect((calls.find((c) => c.path === '/me/submissions')!.body as { data: { cantonId: number } }).data.cantonId).toBe(402);
    expect(out.vueltica.cantonId).toBe(402);
  });

  it('edits a pending suggestion with PUT, keeping photos already uploaded, and 409 once decided', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    let decided = false;
    routes['PUT /me/submissions/s1'] = (_u, init) =>
      decided ? { status: 409, body: { message: 'ya revisada' } } : { body: { id: 's1', userId: 'u1', type: 'PLACE', data: JSON.parse(String(init.body)).data, status: 'PENDING', reviewedAt: null, reviewNote: null, createdAt: '2026-10-20T00:00:00.000Z' } };
    const input = {
      type: 'lugar' as const, name: 'Parque nuevo', category: 'Parques', description: '', lat: 10, lng: -84.1, address: 'Barva', province: 'Heredia' as const, cantonId: 402,
      pricePerPerson: 500, freeFor: [], audiences: ['todo' as const], wheelchair: false, photos: ['https://api.test/api/v1/files/up1'],
    };
    const v = await api.updateVueltica('s-s1', input);
    expect(v).toMatchObject({ id: 's-s1', name: 'Parque nuevo', status: 'pendiente', pricePerPerson: 500 });
    const put = calls.find((c) => c.method === 'PUT')!;
    expect((put.body as { data: { photos: string[] } }).data.photos).toEqual(['https://api.test/api/v1/files/up1']);
    expect(calls.some((c) => c.path === '/uploads')).toBe(false);
    decided = true;
    await expect(api.updateVueltica('s-s1', input)).rejects.toBeInstanceOf(ConflictError);
    await expect(api.updateVueltica('p-aaaa', input)).rejects.toBeInstanceOf(ConflictError);
  });

  it('team roles approve or reject a suggestion directly with a reason code', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    let role = 'USER';
    routes['GET /me'] = () => ({ body: { ...USER, role, interests: [] } });
    routes['POST /submissions/s1/reject'] = () => ({ body: {} });
    routes['POST /submissions/s1/approve'] = () => ({ body: {} });
    await api.currentUser();
    await expect(api.decideSubmission({ vuelticaId: 's-s1', decision: 'approve' })).rejects.toBeInstanceOf(ForbiddenError);
    role = 'MODERATOR';
    const team = make().api;
    await team.currentUser();
    await team.decideSubmission({ vuelticaId: 's-s1', decision: 'reject', reason: 'duplicado' });
    expect(calls.find((c) => c.path === '/submissions/s1/reject')!.body).toEqual({ reason: 'duplicado' });
    await expect(team.decideSubmission({ vuelticaId: 's-s1', decision: 'reject', reason: 'otro' })).rejects.toMatchObject({ field: 'note' });
    await team.decideSubmission({ vuelticaId: 's-s1', decision: 'reject', reason: 'otro', note: ' Cerró en 2025 ' });
    expect(calls.filter((c) => c.path === '/submissions/s1/reject')[1].body).toEqual({ reason: 'otro', note: 'Cerró en 2025' });
    await team.decideSubmission({ vuelticaId: 's-s1', decision: 'approve' });
    expect(calls.some((c) => c.path === '/submissions/s1/approve')).toBe(true);
  });

  it('opens the place a submission became once approved', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    routes['GET /me/submissions/s9'] = () => ({ body: { id: 's9', userId: 'u1', type: 'PLACE', data: {}, status: 'PUBLISHED', reviewedAt: null, reviewNote: null, created: { type: 'PLACE', id: 'aaaa' }, createdAt: '2026-10-01T00:00:00.000Z' } });
    routes['GET /places/aaaa'] = () => ({ body: { ...PLACE, photos: [], averageRating: 4, reviewCount: 1, ratingDistribution: [0, 0, 0, 1, 0], verificationCount: 3, lastVerifiedAt: '2026-10-19T00:00:00.000Z', myVerifiedToday: false, isFavorite: true, isMine: true } });
    routes['GET /places/aaaa/reviews'] = () => ({ body: { ...page([REVIEW]), summary: { averageRating: 4, reviewCount: 1, distribution: [0, 0, 0, 1, 0] } } });
    const d = await api.getVueltica('s-s9', LOC);
    expect(d.vuelticaView.id).toBe('p-aaaa');
    expect(d).toMatchObject({ saved: true, mine: true, rating: { avg: 4, count: 1, distribution: [0, 0, 0, 1, 0] }, verification: { count: 3 } });
    expect(d.reviewsPreview[0]).toMatchObject({ id: 'r1', stars: 4, authorName: 'Ana', vuelticaId: 'p-aaaa' });
  });

  it('saves places and events', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['PUT /places/aaaa/favorite'] = () => ({ status: 204 });
    routes['PUT /events/e1/favorite'] = () => ({ status: 204 });
    await api.saveVueltica('p-aaaa');
    await api.saveVueltica('e-e1');
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(['PUT /places/aaaa/favorite', 'PUT /events/e1/favorite']);
  });

  it('reviews: lists with the app sorts, creates, and toggles "útil"', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /me'] = () => ({ body: { ...USER, interests: [] } });
    routes['GET /events/e1/reviews'] = (u) => {
      expect(u.searchParams.get('sort')).toBe('-photoCount');
      expect(u.searchParams.get('withPhotos')).toBe('true');
      expect(u.searchParams.get('audience')).toBe('familias');
      return { body: { ...page([{ ...REVIEW, placeId: null, eventId: 'e1' }]), summary: { averageRating: 4, reviewCount: 1, distribution: [0, 0, 0, 1, 0] } } };
    };
    const list = await api.listReviews({ vuelticaId: 'e-e1', sort: 'fotos', audience: 'familias' });
    expect(list.summary).toEqual({ avg: 4, count: 1, distribution: [0, 0, 0, 1, 0] });
    expect(list.items[0]).toMatchObject({ vuelticaId: 'e-e1', wentWith: 'familia', spent: 'menos2500', text: 'Bonito' });

    routes['POST /reviews/r1/useful'] = () => ({ body: { ...REVIEW, usefulCount: 1, markedUsefulByMe: true } });
    routes['DELETE /reviews/r1/useful'] = () => ({ body: { ...REVIEW, usefulCount: 0, markedUsefulByMe: false } });
    expect((await api.markUseful('r1')).markedUsefulByMe).toBe(true);
    expect((await api.markUseful('r1')).markedUsefulByMe).toBe(false);

    routes['POST /places/aaaa/reviews'] = (_u, init) => ({ status: 201, body: { ...REVIEW, id: 'r2', ...JSON.parse(String(init.body)), comment: 'Muy bien' } });
    const r = await api.createReview({ vuelticaId: 'p-aaaa', stars: 5, wentWith: 'pareja', spent: 'nada', text: ' Muy bien ', photos: [] });
    expect(calls.at(-1)?.body).toEqual({ rating: 5, comment: 'Muy bien', wentWith: 'pareja', spent: 'nada', photos: [] });
    expect(r).toMatchObject({ id: 'r2', stars: 5 });
  });

  it('verifications: guests send X-Device-Id, offline answers are queued and flushed later', async () => {
    const { api } = make();
    const seen: (string | undefined)[] = [];
    routes['POST /places/aaaa/verifications'] = (_u, init) => {
      seen.push((init.headers as Record<string, string>)['X-Device-Id']);
      return { body: { queued: false, points: 0, hidden: false } };
    };
    expect(await api.verify({ vuelticaId: 'p-aaaa', stillHappening: 'si', pricePaid: 'gratis' })).toEqual({ queued: false, points: 0, hidden: false });
    expect(seen[0]).toMatch(/^app\./);
    expect(calls.at(-1)?.body).toMatchObject({ stillHappening: 'si', pricePaid: 'gratis' });

    const fetchOk = global.fetch;
    global.fetch = jest.fn(async () => { throw new TypeError('offline'); }) as typeof fetch;
    expect((await api.quickConfirm('p-aaaa')).queued).toBe(true);
    global.fetch = fetchOk;
    expect(await api.flushQueuedVerifications()).toBe(1);
    expect(await api.flushQueuedVerifications()).toBe(0);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toBe(seen[0]); // same device id
  });

  it('reports: maps the answer and turns a second report into DuplicateReportError', async () => {
    const { api } = make();
    routes['POST /events/e1/reports'] = () => ({ status: 201, body: { id: 'rep1', placeId: null, eventId: 'e1', reason: 'noGratis', details: null, photo: null, createdAt: '2026-10-20T00:00:00.000Z', hidden: false } });
    expect(await api.report({ vuelticaId: 'e-e1', reason: 'noGratis' })).toMatchObject({ id: 'rep1', vuelticaId: 'e-e1', reason: 'noGratis' });
    routes['POST /events/e1/reports'] = () => ({ status: 409, body: { message: 'ya' } });
    await expect(api.report({ vuelticaId: 'e-e1', reason: 'spam' })).rejects.toBeInstanceOf(DuplicateReportError);
  });

  it('profile (#42): takes province, member since, points and counts from /me and sends provinceId', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    const me = { ...USER, interests: [], province: { id: 5, name: 'Guanacaste' }, createdAt: '2026-01-15T00:00:00.000Z', points: 130, level: 3, counts: { vuelticas: 4, reviews: 2, verifications: 9 } };
    routes['GET /me'] = () => ({ body: me });
    routes['PUT /me'] = (_u, init) => ({ body: { ...me, province: { id: 7, name: 'Limón' }, ...JSON.parse(String(init.body)) } });
    const u = await api.currentUser();
    expect(u).toMatchObject({ province: 'Guanacaste', memberSince: '2026-01-15T00:00:00.000Z', points: 130, counts: { vuelticas: 4, reviews: 2, verifications: 9 } });
    await api.updateSettings({ province: 'Limón' });
    expect(calls.at(-1)).toMatchObject({ method: 'PUT', path: '/me', body: { name: 'Ana', surnames: 'Mora', ageRange: null, provinceId: 7 } });
    await api.updateSettings({ province: 'Limón' }); // unchanged: no request
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
  });

  it('reputation (#42): maps GET /me/reputation to the app levels and opens moderation from level 3', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /me'] = () => ({ body: { ...USER, interests: [], points: 130, level: 3 } });
    routes['GET /me/reputation'] = () => ({
      body: { points: 130, level: 3, nextLevel: 4, pointsToNext: 70, progress: 0.125, perks: ['priceVerification', 'moderation'], recent: [{ kind: 'minorityModerator', delta: -2, createdAt: '2026-10-19T00:00:00.000Z' }, { kind: 'published', delta: 10, createdAt: '2026-10-18T00:00:00.000Z' }] },
    });
    const r = await api.reputationSummary();
    expect(r).toMatchObject({ points: 130, level: { number: 3, name: 'De confianza' }, nextLevel: { number: 4 }, pointsToNext: 70, progress: 0.125, canModerate: true });
    expect(r.recent.map((e) => [e.kind, e.delta])).toEqual([['minorityModerator', -2], ['published', 10]]);
  });

  it('community moderation (#43): queue, votes by kind, undo, and 403 below level 3', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /categories'] = () => ({ body: CATS });
    routes['GET /me'] = () => ({ body: { ...USER, interests: [], points: 130, level: 3 } });
    const tally = { votesFor: 1, votesAgainst: 0, votesNeeded: 5, myVote: null };
    routes['GET /moderation/queue'] = () => ({
      body: {
        nuevas: [{ ...tally, submission: { id: 's1', type: 'PLACE', data: { name: 'Mirador', categoryId: 2, cantonId: 301, latitude: 9.86, longitude: -83.9 }, status: 'PENDING', reviewedAt: null, reviewNote: null, createdAt: '2026-10-19T00:00:00.000Z' } }],
        reportadas: [{ votesFor: 0, votesAgainst: 1, votesNeeded: 3, myVote: 'against', report: { type: 'PLACE', placeId: 'aaaa', eventId: null, title: 'Museo del Jade', status: 'ARCHIVED', hiddenReason: 'En revisión por reportes', reportedAt: '2026-10-19T00:00:00.000Z', needsReview: false, reportCount: 3, topReason: 'noGratis', firstReportAt: '2026-10-18T00:00:00.000Z', lastReportAt: '2026-10-19T00:00:00.000Z' } }],
        totals: { nuevas: 1, reportadas: 1 },
        total: 2,
      },
    });
    routes['GET /places/aaaa'] = () => ({ status: 404 }); // hidden plans are not readable by community moderators
    const q = await api.moderationQueue(LOC);
    expect(q.total).toBe(2);
    expect(q.nuevas[0]).toMatchObject({ vuelticaId: 's-s1', kind: 'nueva', votesFor: 1, votesNeeded: 5, myVote: undefined, vuelticaView: { name: 'Mirador', province: 'Cartago' } });
    expect(q.reportadas[0]).toMatchObject({ vuelticaId: 'p-aaaa', kind: 'reportada', myVote: 'against', reportCount: 3, topReason: 'noGratis', vuelticaView: { name: 'Museo del Jade', status: 'oculta' } });
    expect(await api.moderationCount()).toBe(2);

    // The detail of a queued suggestion opens from the queue (no GET /submissions/:id for community moderators).
    routes['GET /me/submissions/s1'] = () => ({ status: 404 });
    expect((await api.getVueltica('s-s1', LOC)).moderation).toMatchObject({ votesFor: 1, votesNeeded: 5 });

    routes['POST /moderation/submissions/s1/vote'] = (_u, init) => ({ body: { type: 'SUBMISSION', id: 's1', kind: 'nueva', votesFor: 2, votesAgainst: 0, votesNeeded: 5, myVote: JSON.parse(String(init.body)).choice, decision: 'pending' } });
    routes['DELETE /moderation/submissions/s1/vote'] = () => ({ body: { type: 'SUBMISSION', id: 's1', kind: 'nueva', votesFor: 1, votesAgainst: 0, votesNeeded: 5, myVote: null, decision: 'pending' } });
    routes['POST /moderation/places/aaaa/vote'] = () => ({ body: { type: 'PLACE', id: 'aaaa', kind: 'reportada', votesFor: 1, votesAgainst: 1, votesNeeded: 3, myVote: 'for', decision: 'pending' } });
    expect(await api.vote({ vuelticaId: 's-s1', choice: 'for' })).toMatchObject({ votesFor: 2, myVote: 'for' });
    expect(calls.at(-1)?.body).toEqual({ choice: 'for' });
    expect(await api.undoVote('s-s1')).toMatchObject({ votesFor: 1, myVote: undefined });
    expect(await api.vote({ vuelticaId: 'p-aaaa', choice: 'for' })).toMatchObject({ kind: 'reportada', votesFor: 1, myVote: 'for', reportCount: 3 });

    routes['DELETE /moderation/places/aaaa/vote'] = () => ({ status: 409, body: { message: 'decidido' } });
    await expect(api.undoVote('p-aaaa')).rejects.toBeInstanceOf(ConflictError);

    // A level-1 user never asks for the queue count, and the queue itself is a 403 (the screen shows "locked").
    const other = make().api;
    routes['GET /me'] = () => ({ body: { ...USER, interests: [], points: 0, level: 1 } });
    const before = calls.length;
    expect(await other.moderationCount()).toBe(0);
    expect(calls.slice(before).some((c) => c.path === '/moderation/queue')).toBe(false);
    routes['GET /moderation/queue'] = () => ({ status: 403, body: { message: 'Necesitas nivel 3 para moderar' } });
    await expect(other.moderationQueue(LOC)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('team roles see the moderation entry whatever their level', async () => {
    const { api } = make();
    mockMem.set('t', 'jwt');
    routes['GET /me'] = () => ({ body: { ...USER, role: 'MODERATOR', interests: [], points: 0, level: 1 } });
    routes['GET /me/reputation'] = () => ({ body: { points: 0, level: 1, nextLevel: 2, pointsToNext: 50, progress: 0, perks: [], recent: [] } });
    expect((await api.reputationSummary()).canModerate).toBe(true);
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
