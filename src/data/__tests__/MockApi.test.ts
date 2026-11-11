import { DEFAULT_FILTERS } from '@/domain/filters';
import { DEFAULT_LOCATION } from '@/domain/geo';
import { AuthRequiredError, DuplicateReportError, ForbiddenError, OfflineError, ValidationError } from '../api';
import { MockApi } from '../mock/MockApi';
import { MemoryKV } from '../storage/types';

jest.mock('@/lib/clock', () => {
  const fixed = new Date('2026-10-20T10:00:00-06:00');
  return { now: () => new Date(fixed), nowIso: () => fixed.toISOString(), setNow: () => {} };
});

const loc = DEFAULT_LOCATION;
const filters = DEFAULT_FILTERS;
let offline = false;
const make = () => new MockApi({ store: new MemoryKV(), latency: [0, 0], isOffline: () => offline });

beforeEach(() => {
  offline = false;
});

describe('seed', () => {
  it('matches the design numbers: 20 plans within 5 km, 14 free, 18 for students', async () => {
    const api = make();
    const r = await api.listVuelticas({ filters, location: loc });
    expect(r.count).toBe(20);
    expect(r.freeCount).toBe(14);
    const s = await api.listVuelticas({ filters: { ...filters, students: true }, location: loc });
    expect(s.count).toBe(18);
  });
  it('has about 40 plans and 150 reviews', async () => {
    const api = make();
    const all = await api.listVuelticas({ filters: { ...filters, nearMe: false }, location: loc });
    expect(all.count).toBeGreaterThanOrEqual(34);
    const reviews = await api.listReviews({ vuelticaId: 'v-jade', sort: 'recientes' });
    expect(reviews.summary.count).toBe(126);
  });
  it('finds 2 results for "museo"', async () => {
    const api = make();
    const r = await api.searchVuelticas({ filters: { ...filters, text: 'museo' }, location: loc });
    expect(r.items.map((v) => v.id).sort()).toEqual(['v-jade', 'v-ninos'].sort());
  });
});

describe('auth gates', () => {
  it('requires sign-in to save, contribute, review and moderate', async () => {
    const api = make();
    await expect(api.saveVueltica('v-sabana')).rejects.toBeInstanceOf(AuthRequiredError);
    await expect(api.listReviews({ vuelticaId: 'v-jade', sort: 'recientes' })).resolves.toBeTruthy();
    await expect(api.createReview({ vuelticaId: 'v-jade', stars: 5, wentWith: 'familia', spent: 'nada', text: 'x', photos: [] })).rejects.toBeInstanceOf(AuthRequiredError);
    await expect(api.moderationQueue(loc)).rejects.toBeInstanceOf(AuthRequiredError);
  });
  it('saves after sign-in', async () => {
    const api = make();
    await api.signIn({ provider: 'email', email: 'a@b.c' });
    await api.saveVueltica('v-sabana');
    const saved = await api.listSaved(loc);
    expect(saved.map((s) => s.vuelticaView.id)).toContain('v-sabana');
  });
});

describe('contribute and moderation', () => {
  it('rejects prices above 5.000 and accepts 5.000', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    const base = { type: 'evento' as const, name: 'Prueba', category: 'Cine', description: '', lat: 9.93, lng: -84.08, address: 'x', province: 'San José' as const, freeFor: [], audiences: ['todo' as const], wheelchair: false, photos: [] };
    await expect(api.createVueltica({ ...base, pricePerPerson: 5001 })).rejects.toBeInstanceOf(ValidationError);
    const ok = await api.createVueltica({ ...base, pricePerPerson: 5000 });
    expect(ok.vueltica.status).toBe('pendiente');
    expect(ok.moderation.votesNeeded).toBe(3);
  });
  it('shows pending pins only to the author and moderators', async () => {
    const api = make();
    expect((await api.listVuelticas({ filters, location: loc })).pending).toHaveLength(0);
    await api.signIn({ provider: 'apple' });
    const p = (await api.listVuelticas({ filters, location: loc })).pending;
    expect(p.length).toBe(5);
    expect(p.filter((x) => x.mine)).toHaveLength(1);
  });
  it('publishes after community votes and awards +10', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    const before = (await api.reputationSummary()).points;
    await api.simulateCommunity({ kind: 'votes', vuelticaId: 'v-feria-ana', count: 1 });
    const mine = await api.myVuelticas(loc);
    expect(mine.find((m) => m.vuelticaView.id === 'v-feria-ana')?.vuelticaView.status).toBe('publicada');
    expect((await api.reputationSummary()).points).toBe(before + 10);
  });
  it('lets a moderator vote (+1) and undo', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    const q = await api.moderationQueue(loc);
    expect(q.nuevas).toHaveLength(4);
    expect(q.reportadas).toHaveLength(2);
    const p0 = (await api.reputationSummary()).points;
    const item = await api.vote({ vuelticaId: 'v-huertas', choice: 'for' });
    expect(item.myVote).toBe('for');
    expect((await api.reputationSummary()).points).toBe(p0 + 1);
    await api.undoVote('v-huertas');
    expect((await api.reputationSummary()).points).toBe(p0);
  });
  it('hides a reported vuelticas when the majority votes to hide', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    await api.simulateCommunity({ kind: 'votes', vuelticaId: 'v-ninos', count: 2, choice: 'for' });
    await api.vote({ vuelticaId: 'v-ninos', choice: 'for' });
    const r = await api.listVuelticas({ filters, location: loc });
    expect(r.items.find((v) => v.id === 'v-ninos')).toBeUndefined();
  });
  it('requires level 3 to moderate', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    await api.deleteAccount();
    await api.signIn({ provider: 'email', email: 'nuevo@x.com' });
    await expect(api.moderationQueue(loc)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('verification and reports', () => {
  it('awards +2 per verification and hides after 3 "more than 5.000" answers', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    const p0 = (await api.reputationSummary()).points;
    const r = await api.verify({ vuelticaId: 'v-lectura', stillHappening: 'si', pricePaid: 'mas5000' });
    expect(r.points).toBe(2);
    await api.simulateCommunity({ kind: 'verifications', vuelticaId: 'v-lectura', count: 2, pricePaid: 'mas5000' });
    const list = await api.listVuelticas({ filters, location: loc });
    expect(list.items.find((v) => v.id === 'v-lectura')).toBeUndefined();
    expect((await api.reputationSummary()).points).toBe(p0 + 2);
  });
  it('hides after 3 matching reports and dedupes per device', async () => {
    const api = make();
    await api.report({ vuelticaId: 'v-plaza', reason: 'spam' });
    await expect(api.report({ vuelticaId: 'v-plaza', reason: 'spam' })).rejects.toBeInstanceOf(DuplicateReportError);
    await api.simulateCommunity({ kind: 'reports', vuelticaId: 'v-plaza', count: 2, reason: 'spam' });
    const list = await api.listVuelticas({ filters, location: loc });
    expect(list.items.find((v) => v.id === 'v-plaza')).toBeUndefined();
  });
  it('queues verifications while offline and sends them on reconnect', async () => {
    const api = make();
    offline = true;
    const r = await api.verify({ vuelticaId: 'v-plaza', stillHappening: 'si' });
    expect(r.queued).toBe(true);
    await expect(api.listVuelticas({ filters, location: loc })).rejects.toBeInstanceOf(OfflineError);
    offline = false;
    expect(await api.flushQueuedVerifications()).toBe(1);
  });
});

describe('reviews', () => {
  it('increments the count 126 → 127 and sorts by usefulness', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    await api.createReview({ vuelticaId: 'v-jade', stars: 5, wentWith: 'familia', spent: 'nada', text: 'Muy bien', photos: [] });
    const r = await api.listReviews({ vuelticaId: 'v-jade', sort: 'utiles' });
    expect(r.summary.count).toBe(127);
    const counts = r.items.map((i) => i.usefulCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });
  it('toggles useful', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    const list = await api.listReviews({ vuelticaId: 'v-jade', sort: 'recientes' });
    const first = list.items[0];
    const r = await api.markUseful(first.id);
    expect(r.usefulCount).toBe(first.usefulCount + 1);
  });
});

describe('account', () => {
  it('deletes the account: published stay as Anónimo, pending removed', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    await api.deleteAccount();
    expect(await api.currentUser()).toBeNull();
    const r = await api.getVueltica('v-mirador', loc);
    expect(r.vuelticaView.authorName).toBe('Anónimo');
    await expect(api.getVueltica('v-feria-ana', loc)).rejects.toBeTruthy();
  });
  it('exports data and schedules reminders one day before', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    const e = await api.exportMyData();
    expect(JSON.parse(e.content).user.displayName).toBe('Ana Mora');
    const rem = await api.scheduleNotifications();
    expect(rem.find((r) => r.vuelticaId === 'v-jade')?.body).toMatch(/^Mañana: Noche de Museos/);
  });
  it('persists to the store', async () => {
    const store = new MemoryKV();
    const a = new MockApi({ store, latency: [0, 0] });
    await a.signIn({ provider: 'apple' });
    await a.saveVueltica('v-sabana');
    await new Promise((r) => setTimeout(r, 120));
    const b = new MockApi({ store, latency: [0, 0] });
    expect(await b.currentUser()).toMatchObject({ displayName: 'Ana Mora' });
  });
});

describe('review fixes', () => {
  it('counts one verification per person: repeating does not hide a plan or farm points', async () => {
    const api = make();
    for (let i = 0; i < 4; i++) await api.verify({ vuelticaId: 'v-plaza', stillHappening: 'no' });
    let list = await api.listVuelticas({ filters, location: loc });
    expect(list.items.find((v) => v.id === 'v-plaza')).toBeDefined();
    await api.signIn({ provider: 'apple' });
    const p0 = (await api.reputationSummary()).points;
    for (let i = 0; i < 3; i++) await api.verify({ vuelticaId: 'v-espana', stillHappening: 'si', pricePaid: 'mas5000' });
    expect((await api.reputationSummary()).points).toBe(p0 + 2);
    list = await api.listVuelticas({ filters, location: loc });
    expect(list.items.find((v) => v.id === 'v-espana')).toBeDefined();
    const d = await api.getVueltica('v-espana', loc);
    expect(d.verification.myVerifiedToday).toBe(true);
  });
  it('different people still hide after 3 matching answers', async () => {
    const api = make();
    await api.verify({ vuelticaId: 'v-plaza', stillHappening: 'no' });
    await api.simulateCommunity({ kind: 'verifications', vuelticaId: 'v-plaza', count: 2, stillHappening: 'no' });
    const list = await api.listVuelticas({ filters, location: loc });
    expect(list.items.find((v) => v.id === 'v-plaza')).toBeUndefined();
  });
  it('keeps myVote after re-entering and replaces it instead of ignoring a second vote', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    await api.vote({ vuelticaId: 'v-cuentos', choice: 'for' });
    let q = await api.moderationQueue(loc);
    expect(q.nuevas.find((i) => i.vuelticaId === 'v-cuentos')?.myVote).toBe('for');
    const p = (await api.reputationSummary()).points;
    await api.vote({ vuelticaId: 'v-cuentos', choice: 'against' });
    q = await api.moderationQueue(loc);
    const item = q.nuevas.find((i) => i.vuelticaId === 'v-cuentos')!;
    expect(item.myVote).toBe('against');
    expect(item.votesFor).toBe(0);
    expect(item.votesAgainst).toBe(1);
    expect((await api.reputationSummary()).points).toBe(p);
  });
  it('does not list hidden plans in Guardados', async () => {
    const api = make();
    await api.signIn({ provider: 'apple' });
    await api.saveVueltica('v-plaza');
    await api.simulateCommunity({ kind: 'reports', vuelticaId: 'v-plaza', count: 3, reason: 'spam' });
    const saved = await api.listSaved(loc);
    expect(saved.find((s) => s.vuelticaView.id === 'v-plaza')).toBeUndefined();
  });
});
