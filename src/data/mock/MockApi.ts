import { cantonsOf, type Canton } from '@/domain/cantons';
import { haversineKm } from '@/domain/geo';
import { applyFilters, sortVuelticas, summarize } from '@/domain/filters';
import {
  applyPoints, canModerate, canVerifyPrice, decideNew, decideReported, isPublishablePrice, isVisibleTo, levelForPoints, needsReview,
  outcomeOfVerifications, pointsFor, reportsHide, reputationFor, tierForPrice, voteWeight, votesNeeded, isMinorityVote,
} from '@/domain/rules';
import type {
  BlockedUser, LatLng, ModerationItem, ModerationKind, Province, Report, Review, Saved, Settings, User, Verification, Vueltica, VuelticaView, ReputationKind, ReputationEvent,
} from '@/domain/types';
import { now as clockNow } from '@/lib/clock';
import { initialsOf } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import {
  AuthRequiredError, ConflictError, DuplicateReportError, ForbiddenError, NotFoundError, OfflineError, ValidationError,
  type CreateReviewInput, type CreateVuelticaInput, type DecideInput, type ExportedData, type ListParams, type ListResult, type MiVuelticaApi, type ModerationQueue,
  type MyVuelticaItem, type RatingSummary, type ReportInput, type ReviewList, type ReviewListParams, type SavedItem, type ScheduledReminder, type SimulateInput,
  type VerifyInput, type VerifyResult, type VuelticaDetail,
} from '../api';
import type { KeyValueStore } from '../storage/types';
import { DB, DB_VERSION } from './db';
import { ANA_ID, buildSeed } from './seed';

const KEY = 'mv.db';
export const REPORT_QUEUE_MIN = 2;

export interface MockOptions {
  store: KeyValueStore;
  isOffline?: () => boolean;
  /** ms range; 0 under e2e. */
  latency?: [number, number];
  deviceId?: string;
}

function level(db: DB): number {
  const u = db.users.find((x) => x.id === db.currentUserId);
  return u ? levelForPoints(u.points).number : 0;
}

export class MockApi implements MiVuelticaApi {
  private db!: DB;
  private ready: Promise<void>;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private opts: Required<Omit<MockOptions, 'store'>> & { store: KeyValueStore };

  constructor(opts: MockOptions) {
    const e2e = process.env.EXPO_PUBLIC_E2E === '1';
    this.opts = { isOffline: () => false, latency: e2e ? [0, 0] : [300, 700], deviceId: 'device-1', ...opts } as MockApi['opts'];
    this.ready = this.load();
  }

  /* ------------------------------------------------------------------ infra */

  private async load() {
    try {
      const raw = await this.opts.store.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DB;
        if (parsed.version === DB_VERSION) {
          this.db = parsed;
          return;
        }
      }
    } catch {
      /* fall through to seed */
    }
    this.db = buildSeed(clockNow());
    await this.flush();
  }

  private async flush() {
    try {
      await this.opts.store.setItem(KEY, JSON.stringify(this.db));
    } catch {
      /* storage unavailable: keep in memory */
    }
  }

  private persist() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.flush(), 50);
  }

  /** Reset to the seed (used by tests / e2e). */
  async reset() {
    await this.ready;
    this.db = buildSeed(clockNow());
    await this.flush();
  }

  private async delay() {
    const [a, b] = this.opts.latency;
    if (b <= 0) return;
    await new Promise((r) => setTimeout(r, a + Math.random() * (b - a)));
  }

  private async read<T>(fn: () => T): Promise<T> {
    await this.ready;
    if (this.opts.isOffline()) throw new OfflineError();
    await this.delay();
    // Always hand out copies: the UI must never mutate (or observe mutations of) the "server" state.
    const out = fn();
    return (out === undefined ? undefined : JSON.parse(JSON.stringify(out))) as T;
  }

  private async write<T>(fn: () => T): Promise<T> {
    const v = await this.read(fn);
    this.persist();
    return v;
  }

  private id(prefix: string) {
    this.db.seq += 1;
    return `${prefix}-${this.db.seq}`;
  }

  private me(): User | null {
    return this.db.users.find((u) => u.id === this.db.currentUserId) ?? null;
  }

  private requireMe(reason: AuthRequiredError['reason']): User {
    const u = this.me();
    if (!u) throw new AuthRequiredError(reason);
    return u;
  }

  private view(v: Vueltica, loc: LatLng): VuelticaView {
    const me = this.me();
    return {
      ...v, distanceKm: haversineKm(loc, v), saved: !!me && this.db.saved.some((s) => s.userId === me.id && s.vueltica === v.id),
      blockable: !!v.authorId && v.authorId !== me?.id,
    };
  }

  private addPoints(userId: string, kind: ReputationKind, delta = pointsFor(kind)) {
    const u = this.db.users.find((x) => x.id === userId);
    if (!u) return 0;
    const before = u.points;
    u.points = applyPoints(u.points, delta);
    const ev: ReputationEvent = { id: this.id('ev'), userId, kind, delta: u.points - before, createdAt: clockNow().toISOString() };
    this.db.events.push(ev);
    return ev.delta;
  }

  /** Whether the signed-in user blocked this author. */
  private blockedAuthor(authorId: string | null | undefined): boolean {
    const me = this.me();
    return !!me && !!authorId && (this.db.blocks ?? []).some((b) => b.blockerId === me.id && b.blockedId === authorId);
  }

  private visible(): Vueltica[] {
    const me = this.me();
    const lvl = level(this.db);
    return this.db.vuelticas.filter((v) => isVisibleTo(v, me?.id ?? null, lvl));
  }

  /* ------------------------------------------------------------------- list */

  private list(p: ListParams): ListResult {
    const now = clockNow();
    const me = this.me();
    const lvl = level(this.db);
    const published = this.db.vuelticas.filter((v) => v.status === 'publicada' && !this.blockedAuthor(v.authorId)).map((v) => this.view(v, p.location));
    const items = sortVuelticas(applyFilters(published, p.filters, now, p.maxPrice), p.sort ?? 'cercanos', now);
    const { count, free } = summarize(items);
    const pending = this.db.vuelticas
      .filter((v) => v.status === 'pendiente' && me && (v.authorId === me.id || canModerate(lvl)) && !this.blockedAuthor(v.authorId))
      .map((v) => ({ ...this.view(v, p.location), mine: v.authorId === me?.id }));
    return { items, count, freeCount: free, pending };
  }

  listVuelticas(p: ListParams) {
    return this.read(() => this.list(p));
  }

  searchVuelticas(p: ListParams) {
    return this.read(() => this.list(p));
  }

  /* ----------------------------------------------------------------- detail */

  private rating(id: string): RatingSummary {
    const v = this.db.vuelticas.find((x) => x.id === id);
    const dist = this.db.ratingDist[id] ?? [0, 0, 0, 0, 0];
    return { avg: v?.ratingAvg ?? 0, count: v?.ratingCount ?? 0, distribution: dist };
  }

  getVueltica(id: string, location: LatLng): Promise<VuelticaDetail> {
    return this.write(() => {
      const me = this.me();
      const v = this.db.vuelticas.find((x) => x.id === id);
      if (!v) throw new NotFoundError();
      const lvl = level(this.db);
      const visible = isVisibleTo(v, me?.id ?? null, lvl);
      if (!visible || this.blockedAuthor(v.authorId)) throw new NotFoundError();
      if (v.status === 'publicada') {
        this.db.viewed = [id, ...this.db.viewed.filter((x) => x !== id)].slice(0, 20);
      }
      const reviews = this.db.reviews.filter((r) => r.vuelticaId === id && !this.blockedAuthor(r.authorId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
      const today = clockNow().toDateString();
      return {
        vuelticaView: this.view(v, location),
        saved: !!me && this.db.saved.some((s) => s.userId === me.id && s.vueltica === id),
        rating: this.rating(id),
        reviewsPreview: reviews,
        verification: {
          lastVerifiedAt: v.lastVerifiedAt,
          count: v.verificationCount,
          myVerifiedToday: this.db.verifications.some((x) => x.vuelticaId === id && x.personKey === (me?.id ?? `device:${this.opts.deviceId}`) && new Date(x.createdAt).toDateString() === today),
        },
        community: { authorName: v.authorName, verifiedBy: v.verificationCount, updatedAt: v.lastVerifiedAt ?? v.createdAt },
        mine: !!me && v.authorId === me.id,
        moderation: this.moderationItem(v),
      };
    });
  }

  recentlyViewed(location: LatLng) {
    return this.read(() => this.db.viewed.map((id) => this.db.vuelticas.find((v) => v.id === id)).filter((v): v is Vueltica => !!v && v.status === 'publicada' && !this.blockedAuthor(v.authorId)).map((v) => this.view(v, location)));
  }

  /* ----------------------------------------------------------------- create */

  private moderationItem(v: Vueltica): ModerationItem | undefined {
    const me = this.me();
    const community = this.db.community[v.id] ?? { votesFor: 0, votesAgainst: 0 };
    const mine = this.db.votes.filter((x) => x.vuelticaId === v.id);
    const myVote = me ? mine.find((x) => x.voterId === me.id) : undefined;
    const sumFor = community.votesFor + mine.filter((x) => x.choice === 'for').reduce((a, b) => a + b.weight, 0);
    const sumAgainst = community.votesAgainst + mine.filter((x) => x.choice === 'against').reduce((a, b) => a + b.weight, 0);
    const meta = this.db.reportMeta[v.id];
    const isNew = v.status === 'pendiente' || v.status === 'rechazada' || (v.status === 'publicada' && !meta && this.db.community[v.id]);
    const kind: ModerationKind = meta && v.status !== 'pendiente' ? 'reportada' : 'nueva';
    if (!isNew && !meta) return undefined;
    const author = this.db.users.find((u) => u.id === v.authorId);
    const authorLevel = author ? levelForPoints(author.points).number : 1;
    return {
      vuelticaId: v.id, kind, votesFor: sumFor, votesAgainst: sumAgainst,
      votesNeeded: kind === 'nueva' ? votesNeeded(authorLevel) : 3,
      reportCount: meta?.count, topReason: meta?.topReason, lastReportAt: meta?.lastReportAt, myVote: myVote?.choice,
    };
  }

  createVueltica(input: CreateVuelticaInput) {
    return this.write(() => {
      const me = this.requireMe('contribute');
      if (!input.name.trim()) throw new ValidationError('name', t.contribute.needName);
      const tier = tierForPrice(input.pricePerPerson);
      if (!tier || !isPublishablePrice(input.pricePerPerson)) throw new ValidationError('price', t.contribute.priceError);
      const v: Vueltica = {
        id: this.id('v'), type: input.type, name: input.name.trim(), category: input.category, description: input.description, photos: input.photos,
        lat: input.lat, lng: input.lng, address: input.address, province: input.province, cantonId: input.type === 'lugar' ? input.cantonId : undefined, startAt: input.startAt, endAt: input.endAt, openingHours: input.openingHours,
        priceTier: tier, pricePerPerson: input.pricePerPerson, freeFor: input.freeFor, audiences: input.audiences, wheelchair: input.wheelchair, status: 'pendiente',
        authorId: me.id, authorName: `${me.displayName.split(' ')[0]} ${me.displayName.split(' ')[1]?.[0] ?? ''}.`.trim(), createdAt: clockNow().toISOString(),
        verificationCount: 0, ratingAvg: 0, ratingCount: 0,
      };
      this.db.vuelticas.push(v);
      this.db.community[v.id] = { votesFor: 0, votesAgainst: 0 };
      me.counts.vuelticas += 1;
      return { vueltica: this.view(v, input), moderation: this.moderationItem(v)! };
    });
  }

  updateVueltica(id: string, input: CreateVuelticaInput): Promise<VuelticaView> {
    return this.write(() => {
      const me = this.requireMe('contribute');
      const v = this.db.vuelticas.find((x) => x.id === id && x.authorId === me.id);
      if (!v) throw new NotFoundError();
      if (v.status !== 'pendiente') throw new ConflictError('decided');
      if (v.type !== input.type) throw new ValidationError('type', 'type');
      if (!input.name.trim()) throw new ValidationError('name', t.contribute.needName);
      const tier = tierForPrice(input.pricePerPerson);
      if (!tier || !isPublishablePrice(input.pricePerPerson)) throw new ValidationError('price', t.contribute.priceError);
      Object.assign(v, {
        name: input.name.trim(), category: input.category, description: input.description, photos: input.photos, lat: input.lat, lng: input.lng,
        address: input.address, province: input.province, cantonId: input.type === 'lugar' ? input.cantonId : undefined, startAt: input.startAt, endAt: input.endAt,
        openingHours: input.openingHours, priceTier: tier, pricePerPerson: input.pricePerPerson, freeFor: input.freeFor, audiences: input.audiences, wheelchair: input.wheelchair,
      });
      return this.view(v, input);
    });
  }

  listCantons(province: Province): Promise<Canton[]> {
    return Promise.resolve(cantonsOf(province));
  }

  myVuelticas(location: LatLng): Promise<MyVuelticaItem[]> {
    return this.read(() => {
      const me = this.requireMe('contribute');
      return this.db.vuelticas
        .filter((v) => v.authorId === me.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((v) => {
          const m = this.moderationItem(v);
          return { vuelticaView: this.view(v, location), votesFor: m?.votesFor ?? 0, votesAgainst: m?.votesAgainst ?? 0, votesNeeded: m?.votesNeeded ?? 3 };
        });
    });
  }

  withdrawVueltica(id: string) {
    return this.write(() => {
      const me = this.requireMe('contribute');
      const idx = this.db.vuelticas.findIndex((v) => v.id === id && v.authorId === me.id);
      if (idx < 0) throw new NotFoundError();
      this.db.vuelticas.splice(idx, 1);
      me.counts.vuelticas = Math.max(0, me.counts.vuelticas - 1);
    });
  }

  /* ------------------------------------------------------------------ saved */

  saveVueltica(id: string) {
    return this.write(() => {
      const me = this.requireMe('save');
      if (!this.db.saved.some((s) => s.userId === me.id && s.vueltica === id)) {
        this.db.saved.push({ userId: me.id, vueltica: id, savedAt: clockNow().toISOString(), reminderOffsetDays: this.db.settings.reminderOffsetDays });
      }
    });
  }

  unsaveVueltica(id: string) {
    return this.write(() => {
      const me = this.requireMe('save');
      this.db.saved = this.db.saved.filter((s) => !(s.userId === me.id && s.vueltica === id));
    });
  }

  listSaved(location: LatLng): Promise<SavedItem[]> {
    return this.read(() => {
      const me = this.me();
      if (!me) return [];
      return this.db.saved
        .filter((s) => s.userId === me.id)
        .map((s) => ({ s, v: this.db.vuelticas.find((x) => x.id === s.vueltica) }))
        .filter((x): x is { s: Saved; v: Vueltica } => !!x.v && x.v.status === 'publicada' && !this.blockedAuthor(x.v.authorId))
        .map(({ s, v }) => ({ saved: s, vuelticaView: this.view(v, location) }));
    });
  }

  /* ------------------------------------------------------------ verify/report */

  private applyVerification(input: VerifyInput, userId: string | null, forcePrice = false, personKey?: string): VerifyResult {
    const v = this.db.vuelticas.find((x) => x.id === input.vuelticaId);
    if (!v) throw new NotFoundError();
    const user = userId ? this.db.users.find((u) => u.id === userId) : undefined;
    const lvl = user ? levelForPoints(user.points).number : 0;
    const key = personKey ?? userId ?? `device:${this.opts.deviceId}`;
    const fields = {
      stillHappening: input.stillHappening,
      // Price answers only count from Level 2 (placeholder decision #3).
      pricePaid: forcePrice || canVerifyPrice(lvl) ? input.pricePaid : undefined,
      scheduleCorrect: input.scheduleCorrect, correctedTime: input.correctedTime, photo: input.photo,
    };
    let points = 0;
    const prev = this.db.verifications.find((x) => x.vuelticaId === v.id && x.personKey === key);
    if (prev) {
      // Same person again: the latest answer replaces the previous one; no extra count and no extra points.
      Object.assign(prev, fields, { createdAt: clockNow().toISOString() });
      v.lastVerifiedAt = prev.createdAt;
    } else {
      const ver: Verification = { id: this.id('ver'), vuelticaId: v.id, userId, personKey: key, ...fields, createdAt: clockNow().toISOString() };
      this.db.verifications.push(ver);
      v.lastVerifiedAt = ver.createdAt;
      v.verificationCount += 1;
      if (user) {
        user.counts.verifications += 1;
        points = this.addPoints(user.id, 'verified');
      }
    }
    // 3 matching verifications update the listing (level 4+ count double).
    const weighted = this.db.verifications
      .filter((x) => x.vuelticaId === v.id)
      .flatMap((x) => {
        const u = x.userId ? this.db.users.find((y) => y.id === x.userId) : undefined;
        const w = u && levelForPoints(u.points).number >= 4 ? 2 : 1;
        return Array.from({ length: w }, () => x);
      });
    const out = outcomeOfVerifications(weighted);
    let hidden = false;
    if (out.hidden) {
      v.status = 'oculta';
      v.hiddenReason = out.hiddenReason;
      hidden = true;
    } else if (out.priceTier) {
      v.priceTier = out.priceTier;
      v.pricePerPerson = out.priceTier === 'gratis' ? 0 : out.priceTier === 'hasta2500' ? Math.min(v.pricePerPerson || 2500, 2500) || 2500 : Math.max(v.pricePerPerson, 2501);
    }
    if (out.hidden || out.priceTier) this.db.verifications = this.db.verifications.filter((x) => x.vuelticaId !== v.id);
    return { queued: false, points, hidden };
  }

  verify(input: VerifyInput): Promise<VerifyResult> {
    return (async () => {
      await this.ready;
      if (this.opts.isOffline()) {
        // Queued and sent when the connection comes back.
        this.db.queue.push({ id: this.id('q'), ...input, queuedAt: clockNow().toISOString() });
        this.persist();
        return { queued: true, points: 0, hidden: false };
      }
      return this.write(() => this.applyVerification(input, this.db.currentUserId));
    })();
  }

  quickConfirm(vuelticaId: string) {
    return this.verify({ vuelticaId, stillHappening: 'si' });
  }

  flushQueuedVerifications(): Promise<number> {
    return this.write(() => {
      const q = this.db.queue;
      this.db.queue = [];
      for (const item of q) {
        try {
          this.applyVerification(item, this.db.currentUserId);
        } catch {
          /* vueltica gone: drop */
        }
      }
      return q.length;
    });
  }

  report(input: ReportInput): Promise<Report> {
    return this.write(() => {
      const key = `${input.vuelticaId}:${this.opts.deviceId}`;
      if (this.db.reportDevices.includes(key)) throw new DuplicateReportError();
      const v = this.db.vuelticas.find((x) => x.id === input.vuelticaId);
      if (!v) throw new NotFoundError();
      this.db.reportDevices.push(key);
      const r: Report = {
        id: this.id('rep'), vuelticaId: v.id, reporterId: this.db.currentUserId ?? this.opts.deviceId, reason: input.reason,
        details: input.details, photo: input.photo, createdAt: clockNow().toISOString(),
      };
      this.db.reports.push(r);
      this.afterReport(v);
      return { ...r, reporterId: '' };
    });
  }

  private afterReport(v: Vueltica) {
    const reps = this.db.reports.filter((x) => x.vuelticaId === v.id);
    const res = reportsHide(reps);
    this.db.reportMeta[v.id] = { count: reps.length, topReason: res.topReason ?? reps[reps.length - 1].reason, lastReportAt: reps[reps.length - 1].createdAt };
    this.db.community[v.id] ??= { votesFor: 0, votesAgainst: 0 };
    if (res.hide && v.status === 'publicada') {
      v.status = 'oculta';
      v.reportedAt = clockNow().toISOString();
      v.hiddenReason = 'En revisión por reportes';
    }
  }

  /* ---------------------------------------------------------------- reviews */

  listReviews(p: ReviewListParams): Promise<ReviewList> {
    return this.read(() => {
      let items = this.db.reviews.filter((r) => r.vuelticaId === p.vuelticaId && !this.blockedAuthor(r.authorId));
      if (p.audience === 'familias') items = items.filter((r) => r.wentWith === 'familia');
      if (p.audience === 'estudiantes') items = items.filter((r) => r.wentWith === 'amigos' || r.wentWith === 'solo');
      if (p.sort === 'fotos') items = items.filter((r) => r.photos.length > 0);
      items = [...items].sort((a, b) => (p.sort === 'utiles' ? b.usefulCount - a.usefulCount || b.createdAt.localeCompare(a.createdAt) : b.createdAt.localeCompare(a.createdAt)));
      return { summary: this.rating(p.vuelticaId), items };
    });
  }

  createReview(input: CreateReviewInput): Promise<Review> {
    return this.write(() => {
      const me = this.requireMe('review');
      const v = this.db.vuelticas.find((x) => x.id === input.vuelticaId);
      if (!v) throw new NotFoundError();
      if (input.stars < 1 || input.stars > 5) throw new ValidationError('stars', t.reviews.compose.needStars);
      const r: Review = {
        id: this.id('r'), vuelticaId: v.id, authorId: me.id, authorName: me.displayName, authorInitials: me.initials, createdAt: clockNow().toISOString(),
        stars: input.stars, wentWith: input.wentWith, spent: input.spent, text: input.text.trim(), photos: input.photos, usefulCount: 0, markedUsefulByMe: false,
      };
      this.db.reviews.unshift(r);
      const dist = (this.db.ratingDist[v.id] ??= [0, 0, 0, 0, 0]);
      dist[input.stars - 1] += 1;
      const total = v.ratingAvg * v.ratingCount + input.stars;
      v.ratingCount += 1;
      v.ratingAvg = Math.round((total / v.ratingCount) * 10) / 10;
      me.counts.reviews += 1;
      return r;
    });
  }

  /** Moves one rating in the plan's average and distribution (create: from 0, delete: to 0). */
  private moveRating(v: Vueltica, from: number, to: number) {
    const dist = (this.db.ratingDist[v.id] ??= [0, 0, 0, 0, 0]);
    if (from) dist[from - 1] = Math.max(0, dist[from - 1] - 1);
    if (to) dist[to - 1] += 1;
    const count = dist.reduce((a, b) => a + b, 0);
    v.ratingCount = Math.max(0, v.ratingCount + (to ? 1 : 0) - (from ? 1 : 0));
    v.ratingAvg = count ? Math.round((dist.reduce((a, n, i) => a + n * (i + 1), 0) / count) * 10) / 10 : 0;
  }

  updateReview(reviewId: string, input: CreateReviewInput): Promise<Review> {
    return this.write(() => {
      const me = this.requireMe('review');
      const r = this.db.reviews.find((x) => x.id === reviewId);
      if (!r) throw new NotFoundError();
      if (r.authorId !== me.id) throw new ForbiddenError('not-author');
      if (input.stars < 1 || input.stars > 5) throw new ValidationError('stars', t.reviews.compose.needStars);
      const v = this.db.vuelticas.find((x) => x.id === r.vuelticaId);
      if (v && r.stars !== input.stars) this.moveRating(v, r.stars, input.stars);
      Object.assign(r, { stars: input.stars, wentWith: input.wentWith, spent: input.spent, text: input.text.trim(), photos: input.photos });
      return { ...r };
    });
  }

  deleteReview(reviewId: string): Promise<void> {
    return this.write(() => {
      const me = this.requireMe('review');
      const idx = this.db.reviews.findIndex((x) => x.id === reviewId);
      if (idx < 0) throw new NotFoundError();
      const r = this.db.reviews[idx];
      if (r.authorId !== me.id) throw new ForbiddenError('not-author');
      this.db.reviews.splice(idx, 1);
      const v = this.db.vuelticas.find((x) => x.id === r.vuelticaId);
      if (v) this.moveRating(v, r.stars, 0);
      me.counts.reviews = Math.max(0, me.counts.reviews - 1);
    });
  }

  markUseful(reviewId: string): Promise<Review> {
    return this.write(() => {
      const me = this.requireMe('useful');
      const r = this.db.reviews.find((x) => x.id === reviewId);
      if (!r) throw new NotFoundError();
      if (r.markedUsefulByMe) {
        r.markedUsefulByMe = false;
        r.usefulCount = Math.max(0, r.usefulCount - 1);
      } else {
        r.markedUsefulByMe = true;
        r.usefulCount += 1;
        if (r.authorId && r.authorId !== me.id) this.addPoints(r.authorId, 'reviewUseful');
      }
      return { ...r };
    });
  }

  /* -------------------------------------------------------------- moderation */

  private queueItems(location: LatLng) {
    const me = this.me();
    const nuevas: ModerationQueue['nuevas'] = [];
    const reportadas: ModerationQueue['reportadas'] = [];
    for (const v of this.db.vuelticas) {
      if ((me && v.authorId === me.id) || this.blockedAuthor(v.authorId)) continue;
      const item = this.moderationItem(v);
      if (!item) continue;
      if (v.status === 'pendiente') nuevas.push({ ...item, kind: 'nueva', vuelticaView: this.view(v, location) });
      else if ((item.reportCount ?? 0) >= REPORT_QUEUE_MIN && (v.status === 'oculta' || v.status === 'publicada') && this.db.reportMeta[v.id]) {
        reportadas.push({ ...item, kind: 'reportada', vuelticaView: this.view(v, location) });
      }
    }
    return { nuevas, reportadas };
  }

  moderationQueue(location: LatLng): Promise<ModerationQueue> {
    return this.read(() => {
      const me = this.requireMe('moderate');
      if (!canModerate(levelForPoints(me.points).number)) throw new ForbiddenError('level');
      const q = this.queueItems(location);
      return { ...q, total: q.nuevas.length + q.reportadas.length };
    });
  }

  moderationCount(): Promise<number> {
    return this.read(() => {
      const me = this.me();
      if (!me || !canModerate(levelForPoints(me.points).number)) return 0;
      const q = this.queueItems({ lat: 0, lng: 0 });
      return q.nuevas.length + q.reportadas.length;
    });
  }

  /** Re-evaluate a queue item after votes change. */
  private resolve(v: Vueltica) {
    const item = this.moderationItem(v);
    if (!item) return;
    if (item.kind === 'nueva') {
      const d = decideNew(item);
      if (d === 'publish' && v.status !== 'publicada') {
        v.status = 'publicada';
        v.lastVerifiedAt = clockNow().toISOString();
        if (v.authorId && !this.db.notified.includes(`pub:${v.id}`)) {
          this.db.notified.push(`pub:${v.id}`);
          this.addPoints(v.authorId, 'published');
        }
      } else if (d === 'reject' && v.status !== 'rechazada') {
        v.status = 'rechazada';
        v.rejectionReason = 'La comunidad no la aprobó';
        if (v.authorId && !this.db.notified.includes(`rej:${v.id}`)) {
          this.db.notified.push(`rej:${v.id}`);
          this.addPoints(v.authorId, 'rejected');
        }
      } else if (d === 'pending' && (v.status === 'publicada' || v.status === 'rechazada') && this.db.community[v.id]) {
        v.status = 'pendiente';
      }
    } else {
      const d = decideReported(item);
      if (d === 'hide') {
        v.status = 'oculta';
        v.hiddenReason = 'Ocultada por moderación';
        if (v.authorId && !this.db.notified.includes(`hid:${v.id}`)) {
          this.db.notified.push(`hid:${v.id}`);
          this.addPoints(v.authorId, 'reported');
        }
      } else if (d === 'keep') {
        v.status = 'publicada';
        v.hiddenReason = undefined;
        delete this.db.reportMeta[v.id];
        this.db.reports = this.db.reports.filter((r) => r.vuelticaId !== v.id);
      }
    }
  }

  vote(input: { vuelticaId: string; choice: 'for' | 'against' }): Promise<ModerationItem> {
    return this.write(() => {
      const me = this.requireMe('moderate');
      const lvl = levelForPoints(me.points).number;
      if (!canModerate(lvl)) throw new ForbiddenError('level');
      const v = this.db.vuelticas.find((x) => x.id === input.vuelticaId);
      if (!v) throw new NotFoundError();
      if (v.authorId === me.id) throw new ForbiddenError('own');
      const before = this.moderationItem(v)!;
      const mine = this.db.votes.find((x) => x.vuelticaId === v.id && x.voterId === me.id);
      if (mine) {
        // Voting again replaces the previous vote (no extra point).
        mine.choice = input.choice;
      } else {
        this.db.votes.push({ vuelticaId: v.id, voterId: me.id, kind: before.kind, choice: input.choice, weight: voteWeight(lvl) });
        this.addPoints(me.id, 'moderationVote');
      }
      const after = this.moderationItem(v)!;
      // moderators who vote against the clear majority lose trust (placeholder: -2 per such vote)
      if (isMinorityVote(input.choice, { votesFor: after.votesFor - (input.choice === 'for' ? voteWeight(lvl) : 0), votesAgainst: after.votesAgainst - (input.choice === 'against' ? voteWeight(lvl) : 0) }) && (after.votesFor + after.votesAgainst) >= after.votesNeeded) {
        this.addPoints(me.id, 'rejected', -2);
      }
      this.resolve(v);
      return this.moderationItem(v) ?? after;
    });
  }

  undoVote(vuelticaId: string): Promise<ModerationItem> {
    return this.write(() => {
      const me = this.requireMe('moderate');
      const v = this.db.vuelticas.find((x) => x.id === vuelticaId);
      if (!v) throw new NotFoundError();
      const idx = this.db.votes.findIndex((x) => x.vuelticaId === vuelticaId && x.voterId === me.id);
      if (idx >= 0) {
        this.db.votes.splice(idx, 1);
        this.addPoints(me.id, 'moderationVote', -1);
      }
      this.resolve(v);
      return this.moderationItem(v)!;
    });
  }

  /* ----------------------------------------------------------------- blocks */

  blockAuthor(target: { kind: 'vueltica' | 'review'; id: string }): Promise<void> {
    return this.write(() => {
      const me = this.requireMe('block');
      let authorId: string | null | undefined;
      let name = '';
      if (target.kind === 'review') {
        const r = this.db.reviews.find((x) => x.id === target.id);
        if (!r) throw new NotFoundError();
        authorId = r.authorId;
        name = r.authorName;
      } else {
        const v = this.db.vuelticas.find((x) => x.id === target.id);
        if (!v) throw new NotFoundError();
        authorId = v.authorId;
        name = v.authorName;
      }
      if (!authorId) throw new NotFoundError();
      if (authorId === me.id) throw new ValidationError('self', t.blocks.self);
      this.db.blocks ??= [];
      if (this.db.blocks.some((b) => b.blockerId === me.id && b.blockedId === authorId)) return;
      this.db.blocks.push({ id: this.id('b'), blockerId: me.id, blockedId: authorId, blockedName: name, createdAt: clockNow().toISOString() });
    });
  }

  listBlocks(): Promise<BlockedUser[]> {
    return this.read(() => {
      const me = this.requireMe('block');
      return (this.db.blocks ?? []).filter((b) => b.blockerId === me.id).map((b) => ({ id: b.id, name: b.blockedName, blockedAt: b.createdAt }));
    });
  }

  unblock(blockId: string): Promise<void> {
    return this.write(() => {
      const me = this.requireMe('block');
      this.db.blocks = (this.db.blocks ?? []).filter((b) => !(b.id === blockId && b.blockerId === me.id));
    });
  }

  /** The demo has no team roles: level 5 (Embajadora) stands in for a moderator of the team. */
  private isTeam(me: User) {
    return levelForPoints(me.points).number >= 5;
  }

  decideSubmission(input: DecideInput): Promise<void> {
    return this.write(() => {
      const me = this.requireMe('moderate');
      if (!this.isTeam(me)) throw new ForbiddenError('team');
      const v = this.db.vuelticas.find((x) => x.id === input.vuelticaId);
      if (!v) throw new NotFoundError();
      if (v.status !== 'pendiente') throw new ConflictError('decided');
      if (input.decision === 'approve') {
        v.status = 'publicada';
        v.lastVerifiedAt = clockNow().toISOString();
        if (v.authorId && !this.db.notified.includes(`pub:${v.id}`)) {
          this.db.notified.push(`pub:${v.id}`);
          this.addPoints(v.authorId, 'published');
        }
      } else {
        const reason = input.reason ?? 'otro';
        if (reason === 'otro' && !input.note?.trim()) throw new ValidationError('note', t.moderation.decide.needNote);
        v.status = 'rechazada';
        v.rejectionReason = reason === 'otro' ? input.note!.trim() : t.moderation.decide.codes[reason];
        if (v.authorId && !this.db.notified.includes(`rej:${v.id}`)) {
          this.db.notified.push(`rej:${v.id}`);
          this.addPoints(v.authorId, 'rejected');
        }
      }
      delete this.db.community[v.id];
    });
  }

  reputationSummary() {
    return this.read(() => {
      const me = this.requireMe('moderate');
      const recent = this.db.events.filter((e) => e.userId === me.id).slice(-5).reverse();
      return { ...reputationFor(me.points, recent), recent, team: this.isTeam(me) || undefined };
    });
  }

  /* -------------------------------------------------------------- account */

  readonly signInProviders: User['provider'][] = ['apple', 'google'];

  signIn(input: { provider: User['provider']; privacyVersion?: string }) {
    return this.write(() => {
      let u = this.db.users.find((x) => x.id === ANA_ID);
      if (!u) {
        // After the demo account was deleted: a fresh account, as Google / Apple would create.
        u = {
          id: this.id('u'), displayName: 'Persona Nueva', initials: initialsOf('Persona Nueva'), province: 'San José', memberSince: clockNow().toISOString(),
          provider: input.provider, points: 0, counts: { vuelticas: 0, reviews: 0, verifications: 0 },
        };
        this.db.users.push(u);
      }
      u.provider = input.provider;
      if (input.privacyVersion) u.privacyVersion = input.privacyVersion;
      this.db.currentUserId = u.id;
      return { ...u };
    });
  }

  acceptPrivacy(version: string) {
    return this.write(() => {
      const me = this.requireMe('save');
      me.privacyVersion = version;
      return { ...me };
    });
  }

  signOut() {
    return this.write(() => {
      this.db.currentUserId = null;
    });
  }

  async currentUser(): Promise<User | null> {
    await this.ready;
    const u = this.me();
    return u ? { ...u } : null;
  }

  async getSettings(): Promise<Settings> {
    await this.ready;
    return { ...this.db.settings };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    await this.ready;
    const offsetChanged = patch.reminderOffsetDays !== undefined && patch.reminderOffsetDays !== this.db.settings.reminderOffsetDays;
    this.db.settings = { ...this.db.settings, ...patch };
    if (offsetChanged) for (const s of this.db.saved) if (s.userId === this.db.currentUserId) s.reminderOffsetDays = patch.reminderOffsetDays!;
    this.persist();
    return { ...this.db.settings };
  }

  exportMyData(): Promise<ExportedData> {
    return this.read(() => {
      const me = this.requireMe('save');
      const data = {
        exportedAt: clockNow().toISOString(),
        user: me,
        settings: this.db.settings,
        vuelticas: this.db.vuelticas.filter((v) => v.authorId === me.id),
        reviews: this.db.reviews.filter((r) => r.authorId === me.id),
        saved: this.db.saved.filter((s) => s.userId === me.id),
        verifications: this.db.verifications.filter((v) => v.userId === me.id),
        reputation: this.db.events.filter((e) => e.userId === me.id),
      };
      return { filename: 'mivueltica-mis-datos.json', mimeType: 'application/json', content: JSON.stringify(data, null, 2) };
    });
  }

  deleteAccount() {
    return this.write(() => {
      const me = this.requireMe('save');
      this.db.reviews = this.db.reviews.filter((r) => r.authorId !== me.id);
      this.db.vuelticas = this.db.vuelticas.filter((v) => !(v.authorId === me.id && (v.status === 'pendiente' || v.status === 'rechazada')));
      for (const v of this.db.vuelticas) if (v.authorId === me.id) Object.assign(v, { authorId: null, authorName: t.common.anonymous });
      this.db.saved = this.db.saved.filter((s) => s.userId !== me.id);
      this.db.votes = this.db.votes.filter((x) => x.voterId !== me.id);
      this.db.events = this.db.events.filter((e) => e.userId !== me.id);
      this.db.verifications = this.db.verifications.map((x) => (x.userId === me.id ? { ...x, userId: null } : x));
      this.db.users = this.db.users.filter((u) => u.id !== me.id);
      this.db.currentUserId = null;
    });
  }

  scheduleNotifications(): Promise<ScheduledReminder[]> {
    return this.read(() => {
      const me = this.me();
      if (!me || !this.db.settings.notifyReminders) return [];
      const now = clockNow();
      const out: ScheduledReminder[] = [];
      for (const s of this.db.saved.filter((x) => x.userId === me.id)) {
        const v = this.db.vuelticas.find((x) => x.id === s.vueltica);
        if (!v?.startAt) continue;
        const fire = new Date(v.startAt);
        fire.setDate(fire.getDate() - s.reminderOffsetDays);
        fire.setHours(9, 0, 0, 0);
        if (fire.getTime() <= now.getTime()) continue;
        const time = new Date(v.startAt);
        const h = time.getHours();
        const label = `${h % 12 === 0 ? 12 : h % 12}:${String(time.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
        out.push({ id: `rem-${v.id}`, vuelticaId: v.id, title: v.name, body: t.notifications.eventTomorrow(v.name, label), fireAt: fire.toISOString() });
      }
      return out;
    });
  }

  /* ------------------------------------------------------------- dev tools */

  simulateCommunity(input: SimulateInput): Promise<void> {
    return this.write(() => {
      const n = input.count ?? 1;
      const targets = input.vuelticaId ? this.db.vuelticas.filter((v) => v.id === input.vuelticaId) : this.db.vuelticas.filter((v) => v.status === 'pendiente');
      for (const v of targets) {
        if (input.kind === 'votes') {
          const c = (this.db.community[v.id] ??= { votesFor: 0, votesAgainst: 0 });
          if ((input.choice ?? 'for') === 'for') c.votesFor += n;
          else c.votesAgainst += n;
          this.resolve(v);
        } else if (input.kind === 'verifications') {
          for (let i = 0; i < n; i++) this.applyVerification({ vuelticaId: v.id, stillHappening: input.stillHappening ?? 'si', pricePaid: input.pricePaid }, null, true, `sim:${this.id('p')}`);
          // anonymous simulated verifications count even for price (they stand for L2+ users)
        } else {
          for (let i = 0; i < n; i++) {
            this.db.reports.push({ id: this.id('rep'), vuelticaId: v.id, reporterId: `sim-${i}`, reason: input.reason ?? 'noGratis', createdAt: clockNow().toISOString() });
          }
          this.afterReport(v);
        }
      }
    });
  }

  /** For tests/e2e: peek at "needs review" flag. */
  needsReviewFlag(id: string): boolean {
    const v = this.db.vuelticas.find((x) => x.id === id);
    return needsReview(v?.reportedAt, clockNow());
  }
}
