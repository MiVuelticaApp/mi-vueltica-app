import { cantonsOf, type Canton } from '@/domain/cantons';
import { applyFilters, dateRange, sortVuelticas, summarize } from '@/domain/filters';
import { haversineKm } from '@/domain/geo';
import { levelForPoints, reputationFor, votesNeeded, tierRank } from '@/domain/rules';
import type {
  BlockedUser, Filters, LatLng, MaxPrice, ModerationItem, Province, Report, Review, Settings, SignInProvider, User, VuelticaView,
} from '@/domain/types';
import { now as clockNow } from '@/lib/clock';
import { t } from '@/i18n/es-CR';
import {
  AuthRequiredError, ConflictError, DuplicateReportError, ForbiddenError, NotFoundError, NotSupportedError, OfflineError, ValidationError,
  type CreateReviewInput, type CreateVuelticaInput, type DecideInput, type ExportedData, type ListParams, type ListResult, type MiVuelticaApi,
  type ModerationQueue, type MyVuelticaItem, type ReportInput, type ReviewList, type ReviewListParams, type SavedItem,
  type ScheduledReminder, type SimulateInput, type VerifyInput, type VerifyResult, type VuelticaDetail,
} from '../api';
import { defaultSettings } from '../mock/seed';
import type { KeyValueStore } from '../storage/types';
import type { HttpClient, Query } from './client';
import type {
  AuthDto, BlockDto, CategoryDto, ProvinceDto, EventDetailDto, EventDto, FavoriteDto, ModerationQueueDto, ModerationVoteDto, MyProfileDto, PlaceDetailDto, PlaceDto,
  ReportDto, ReportQueueItemDto, ReputationDto, ReviewDto, ReviewListDto, SubmissionDto, UserDto, VerifyBodyDto, VerifyDto,
} from './dto';
import {
  audienceToApi, defaultCantonOf, provinceOfCanton as provinceOfCantonId, eventToView, makeId, moderationFromTally, parseId, parseOpeningHours, placeToView, provinceIdOf,
  reportFromApi, reputationFromApi, reviewFromApi, submissionToView, userFromApi,
} from './mappers';
import { appleAuthorizationCode, appleSignIn, googleSignIn, googleSignOut } from './socialAuth';
import { tokenStore } from './tokenStore';
import { uploadPhoto, uploadPhotos } from './uploads';
import { Platform } from 'react-native';

const KV_USER = 'mv.api.user';
const KV_SETTINGS = 'mv.api.settings';
const KV_RECENT = 'mv.api.recent';
const KV_DEVICE = 'mv.api.deviceId';
const KV_QUEUE = 'mv.api.verifyQueue';
const RECENT_MAX = 20;
const MAX_PHOTOS = 5;
const EMPTY_RATING = { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
const REVIEW_SORT = { recientes: '-createdAt', fotos: '-photoCount', utiles: '-usefulCount' } as const;

type QueueEntry = ModerationQueue['nuevas'][number];
type CachedUser = { user: User; dto: UserDto };

const unsupported = (feature: string): never => {
  throw new NotSupportedError(feature);
};
const planPath = (kind: 'p' | 'e', uuid: string) => (kind === 'p' ? `/places/${uuid}` : `/events/${uuid}`);
const stricter = (a: MaxPrice, b?: MaxPrice): MaxPrice => (!b || tierRank(a) <= tierRank(b) ? a : b);

/**
 * `MiVuelticaApi` over mi-vueltica-api. The app's contract is the source of truth: whatever the API cannot do yet
 * either degrades to an empty/neutral value (reads) or throws `NotSupportedError` (writes). Every remaining gap is
 * listed in docs/API_INTEGRATION.md.
 */
export class HttpApi implements MiVuelticaApi {
  readonly signInProviders: SignInProvider[] = Platform.OS === 'ios' ? ['apple', 'google'] : Platform.OS === 'android' ? ['google'] : [];

  private categories?: Promise<Map<number, string>>;
  private user: User | null = null;
  private dto: UserDto | null = null;
  /** Last seen state of each review's "útil" (the contract only passes the id to `markUseful`). */
  private reviews = new Map<string, ReviewDto>();
  /** Queue items by app id: community moderators cannot `GET /submissions/:id`, so the detail opens from here. */
  private queued = new Map<string, QueueEntry>();
  private deviceId?: Promise<string>;

  constructor(private http: HttpClient, private store: KeyValueStore) {}

  /* ---------------------------------------------------------------- helpers */

  private categoryMap(): Promise<Map<number, string>> {
    this.categories ??= this.http
      .getAll<CategoryDto>('/categories', { sort: 'name' }, { auth: false })
      .then((rows) => new Map(rows.map((c) => [c.id, c.name] as const)))
      .catch((e) => {
        this.categories = undefined; // retry next time
        throw e;
      });
    return this.categories;
  }

  private async categoryId(name: string): Promise<number> {
    const hit = [...(await this.categoryMap())].find(([, n]) => n.toLowerCase() === name.trim().toLowerCase());
    if (!hit) throw new ValidationError('category', `Unknown category "${name}"`);
    return hit[0];
  }

  private get role(): UserDto['role'] {
    return this.dto?.role ?? 'USER';
  }

  private async signedIn(): Promise<boolean> {
    if (!(await tokenStore.get())) return false;
    if (!this.user) await this.currentUser().catch(() => null);
    return !!this.user;
  }

  private privileged(): boolean {
    return this.role === 'MODERATOR' || this.role === 'ADMIN';
  }

  /** Community moderation is open from level 3 (#43) and always to team roles. */
  private async mayModerate(): Promise<boolean> {
    if (!(await this.signedIn())) return false;
    return this.privileged() || levelForPoints(this.user?.points ?? 0).number >= 3;
  }

  private async readJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  /** Guests verify and report as a device (`X-Device-Id`); a random id kept on the device. */
  private device(): Promise<string> {
    this.deviceId ??= (async () => {
      const saved = await this.store.getItem(KV_DEVICE).catch(() => null);
      if (saved) return saved;
      const id = `app.${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}`;
      await this.store.setItem(KV_DEVICE, id).catch(() => {});
      return id;
    })();
    return this.deviceId;
  }

  private async remember(v: VuelticaView) {
    const list = ((await this.readJson<VuelticaView[]>(KV_RECENT)) ?? []).filter((x) => x.id !== v.id);
    list.unshift({ ...v, distanceKm: 0 });
    await this.store.setItem(KV_RECENT, JSON.stringify(list.slice(0, RECENT_MAX)));
  }

  /* ------------------------------------------------------------------ lists */

  /** Server-side pre-filter (#36): the same rules run again client-side, so the API only narrows what is downloaded. */
  private conditionQuery(f: Filters, loc: LatLng, maxPrice?: MaxPrice): Query {
    return {
      ...(f.nearMe ? { lat: loc.lat, lng: loc.lng, radiusKm: Math.max(0.1, f.distanceKm) } : {}),
      q: f.text.trim() || undefined,
      maxPrice: stricter(f.maxPrice, maxPrice),
      students: f.students ? 'true' : undefined,
      seniors: f.seniors ? 'true' : undefined,
      families: f.families ? 'true' : undefined,
      wheelchair: f.wheelchair ? 'true' : undefined,
    };
  }

  private async fetchPlaces(f: Filters, loc: LatLng, cats: Map<number, string>, maxPrice?: MaxPrice): Promise<VuelticaView[]> {
    const rows = await this.http.getAll<PlaceDto>('/places', { ...this.conditionQuery(f, loc, maxPrice), sort: 'name' });
    return rows.map((p) => placeToView(p, cats, loc));
  }

  private async fetchEvents(f: Filters, loc: LatLng, cats: Map<number, string>, now: Date, maxPrice?: MaxPrice): Promise<VuelticaView[]> {
    const range = dateRange(f.date, now);
    const rows = await this.http.getAll<EventDto>('/events', {
      ...this.conditionQuery(f, loc, maxPrice),
      from: range?.from.toISOString(),
      to: range?.to.toISOString(),
    });
    // Events without any location (allowed by #37) cannot be placed on the map.
    return rows.map((e) => eventToView(e, cats, loc)).filter((v): v is VuelticaView => !!v);
  }

  private async pendingPins(loc: LatLng, cats: Map<number, string>): Promise<ListResult['pending']> {
    if (!(await this.signedIn())) return [];
    const out: ListResult['pending'] = [];
    const seen = new Set<string>();
    try {
      for (const s of await this.http.getAll<SubmissionDto>('/me/submissions', { status: 'PENDING' }, { auth: 'required' }, 1)) {
        seen.add(s.id);
        out.push({ ...submissionToView(s, cats, loc, this.user?.displayName), mine: true });
      }
      if (await this.mayModerate()) {
        const q = await this.moderationQueue(loc);
        for (const item of q.nuevas) if (!seen.has(parseId(item.vuelticaId).uuid)) out.push({ ...item.vuelticaView, mine: false });
      }
    } catch {
      /* pins for pending plans are a nicety; never fail the list because of them */
    }
    return out;
  }

  async listVuelticas({ filters, location, sort = 'cercanos', maxPrice }: ListParams): Promise<ListResult> {
    const now = clockNow();
    const cats = await this.categoryMap();
    const [places, events, pending, saved] = await Promise.all([
      filters.types.includes('lugar') ? this.fetchPlaces(filters, location, cats, maxPrice) : [],
      filters.types.includes('evento') ? this.fetchEvents(filters, location, cats, now, maxPrice) : [],
      this.pendingPins(location, cats),
      this.savedIds(),
    ]);
    const items = sortVuelticas(
      applyFilters([...places, ...events], filters, now, maxPrice).map((v) => ({ ...v, saved: v.saved || saved.has(v.id) })),
      sort,
      now,
    );
    const { count, free } = summarize(items);
    return { items, count, freeCount: free, pending };
  }

  searchVuelticas(p: ListParams): Promise<ListResult> {
    return this.listVuelticas(p);
  }

  /* ----------------------------------------------------------------- detail */

  private async reviewsPreview(kind: 'p' | 'e', uuid: string): Promise<Review[]> {
    try {
      const res = await this.http.get<ReviewListDto>(`${planPath(kind, uuid)}/reviews`, { query: { sort: '-createdAt', pageSize: 3 } });
      res.data.forEach((r) => this.reviews.set(r.id, r));
      return res.data.map(reviewFromApi);
    } catch {
      return [];
    }
  }

  async getVueltica(id: string, location: LatLng): Promise<VuelticaDetail> {
    const { kind, uuid } = parseId(id);
    const cats = await this.categoryMap();

    if (kind === 'p' || kind === 'e') {
      // Guests: the device id only fills `myVerifiedToday`. Skipped on web, where the API's CORS does not allow the header yet.
      const headers = (await tokenStore.get()) || Platform.OS === 'web' ? undefined : { 'X-Device-Id': await this.device() };
      const [dto, reviewsPreview] = await Promise.all([
        this.http.get<PlaceDetailDto | EventDetailDto>(planPath(kind, uuid), { headers }),
        this.reviewsPreview(kind, uuid),
      ]);
      const view = kind === 'p' ? placeToView(dto as PlaceDetailDto, cats, location) : eventToView(dto as EventDetailDto, cats, location);
      if (!view) throw new NotFoundError();
      if (view.status === 'publicada') void this.remember(view);
      const queued = this.queued.get(id);
      return {
        vuelticaView: view,
        saved: !!dto.isFavorite,
        rating: { avg: dto.averageRating ?? 0, count: dto.reviewCount ?? 0, distribution: dto.ratingDistribution ?? [0, 0, 0, 0, 0] },
        reviewsPreview,
        verification: { lastVerifiedAt: dto.lastVerifiedAt ?? undefined, count: dto.verificationCount ?? 0, myVerifiedToday: !!dto.myVerifiedToday },
        community: { authorName: view.authorName, verifiedBy: dto.verificationCount ?? 0, updatedAt: dto.lastVerifiedAt ?? dto.updatedAt },
        mine: !!dto.isMine,
        moderation: queued ? this.stripView(queued) : undefined,
      };
    }

    // Submission: the author's own (any status), or one from the community moderation queue.
    let s: SubmissionDto | null = null;
    if (await tokenStore.get()) {
      try {
        s = await this.http.get<SubmissionDto>(`/me/submissions/${uuid}`, { auth: 'required' });
      } catch (err) {
        if (!(err instanceof NotFoundError)) throw err;
      }
    }
    if (!s) {
      const queued = this.queued.get(id);
      if (queued) return this.queuedDetail(queued);
      if (!this.privileged()) throw new NotFoundError();
      s = await this.http.get<SubmissionDto>(`/submissions/${uuid}`);
    }
    // Approved (#40): open the place / event it became.
    if (s.status === 'PUBLISHED' && s.created) return this.getVueltica(makeId(s.created.type === 'PLACE' ? 'p' : 'e', s.created.id), location);
    const me = this.user;
    const mine = !!me && s.userId === me.id;
    const view = submissionToView(s, cats, location, mine ? me.displayName : undefined);
    return {
      ...this.emptyDetail(view),
      mine,
      moderation: s.status === 'PENDING' ? this.authorModeration(view.id) : undefined,
    };
  }

  private emptyDetail(view: VuelticaView): VuelticaDetail {
    return {
      vuelticaView: view,
      saved: false,
      rating: EMPTY_RATING,
      reviewsPreview: [],
      verification: { count: 0, myVerifiedToday: false },
      community: { authorName: view.authorName, verifiedBy: 0, updatedAt: view.createdAt },
      mine: false,
    };
  }

  private queuedDetail(q: QueueEntry): VuelticaDetail {
    return { ...this.emptyDetail(q.vuelticaView), moderation: this.stripView(q) };
  }

  private stripView({ vuelticaView: _v, ...item }: QueueEntry): ModerationItem {
    return item;
  }

  async recentlyViewed(location: LatLng): Promise<VuelticaView[]> {
    const list = (await this.readJson<VuelticaView[]>(KV_RECENT)) ?? [];
    return list.map((v) => ({ ...v, distanceKm: haversineKm(location, v) }));
  }

  /* ---------------------------------------------------------- contributions */

  /**
   * What the author sees of their own pending suggestion. The API does not expose the tally to the author (#43), only
   * the threshold is known: 5 votes, 3 when the author is level 3+.
   */
  private authorModeration(vuelticaId: string): ModerationItem {
    return { vuelticaId, kind: 'nueva', votesFor: 0, votesAgainst: 0, votesNeeded: votesNeeded(levelForPoints(this.user?.points ?? 0).number) };
  }

  /** `POST` / `PUT /me/submissions` body. Photos not on the server yet are uploaded first. */
  private async submissionBody(input: CreateVuelticaInput) {
    const categoryId = await this.categoryId(input.category);
    const photos = await uploadPhotos(this.http, input.photos, MAX_PHOTOS);
    const address = input.address.trim().slice(0, 191) || undefined;
    const common = {
      categoryId,
      description: input.description.trim().slice(0, 5000) || undefined,
      targetAudience: audienceToApi(input.audiences),
      pricePerPerson: input.pricePerPerson,
      freeFor: input.freeFor,
      audiences: input.audiences.length ? input.audiences : ['todo'],
      wheelchair: input.wheelchair,
      photos: photos.length ? photos : undefined,
    };
    const body =
      input.type === 'lugar'
        ? {
            type: 'PLACE',
            data: {
              ...common,
              cantonId: input.cantonId ?? defaultCantonOf(input.province),
              name: input.name.trim(),
              latitude: input.lat,
              longitude: input.lng,
              address,
              openingHours: parseOpeningHours(input.openingHours),
            },
          }
        : {
            type: 'EVENT',
            // #37: an event without a fixed place carries its own point.
            data: { ...common, placeId: null, latitude: input.lat, longitude: input.lng, address, title: input.name.trim(), startsAt: input.startAt, endsAt: input.endAt || undefined },
          };
    return body;
  }

  async createVueltica(input: CreateVuelticaInput) {
    const me = await this.requireUser('contribute');
    const cats = await this.categoryMap();
    const body = await this.submissionBody(input);
    const s = await this.http.post<SubmissionDto>('/me/submissions', body, { auth: 'required', reason: 'contribute' });
    const vueltica = { ...submissionToView(s, cats, { lat: input.lat, lng: input.lng }, me.displayName), lat: input.lat, lng: input.lng, address: input.address, province: input.province };
    return { vueltica, moderation: this.authorModeration(vueltica.id) };
  }

  /** `PUT /me/submissions/:id` (#57): same body as create; 409 once decided, 422 if the type changes. */
  async updateVueltica(id: string, input: CreateVuelticaInput): Promise<VuelticaView> {
    const me = await this.requireUser('contribute');
    const { kind, uuid } = parseId(id);
    if (kind !== 's') throw new ConflictError('decided');
    const cats = await this.categoryMap();
    const s = await this.http.put<SubmissionDto>(`/me/submissions/${uuid}`, await this.submissionBody(input), { auth: 'required', reason: 'contribute' });
    return { ...submissionToView(s, cats, { lat: input.lat, lng: input.lng }, me.displayName), address: input.address, province: input.province };
  }

  private cantons?: Promise<Canton[]>;

  /** `GET /provinces?include=cantons`, cached; the bundled INEC list when the API cannot be reached. */
  async listCantons(province: Province): Promise<Canton[]> {
    this.cantons ??= this.http
      .getAll<ProvinceDto>('/provinces', { include: 'cantons' }, { auth: false })
      .then((rows) => {
        return rows.flatMap((p) => (p.cantons ?? []).map((c) => ({ id: c.id, name: c.name, province: provinceOfCantonId(c.id) })));
      })
      .catch(() => {
        this.cantons = undefined;
        return [];
      });
    const list = (await this.cantons).filter((c) => c.province === province);
    return list.length ? list.sort((a, b) => a.id - b.id) : cantonsOf(province);
  }

  async myVuelticas(location: LatLng): Promise<MyVuelticaItem[]> {
    const me = await this.requireUser('contribute');
    const cats = await this.categoryMap();
    const rows = await this.http.getAll<SubmissionDto>('/me/submissions', { sort: '-createdAt' }, { auth: 'required' });
    const needed = votesNeeded(levelForPoints(me.points).number);
    return rows.map((s) => ({ vuelticaView: submissionToView(s, cats, location, me.displayName), votesFor: 0, votesAgainst: 0, votesNeeded: needed }));
  }

  async withdrawVueltica(id: string): Promise<void> {
    const { kind, uuid } = parseId(id);
    if (kind !== 's') return unsupported('withdraw-published');
    await this.http.del(`/me/submissions/${uuid}`, { auth: 'required', reason: 'contribute' });
  }

  /* ------------------------------------------------------------------ saved */

  private async favorites(): Promise<FavoriteDto[]> {
    return this.http.getAll<FavoriteDto>('/me/favorites', {}, { auth: 'required' });
  }

  private static favId(f: FavoriteDto): string | null {
    if (f.event) return makeId('e', f.event.id);
    if (f.place) return makeId('p', f.place.id);
    return null;
  }

  private async savedIds(): Promise<Set<string>> {
    if (!(await tokenStore.get())) return new Set();
    try {
      return new Set((await this.favorites()).map(HttpApi.favId).filter((x): x is string => !!x));
    } catch {
      return new Set();
    }
  }

  async saveVueltica(id: string): Promise<void> {
    const { kind, uuid } = parseId(id);
    if (kind === 's') return unsupported('favorite-pending');
    await this.http.put(`${planPath(kind, uuid)}/favorite`, undefined, { auth: 'required', reason: 'save' });
  }

  async unsaveVueltica(id: string): Promise<void> {
    const { kind, uuid } = parseId(id);
    if (kind === 's') return;
    await this.http.del(`${planPath(kind, uuid)}/favorite`, { auth: 'required', reason: 'save' });
  }

  async listSaved(location: LatLng): Promise<SavedItem[]> {
    const me = await this.requireUser('save');
    const cats = await this.categoryMap();
    const offset = (await this.getSettings()).reminderOffsetDays;
    const out: SavedItem[] = [];
    for (const f of await this.favorites()) {
      const view = f.event ? eventToView(f.event, cats, location) : f.place ? placeToView(f.place, cats, location) : null;
      // Hidden or unpublished plans would open "No encontramos este plan" (review M5): the API filters them too.
      if (!view || view.status !== 'publicada') continue;
      out.push({ vuelticaView: { ...view, saved: true }, saved: { userId: me.id, vueltica: view.id, savedAt: f.createdAt, reminderOffsetDays: offset } });
    }
    return out;
  }

  /* ----------------------------------------------- verification and reports */

  private async personHeaders(): Promise<{ headers?: Record<string, string>; signedIn: boolean }> {
    if (await tokenStore.get()) return { signedIn: true };
    return { headers: { 'X-Device-Id': await this.device() }, signedIn: false };
  }

  private async sendVerification(input: VerifyInput): Promise<VerifyResult> {
    const { kind, uuid } = parseId(input.vuelticaId);
    if (kind === 's') return unsupported('verify-pending');
    const { headers, signedIn } = await this.personHeaders();
    const body: VerifyBodyDto = {
      stillHappening: input.stillHappening,
      pricePaid: input.pricePaid,
      scheduleCorrect: input.scheduleCorrect,
      correctedTime: input.correctedTime?.trim() || undefined,
      // Guests cannot attach photos (uploads need an account).
      photo: signedIn && input.photo ? await uploadPhoto(this.http, input.photo) : undefined,
    };
    return this.http.post<VerifyDto>(`${planPath(kind, uuid)}/verifications`, body, { headers });
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    try {
      return await this.sendVerification(input);
    } catch (e) {
      if (!(e instanceof OfflineError)) throw e;
      // Same as the mock: answered offline, sent when the connection comes back.
      const q = (await this.readJson<VerifyInput[]>(KV_QUEUE)) ?? [];
      q.push(input);
      await this.store.setItem(KV_QUEUE, JSON.stringify(q));
      return { queued: true, points: 0, hidden: false };
    }
  }

  quickConfirm(vuelticaId: string): Promise<VerifyResult> {
    return this.verify({ vuelticaId, stillHappening: 'si' });
  }

  async flushQueuedVerifications(): Promise<number> {
    const q = (await this.readJson<VerifyInput[]>(KV_QUEUE)) ?? [];
    if (!q.length) return 0;
    const left: VerifyInput[] = [];
    let sent = 0;
    for (const item of q) {
      try {
        await this.sendVerification(item);
        sent++;
      } catch (e) {
        if (e instanceof OfflineError) left.push(item); // still offline: keep it; anything else (plan gone, 4xx) is dropped
      }
    }
    await this.store.setItem(KV_QUEUE, JSON.stringify(left));
    return sent;
  }

  async report(input: ReportInput): Promise<Report> {
    const { kind, uuid } = parseId(input.vuelticaId);
    if (kind === 's') return unsupported('report-pending');
    const { headers, signedIn } = await this.personHeaders();
    try {
      const r = await this.http.post<ReportDto>(
        `${planPath(kind, uuid)}/reports`,
        { reason: input.reason, details: input.details?.trim() || undefined, photo: signedIn && input.photo ? await uploadPhoto(this.http, input.photo) : undefined },
        { headers },
      );
      return reportFromApi(r);
    } catch (e) {
      if (e instanceof ConflictError) throw new DuplicateReportError();
      throw e;
    }
  }

  /* ---------------------------------------------------------------- reviews */

  async listReviews(p: ReviewListParams): Promise<ReviewList> {
    const { kind, uuid } = parseId(p.vuelticaId);
    if (kind === 's') return { summary: EMPTY_RATING, items: [] };
    const query = { sort: REVIEW_SORT[p.sort], audience: p.audience, withPhotos: p.sort === 'fotos' ? 'true' : undefined, pageSize: 100 };
    const res = await this.http.get<ReviewListDto>(`${planPath(kind, uuid)}/reviews`, { query });
    res.data.forEach((r) => this.reviews.set(r.id, r));
    return {
      summary: { avg: res.summary.averageRating ?? 0, count: res.summary.reviewCount, distribution: res.summary.distribution },
      items: res.data.map(reviewFromApi),
    };
  }

  async createReview(input: CreateReviewInput): Promise<Review> {
    await this.requireUser('review');
    const { kind, uuid } = parseId(input.vuelticaId);
    if (kind === 's') return unsupported('review-pending');
    const photos = await uploadPhotos(this.http, input.photos, MAX_PHOTOS);
    const r = await this.http.post<ReviewDto>(
      `${planPath(kind, uuid)}/reviews`,
      { rating: input.stars, comment: input.text.trim() || null, wentWith: input.wentWith, spent: input.spent, photos },
      { auth: 'required', reason: 'review' },
    );
    this.reviews.set(r.id, r);
    return reviewFromApi(r);
  }

  async updateReview(reviewId: string, input: CreateReviewInput): Promise<Review> {
    await this.requireUser('review');
    const photos = await uploadPhotos(this.http, input.photos, MAX_PHOTOS);
    const r = await this.http.put<ReviewDto>(
      `/reviews/${reviewId}`,
      { rating: input.stars, comment: input.text.trim() || null, wentWith: input.wentWith, spent: input.spent, photos },
      { auth: 'required', reason: 'review' },
    );
    this.reviews.set(r.id, r);
    return reviewFromApi(r);
  }

  async deleteReview(reviewId: string): Promise<void> {
    await this.requireUser('review');
    await this.http.del(`/reviews/${reviewId}`, { auth: 'required', reason: 'review' });
    this.reviews.delete(reviewId);
  }

  /** Toggles "útil" (the app's button is a toggle). */
  async markUseful(reviewId: string): Promise<Review> {
    const opts = { auth: 'required' as const, reason: 'useful' as const };
    const marked = this.reviews.get(reviewId)?.markedUsefulByMe ?? false;
    const r = marked
      ? await this.http.del<ReviewDto>(`/reviews/${reviewId}/useful`, opts)
      : await this.http.post<ReviewDto>(`/reviews/${reviewId}/useful`, undefined, opts);
    this.reviews.set(r.id, r);
    return reviewFromApi(r);
  }

  /* ------------------------------------------------------------- moderation */

  /** A reported plan as voters see it. Hidden plans are not readable by community moderators: fall back to the queue item. */
  private async reportedView(r: ReportQueueItemDto, cats: Map<number, string>, loc: LatLng): Promise<VuelticaView> {
    const kind = r.type === 'PLACE' ? 'p' : 'e';
    const uuid = (r.type === 'PLACE' ? r.placeId : r.eventId) ?? '';
    try {
      const dto = await this.http.get<PlaceDetailDto | EventDetailDto>(planPath(kind, uuid));
      const view = kind === 'p' ? placeToView(dto as PlaceDetailDto, cats, loc) : eventToView(dto as EventDetailDto, cats, loc);
      if (view) return view;
    } catch {
      /* fall back below */
    }
    return {
      id: makeId(kind, uuid), type: kind === 'p' ? 'lugar' : 'evento', name: r.title, category: '', description: '', photos: [], lat: loc.lat, lng: loc.lng,
      address: '', province: this.user?.province ?? 'San José', priceTier: 'hasta5000', pricePerPerson: 5000, freeFor: [], audiences: ['todo'], wheelchair: false,
      status: r.status === 'ARCHIVED' ? 'oculta' : 'publicada', authorId: null, authorName: t.common.community, createdAt: r.firstReportAt, verificationCount: 0,
      ratingAvg: 0, ratingCount: 0, hiddenReason: r.hiddenReason ?? undefined, reportedAt: r.reportedAt ?? undefined, distanceKm: 0,
    };
  }

  /** `GET /moderation/queue` (#43): level 3+ (403 below), the caller's own items left out. */
  async moderationQueue(location: LatLng): Promise<ModerationQueue> {
    await this.requireUser('moderate');
    const cats = await this.categoryMap();
    const q = await this.http.get<ModerationQueueDto>('/moderation/queue', { auth: 'required', reason: 'moderate' });
    const nuevas: QueueEntry[] = q.nuevas.map((n) => {
      const vuelticaView = submissionToView(n.submission, cats, location);
      return { ...moderationFromTally(vuelticaView.id, 'nueva', n), vuelticaView };
    });
    const reportadas: QueueEntry[] = await Promise.all(
      q.reportadas.map(async (r) => {
        const vuelticaView = await this.reportedView(r.report, cats, location);
        return {
          ...moderationFromTally(vuelticaView.id, 'reportada', r, {
            reportCount: r.report.reportCount,
            topReason: r.report.topReason ?? undefined,
            lastReportAt: r.report.lastReportAt,
          }),
          vuelticaView,
        };
      }),
    );
    for (const item of [...nuevas, ...reportadas]) this.queued.set(item.vuelticaId, item);
    return { nuevas, reportadas, total: q.total };
  }

  async moderationCount(): Promise<number> {
    if (!(await this.mayModerate())) return 0;
    try {
      return (await this.http.get<ModerationQueueDto>('/moderation/queue', { auth: 'required' })).total;
    } catch (e) {
      if (e instanceof ForbiddenError) return 0;
      throw e;
    }
  }

  private votePath(vuelticaId: string): string {
    const { kind, uuid } = parseId(vuelticaId);
    return kind === 's' ? `/moderation/submissions/${uuid}/vote` : kind === 'p' ? `/moderation/places/${uuid}/vote` : `/moderation/events/${uuid}/vote`;
  }

  private afterVote(vuelticaId: string, res: ModerationVoteDto): ModerationItem {
    const prev = this.queued.get(vuelticaId);
    const item = moderationFromTally(vuelticaId, res.kind, res, prev ? { reportCount: prev.reportCount, topReason: prev.topReason, lastReportAt: prev.lastReportAt } : {});
    if (prev) this.queued.set(vuelticaId, { ...prev, ...item });
    return item;
  }

  /** "Aprobar" / "Ocultar vueltica" = `for`, "Rechazar" / "Sigue igual" = `against`. Changing the choice is another POST. */
  async vote({ vuelticaId, choice }: { vuelticaId: string; choice: 'for' | 'against' }): Promise<ModerationItem> {
    const res = await this.http.post<ModerationVoteDto>(this.votePath(vuelticaId), { choice }, { auth: 'required', reason: 'moderate' });
    return this.afterVote(vuelticaId, res);
  }

  /** Only while the item is undecided: 409 (`ConflictError`) once the vote published / rejected / hid it. */
  async undoVote(vuelticaId: string): Promise<ModerationItem> {
    const res = await this.http.del<ModerationVoteDto>(this.votePath(vuelticaId), { auth: 'required', reason: 'moderate' });
    return this.afterVote(vuelticaId, res);
  }

  /** Team roles: `POST /submissions/:id/approve` or `/reject { reason, note }` (#40 codes). */
  async decideSubmission(input: DecideInput): Promise<void> {
    await this.requireUser('moderate');
    if (!this.privileged()) throw new ForbiddenError('team');
    const { kind, uuid } = parseId(input.vuelticaId);
    if (kind !== 's') throw new ConflictError('decided');
    if (input.decision === 'approve') {
      await this.http.post(`/submissions/${uuid}/approve`, {}, { auth: 'required', reason: 'moderate' });
    } else {
      const reason = input.reason ?? 'otro';
      if (reason === 'otro' && !input.note?.trim()) throw new ValidationError('note', t.moderation.decide.needNote);
      await this.http.post(`/submissions/${uuid}/reject`, { reason, note: input.note?.trim() || undefined }, { auth: 'required', reason: 'moderate' });
    }
    this.queued.delete(input.vuelticaId);
  }

  /* ----------------------------------------------------------------- blocks */

  /** `POST /places|events|reviews/:id/author/block` (API issue: block users, guideline 1.2). 204, idempotent. */
  async blockAuthor(target: { kind: 'vueltica' | 'review'; id: string }): Promise<void> {
    await this.requireUser('block');
    let path: string;
    if (target.kind === 'review') path = `/reviews/${target.id}/author/block`;
    else {
      const { kind, uuid } = parseId(target.id);
      if (kind === 's') throw new NotFoundError();
      path = `${planPath(kind, uuid)}/author/block`;
    }
    await this.http.post(path, undefined, { auth: 'required', reason: 'block' });
  }

  async listBlocks(): Promise<BlockedUser[]> {
    await this.requireUser('block');
    const rows = await this.http.getAll<BlockDto>('/me/blocks', {}, { auth: 'required', reason: 'block' });
    return rows.map((b) => ({ id: b.id, name: b.name, blockedAt: b.createdAt }));
  }

  async unblock(blockId: string): Promise<void> {
    await this.requireUser('block');
    await this.http.del(`/me/blocks/${blockId}`, { auth: 'required', reason: 'block' });
  }

  /** `GET /me/reputation` (#42). Before it is deployed: the points from `/me` (0 when the API has none). */
  async reputationSummary() {
    const me = await this.requireUser('moderate');
    try {
      return reputationFromApi(await this.http.get<ReputationDto>('/me/reputation', { auth: 'required' }), me.id, this.role);
    } catch (e) {
      if (!(e instanceof NotFoundError)) throw e;
      return { ...reputationFor(me.points, []), canModerate: this.privileged() || undefined, team: this.privileged() || undefined };
    }
  }

  /* ---------------------------------------------------------------- account */

  private async requireUser(reason: AuthRequiredError['reason']): Promise<User> {
    const u = this.user ?? (await this.currentUser());
    if (!u) throw new AuthRequiredError(reason);
    return u;
  }

  private async loadUser(dto: MyProfileDto, provider: SignInProvider): Promise<User> {
    const settings = await this.getSettings();
    const cached = await this.readJson<CachedUser>(KV_USER);
    const prev = cached?.user.id === dto.id ? cached.user : null;
    this.dto = dto;
    this.user = userFromApi(dto, provider, {
      province: settings.province ?? prev?.province ?? 'San José',
      memberSince: prev?.memberSince ?? clockNow().toISOString(),
      counts: prev?.counts,
    });
    await this.store.setItem(KV_USER, JSON.stringify({ user: this.user, dto } satisfies CachedUser));
    // The API has no province yet but the user picked one on this device: send it (#42).
    if (dto.province === null && settings.province) void this.pushProvince(settings.province);
    return this.user;
  }

  /** `PUT /me` is a full replace of name / surnames / ageRange; `provinceId` (#42) is the default map region. */
  private async pushProvince(province: Province | null): Promise<void> {
    const dto = this.dto;
    if (!dto || !(await tokenStore.get())) return;
    try {
      const res = await this.http.put<UserDto>(
        '/me',
        { name: dto.name, surnames: dto.surnames, ageRange: dto.ageRange, provinceId: province ? provinceIdOf(province) : null },
        { auth: 'required' },
      );
      this.dto = { ...dto, ...res };
      if (this.user && province) this.user = { ...this.user, province };
    } catch {
      /* offline or an older API: the province stays local */
    }
  }

  async signIn(input: { provider: SignInProvider; privacyVersion?: string }): Promise<User> {
    let auth: AuthDto;
    const privacyVersion = input.privacyVersion;
    if (input.provider === 'apple') {
      const a = await appleSignIn();
      auth = await this.http.post<AuthDto>('/auth/apple', { identityToken: a.identityToken, firstName: a.firstName, lastName: a.lastName, privacyVersion }, { auth: false });
    } else {
      auth = await this.http.post<AuthDto>('/auth/google', { token: await googleSignIn(), privacyVersion }, { auth: false });
    }
    await tokenStore.set(auth.token);
    await tokenStore.setProvider(input.provider);
    // The login answer has no `counts`; `/me` does.
    const profile = await this.http.get<MyProfileDto>('/me', { auth: 'required' }).catch(() => auth.user);
    return this.loadUser(profile, input.provider);
  }

  async acceptPrivacy(version: string): Promise<User> {
    await this.requireUser('save');
    const provider = ((await tokenStore.getProvider()) as SignInProvider | null) ?? this.user?.provider ?? 'google';
    const profile = await this.http.post<MyProfileDto>('/me/privacy-consent', { version }, { auth: 'required' });
    // The answer may be the profile or just `{ privacyVersion }`: read /me when it is not a profile.
    const me = profile && 'id' in profile ? profile : await this.http.get<MyProfileDto>('/me', { auth: 'required' });
    return this.loadUser({ ...me, privacyAccepted: true, privacyVersion: me.privacyVersion ?? version }, provider);
  }

  async signOut(): Promise<void> {
    if (await tokenStore.get()) {
      try {
        await this.http.post('/auth/logout', undefined, { auth: 'required' });
      } catch {
        /* the token is dropped locally either way */
      }
    }
    await this.clearLocalSession();
  }

  /** Drops the token and everything cached for the user (also used when the API answers 401). */
  async clearLocalSession(): Promise<void> {
    await tokenStore.clear();
    await googleSignOut();
    this.user = null;
    this.dto = null;
    this.queued.clear();
    this.reviews.clear();
    await this.store.removeItem(KV_USER);
  }

  async currentUser(): Promise<User | null> {
    if (!(await tokenStore.get())) return null;
    const provider = ((await tokenStore.getProvider()) as SignInProvider | null) ?? 'google';
    try {
      const dto = await this.http.get<MyProfileDto>('/me', { auth: 'required' });
      return await this.loadUser(dto, provider);
    } catch (e) {
      if (e instanceof AuthRequiredError) return null;
      const cached = await this.readJson<CachedUser>(KV_USER);
      if (cached?.dto) {
        // Offline (or the API is down): keep the user signed in with what we saw last.
        this.user = cached.user;
        this.dto = cached.dto;
        return cached.user;
      }
      throw e;
    }
  }

  async getSettings(): Promise<Settings> {
    return { ...defaultSettings(), ...((await this.readJson<Partial<Settings>>(KV_SETTINGS)) ?? {}) };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const prev = await this.getSettings();
    const next = { ...prev, ...patch };
    await this.store.setItem(KV_SETTINGS, JSON.stringify(next));
    if ('province' in patch && patch.province !== undefined && patch.province !== prev.province && this.user) await this.pushProvince(patch.province);
    return next;
  }

  async exportMyData(): Promise<ExportedData> {
    const me = await this.requireUser('save');
    const opt = <T,>(p: Promise<T>) => p.catch(() => null);
    const [profile, favorites, submissions, reviews, reputation] = await Promise.all([
      this.http.get<unknown>('/me', { auth: 'required' }),
      this.favorites(),
      this.http.getAll<SubmissionDto>('/me/submissions', {}, { auth: 'required' }),
      opt(this.http.getAll<ReviewDto>('/me/reviews', {}, { auth: 'required' })),
      opt(this.http.get<ReputationDto>('/me/reputation', { auth: 'required' })),
    ]);
    const data = { exportedAt: clockNow().toISOString(), user: me, profile, settings: await this.getSettings(), favorites, submissions, reviews, reputation };
    return { filename: 'mivueltica-mis-datos.json', mimeType: 'application/json', content: JSON.stringify(data, null, 2) };
  }

  async deleteAccount(): Promise<void> {
    await this.requireUser('save');
    // App Review 5.1.1(v): Apple users must have their Apple token revoked, which needs a fresh authorization code.
    const appleAuthCode = (await tokenStore.getProvider()) === 'apple' ? await appleAuthorizationCode() : undefined;
    await this.http.post('/me', appleAuthCode ? { appleAuthCode } : undefined, { auth: 'required' });
    await this.clearLocalSession();
    await this.store.removeItem(KV_RECENT);
  }

  /** Local reminders for saved events (#37 made events saveable); push delivery is still #44. */
  async scheduleNotifications(): Promise<ScheduledReminder[]> {
    if (!(await tokenStore.get())) return [];
    const settings = await this.getSettings();
    if (!settings.notifyReminders) return [];
    const now = clockNow();
    const out: ScheduledReminder[] = [];
    let favs: FavoriteDto[];
    try {
      favs = await this.http.getAll<FavoriteDto>('/me/favorites', { type: 'EVENT' }, { auth: 'required' });
    } catch {
      return [];
    }
    for (const f of favs) {
      if (!f.event) continue;
      const start = new Date(f.event.startsAt);
      const fire = new Date(start);
      fire.setDate(fire.getDate() - settings.reminderOffsetDays);
      fire.setHours(9, 0, 0, 0);
      if (fire.getTime() <= now.getTime()) continue;
      const h = start.getHours();
      const label = `${h % 12 === 0 ? 12 : h % 12}:${String(start.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
      const id = makeId('e', f.event.id);
      out.push({ id: `rem-${id}`, vuelticaId: id, title: f.event.title, body: t.notifications.eventTomorrow(f.event.title, label), fireAt: fire.toISOString() });
    }
    return out;
  }

  async simulateCommunity(_input: SimulateInput): Promise<void> {}
}

