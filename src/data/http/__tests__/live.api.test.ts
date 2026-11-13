/**
 * Live contract test: the app's real `HttpApi` against a running mi-vueltica-api (never runs by default).
 *
 *   MV_LIVE_API=http://127.0.0.1:3000 MV_LIVE_TOKENS=/path/tokens.json npx jest live.api
 *
 * `tokens.json` maps `author`, `v1`..`v5` (level 3+ users), `admin` (ADMIN role) to `{ id, token }`: JWTs for users
 * that already exist in that database (see docs/API_INTEGRATION.md, "Testing against a live API"). The test creates
 * its own place / event / submission, so run it on a disposable database.
 */
import { readFileSync } from 'fs';
import { DEFAULT_FILTERS } from '@/domain/filters';
import { ConflictError, DuplicateReportError, ForbiddenError } from '../../api';
import { MemoryKV } from '../../storage/types';
import { HttpApi } from '../HttpApi';
import { HttpClient } from '../client';

const LIVE = process.env.MV_LIVE_API?.replace(/\/+$/, '');
const describeLive = LIVE ? describe : describe.skip;

jest.mock('../config', () => ({
  API_URL: process.env.MV_LIVE_API,
  API_BASE: `${process.env.MV_LIVE_API?.replace(/\/+$/, '')}/api/v1`,
  USE_HTTP_API: true,
  REQUEST_TIMEOUT_MS: 15000,
}));
let mockToken: string | null = null;
jest.mock('../tokenStore', () => ({
  tokenStore: {
    get: async () => mockToken,
    set: async (v: string) => void (mockToken = v),
    clear: async () => void (mockToken = null),
    getProvider: async () => 'google',
    setProvider: async () => {},
  },
}));
jest.mock('../socialAuth', () => ({ appleSignIn: jest.fn(), appleAuthorizationCode: jest.fn(), googleSignIn: jest.fn(), googleSignOut: jest.fn(async () => {}) }));
// As on a phone. Photos are data: URIs, so uploads take the Blob path, which Node's fetch supports.
jest.mock('react-native', () => ({ Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default } }));

type Actor = { id: string; token: string };
const tokens: Record<string, Actor> = LIVE ? JSON.parse(readFileSync(process.env.MV_LIVE_TOKENS!, 'utf8')) : {};
const LOC = { lat: 9.9333, lng: -84.0833 };
// A 1×1 PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const apis = new Map<string, HttpApi>();
/** One HttpApi per person, as on their own phone. `null` = a signed-out guest. */
function as(who: string | null): HttpApi {
  mockToken = who ? tokens[who].token : null;
  const key = who ?? 'guest';
  if (!apis.has(key)) apis.set(key, new HttpApi(new HttpClient(), new MemoryKV()));
  return apis.get(key)!;
}
async function team<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${LIVE}/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${tokens.admin.token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

describeLive('HttpApi against a live mi-vueltica-api', () => {
  jest.setTimeout(60_000);
  const stamp = Date.now().toString(36);
  let placeId = '';
  let eventId = '';
  let submissionId = '';

  beforeAll(async () => {
    const cats = await team<{ data: { id: number; name: string }[] }>('GET', '/categories?pageSize=100');
    const categoryId = cats.data[0].id;
    const place = await team<{ id: string }>('POST', '/places', {
      cantonId: 101, categoryId, name: `Museo live ${stamp}`, description: 'Prueba', latitude: 9.9366, longitude: -84.0727, address: 'Calle 13',
      openingHours: { tuesday: [{ open: '09:00', close: '17:00' }] }, pricePerPerson: 0, audiences: ['todo', 'familias'], freeFor: [], wheelchair: true,
    });
    await team('PATCH', `/places/${place.id}/status`, { status: 'PUBLISHED' });
    placeId = place.id;
    const startsAt = new Date(Date.now() + 5 * 86400_000).toISOString();
    const event = await team<{ id: string }>('POST', '/events', {
      categoryId, title: `Feria live ${stamp}`, startsAt, latitude: 9.935, longitude: -84.08, address: 'Plaza de la Cultura', pricePerPerson: 2000, freeFor: ['estudiantes'], audiences: ['estudiantes'],
    });
    await team('PATCH', `/events/${event.id}/status`, { status: 'PUBLISHED' });
    eventId = event.id;
  });

  it('guest: lists places and events with prices, opens the detail, verifies and reports by device', async () => {
    const api = as(null);
    const list = await api.listVuelticas({ filters: { ...DEFAULT_FILTERS, text: stamp }, location: LOC });
    const place = list.items.find((v) => v.id === `p-${placeId}`);
    const event = list.items.find((v) => v.id === `e-${eventId}`);
    expect(place).toMatchObject({ type: 'lugar', priceTier: 'gratis', wheelchair: true, audiences: ['todo', 'familias'], province: 'San José' });
    expect(event).toMatchObject({ type: 'evento', priceTier: 'hasta2500', pricePerPerson: 2000, freeFor: ['estudiantes'], address: 'Plaza de la Cultura' });

    const free = await api.listVuelticas({ filters: { ...DEFAULT_FILTERS, text: stamp, maxPrice: 'gratis' }, location: LOC });
    expect(free.items.map((v) => v.id)).toEqual([`p-${placeId}`]);

    const d = await api.getVueltica(`p-${placeId}`, LOC);
    expect(d.vuelticaView.openingHours).toBe('Mar · 9:00 a.m.–5:00 p.m.');
    expect(d.saved).toBe(false);

    const v = await api.verify({ vuelticaId: `p-${placeId}`, stillHappening: 'si', pricePaid: 'gratis' });
    expect(v).toEqual({ queued: false, points: 0, hidden: false });
    expect((await api.getVueltica(`p-${placeId}`, LOC)).verification).toMatchObject({ count: 1, myVerifiedToday: true });

    await api.report({ vuelticaId: `p-${placeId}`, reason: 'noGratis', details: 'Cobran entrada' });
    await expect(api.report({ vuelticaId: `p-${placeId}`, reason: 'noGratis' })).rejects.toBeInstanceOf(DuplicateReportError);
  });

  it('profile (#42): member since, points, counts and the province round-trip', async () => {
    const api = as('author');
    const me = await api.currentUser();
    expect(me).toMatchObject({ id: tokens.author.id, displayName: 'Ana Mora', memberSince: '2026-01-15T00:00:00.000Z', points: 0, counts: { vuelticas: 0 } });
    await api.updateSettings({ province: 'Heredia' });
    const fresh = new HttpApi(new HttpClient(), new MemoryKV()); // another device: the province comes from the API
    expect((await fresh.currentUser())?.province).toBe('Heredia');
    const rep = await api.reputationSummary();
    expect(rep).toMatchObject({ points: 0, level: { number: 1 }, nextLevel: { number: 2 }, canModerate: false });
  });

  it('saves places and events, lists them and schedules the event reminder', async () => {
    const api = as('author');
    await api.saveVueltica(`p-${placeId}`);
    await api.saveVueltica(`e-${eventId}`);
    const saved = await api.listSaved(LOC);
    expect(saved.map((s) => s.vuelticaView.id)).toEqual(expect.arrayContaining([`p-${placeId}`, `e-${eventId}`]));
    expect((await api.scheduleNotifications()).map((r) => r.vuelticaId)).toContain(`e-${eventId}`);
    expect((await api.getVueltica(`e-${eventId}`, LOC)).saved).toBe(true);
    await api.unsaveVueltica(`p-${placeId}`);
    expect((await api.listSaved(LOC)).map((s) => s.vuelticaView.id)).not.toContain(`p-${placeId}`);
  });

  it('reviews: write with a photo, see it pending, "útil" gives the author a point', async () => {
    const author = as('author');
    const r = await author.createReview({ vuelticaId: `p-${placeId}`, stars: 4, wentWith: 'familia', spent: 'nada', text: 'Muy bonito', photos: [PNG] });
    expect(r.photos[0]).toMatch(/\/api\/v1\/files\//);
    expect((await author.listReviews({ vuelticaId: `p-${placeId}`, sort: 'recientes' })).items.map((x) => x.id)).toContain(r.id);
    await team('PATCH', `/reviews/${r.id}/status`, { status: 'PUBLISHED' });

    const v1 = as('v1');
    const list = await v1.listReviews({ vuelticaId: `p-${placeId}`, sort: 'fotos', audience: 'familias' });
    expect(list.summary).toMatchObject({ avg: 4, count: 1 });
    expect((await v1.markUseful(r.id)).markedUsefulByMe).toBe(true);
    expect((await v1.markUseful(r.id)).usefulCount).toBe(0);
    expect((await v1.markUseful(r.id)).usefulCount).toBe(1);

    const rep = await as('author').reputationSummary();
    expect(rep.recent.map((e) => e.kind)).toContain('reviewUseful');
  });

  it('contributes a plan with price and photo; level-3 voters publish it (#43) and the author opens the place', async () => {
    const author = as('author');
    const { vueltica, moderation } = await author.createVueltica({
      type: 'lugar', name: `Mirador live ${stamp}`, category: (await team<{ data: { name: string }[] }>('GET', '/categories?pageSize=100')).data[1].name,
      description: 'Vista linda', lat: 9.95, lng: -84.05, address: 'Ruta 2', province: 'Cartago', openingHours: 'Lun–Dom · 6:00 a.m.–6:00 p.m.',
      pricePerPerson: 1500, freeFor: ['ciudadanosOro'], audiences: ['todo'], wheelchair: false, photos: [PNG],
    });
    submissionId = vueltica.id;
    expect(vueltica).toMatchObject({ status: 'pendiente', priceTier: 'hasta2500', province: 'Cartago' });
    expect(moderation.votesNeeded).toBe(5);
    expect((await author.myVuelticas(LOC))[0].vuelticaView.id).toBe(submissionId);
    await expect(author.moderationQueue(LOC)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await author.moderationCount()).toBe(0);

    const v1 = as('v1');
    const q = await v1.moderationQueue(LOC);
    const item = q.nuevas.find((n) => n.vuelticaId === submissionId)!;
    expect(item).toMatchObject({ kind: 'nueva', votesFor: 0, votesNeeded: 5, vuelticaView: { name: `Mirador live ${stamp}`, pricePerPerson: 1500 } });
    expect((await v1.getVueltica(submissionId, LOC)).moderation?.votesNeeded).toBe(5); // opens from the queue
    expect(await v1.moderationCount()).toBeGreaterThan(0);
    expect(await v1.vote({ vuelticaId: submissionId, choice: 'for' })).toMatchObject({ votesFor: 1, myVote: 'for' });
    expect(await v1.undoVote(submissionId)).toMatchObject({ votesFor: 0, myVote: undefined });
    await v1.vote({ vuelticaId: submissionId, choice: 'for' });
    for (const who of ['v2', 'v3', 'v4']) await as(who).vote({ vuelticaId: submissionId, choice: 'for' });
    const last = await as('v5').vote({ vuelticaId: submissionId, choice: 'for' });
    expect(last).toMatchObject({ votesFor: 5, votesNeeded: 5 });
    await expect(as('v5').undoVote(submissionId)).rejects.toBeInstanceOf(ConflictError);

    const opened = await as('author').getVueltica(submissionId, LOC);
    expect(opened.vuelticaView).toMatchObject({ type: 'lugar', status: 'publicada', priceTier: 'hasta2500', freeFor: ['ciudadanosOro'] });
    expect(opened.vuelticaView.photos[0]).toMatch(/\/api\/v1\/files\//);
    expect(opened.vuelticaView.openingHours).toBe('Lun–Dom · 6:00 a.m.–6:00 p.m.');
    expect(opened.mine).toBe(true);
    const me = await as('author').currentUser();
    expect(me?.points).toBeGreaterThanOrEqual(10);
    expect(me?.counts.vuelticas).toBe(1);
  });

  it('reports hide a plan; community moderators decide it in "Reportadas"', async () => {
    for (const who of ['v1', 'v2']) await as(who).report({ vuelticaId: `p-${placeId}`, reason: 'noGratis' });
    const v3 = as('v3');
    const q = await v3.moderationQueue(LOC);
    const item = q.reportadas.find((r) => r.vuelticaId === `p-${placeId}`)!;
    expect(item).toMatchObject({ kind: 'reportada', reportCount: 3, topReason: 'noGratis', votesNeeded: 3 });
    expect(item.vuelticaView.name).toBe(`Museo live ${stamp}`);
    await v3.vote({ vuelticaId: `p-${placeId}`, choice: 'for' });
    await as('v4').vote({ vuelticaId: `p-${placeId}`, choice: 'for' });
    const decided = await as('v5').vote({ vuelticaId: `p-${placeId}`, choice: 'for' });
    expect(decided).toMatchObject({ kind: 'reportada', votesFor: 3 });
    const list = await as(null).listVuelticas({ filters: { ...DEFAULT_FILTERS, text: stamp }, location: LOC });
    expect(list.items.map((v) => v.id)).not.toContain(`p-${placeId}`);
  });

  it('exports the data and signs out', async () => {
    const api = as('author');
    const out = await api.exportMyData();
    const data = JSON.parse(out.content);
    expect(data.reviews.length).toBe(1);
    expect(data.reputation.points).toBeGreaterThan(0);
    await api.signOut();
    expect(await api.currentUser()).toBeNull();
  });
});
