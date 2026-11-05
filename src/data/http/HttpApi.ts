import { applyFilters, dateRange, sortVuelticas, summarize } from '@/domain/filters';
import { haversineKm } from '@/domain/geo';
import { reputationFor } from '@/domain/rules';
import type {
  Filters, LatLng, ModerationItem, Report, Review, Settings, SignInProvider, User, VuelticaView,
} from '@/domain/types';
import { now as clockNow } from '@/lib/clock';
import { LEVELS } from '@/config/levels';
import { t } from '@/i18n/es-CR';
import {
  AuthRequiredError, NotFoundError, NotSupportedError, ValidationError,
  type CreateReviewInput, type CreateVuelticaInput, type ExportedData, type ListParams, type ListResult, type MiVuelticaApi,
  type ModerationQueue, type MyVuelticaItem, type ReportInput, type ReviewList, type ReviewListParams, type SavedItem,
  type ScheduledReminder, type SimulateInput, type VerifyInput, type VerifyResult, type VuelticaDetail,
} from '../api';
import { defaultSettings } from '../mock/seed';
import type { KeyValueStore } from '../storage/types';
import type { HttpClient } from './client';
import type { AuthDto, CategoryDto, EventDetailDto, EventDto, FavoriteDto, PlaceDetailDto, PlaceDto, SubmissionDto, UserDto } from './dto';
import {
  audienceToApi, defaultCantonOf, eventToView, makeId, parseId, placeToView, submissionToView, userFromApi, type EventPlace,
} from './mappers';
import { appleAuthorizationCode, appleSignIn, googleSignIn, googleSignOut } from './socialAuth';
import { tokenStore } from './tokenStore';
import { Platform } from 'react-native';

const KV_USER = 'mv.api.user';
const KV_SETTINGS = 'mv.api.settings';
const KV_RECENT = 'mv.api.recent';
const KV_SINCE = 'mv.api.memberSince';
const RECENT_MAX = 20;
const EMPTY_RATING = { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] };

const unsupported = (feature: string): never => {
  throw new NotSupportedError(feature);
};

/**
 * `MiVuelticaApi` over mi-vueltica-api. The app's contract is the source of truth: whatever the API cannot do yet
 * either degrades to an empty/neutral value (reads) or throws `NotSupportedError` (writes). Every such gap is listed
 * in docs/API_INTEGRATION.md with the issue filed on the API repository.
 */
export class HttpApi implements MiVuelticaApi {
  readonly signInProviders: SignInProvider[] = Platform.OS === 'ios' ? ['apple', 'google'] : Platform.OS === 'android' ? ['google'] : [];

  private categories?: Promise<Map<number, string>>;
  private places = new Map<string, EventPlace | null>();
  private user: User | null = null;
  private role: UserDto['role'] = 'USER';

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

  private async placeFor(placeId: string): Promise<EventPlace | null> {
    if (this.places.has(placeId)) return this.places.get(placeId) ?? null;
    try {
      const p = await this.http.get<PlaceDto>(`/places/${placeId}`);
      const place: EventPlace = { id: p.id, cantonId: p.cantonId, latitude: p.latitude, longitude: p.longitude, address: p.address, name: p.name };
      this.places.set(placeId, place);
      return place;
    } catch (e) {
      if (e instanceof NotFoundError) {
        this.places.set(placeId, null);
        return null;
      }
      throw e;
    }
  }

  private async isPrivileged(): Promise<boolean> {
    if (!(await tokenStore.get())) return false;
    if (!this.user) await this.currentUser();
    return this.role === 'MODERATOR' || this.role === 'ADMIN';
  }

  private async readJson<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.store.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private async remember(v: VuelticaView) {
    const list = ((await this.readJson<VuelticaView[]>(KV_RECENT)) ?? []).filter((x) => x.id !== v.id);
    list.unshift({ ...v, distanceKm: 0 });
    await this.store.setItem(KV_RECENT, JSON.stringify(list.slice(0, RECENT_MAX)));
  }

  /* ------------------------------------------------------------------ lists */

  private async fetchPlaces(f: Filters, loc: LatLng, cats: Map<number, string>): Promise<VuelticaView[]> {
    const near = f.nearMe ? { lat: loc.lat, lng: loc.lng, radiusKm: Math.max(0.1, f.distanceKm) } : {};
    const rows = await this.http.getAll<PlaceDto>('/places', { ...near, q: f.text.trim() || undefined, sort: 'name' });
    return rows.map((p) => placeToView(p, cats, loc));
  }

  private async fetchEvents(f: Filters, loc: LatLng, cats: Map<number, string>, now: Date): Promise<VuelticaView[]> {
    const range = dateRange(f.date, now);
    const rows = await this.http.getAll<EventDto>('/events', {
      from: range?.from.toISOString(),
      to: range?.to.toISOString(),
      q: f.text.trim() || undefined,
    });
    const ids = [...new Set(rows.map((e) => e.placeId).filter((x): x is string => !!x))];
    await Promise.all(ids.map((id) => this.placeFor(id))); // N+1 until GET /events embeds the place (see API_INTEGRATION.md)
    return rows
      .map((e) => eventToView(e, e.placeId ? (this.places.get(e.placeId) ?? null) : null, cats, loc))
      .filter((v): v is VuelticaView => !!v);
  }

  private async pendingPins(loc: LatLng, cats: Map<number, string>): Promise<ListResult['pending']> {
    if (!(await tokenStore.get())) return [];
    const out: ListResult['pending'] = [];
    const seen = new Set<string>();
    const add = (rows: SubmissionDto[], mine: boolean) => {
      for (const s of rows) {
        if (seen.has(s.id)) continue;
        seen.add(s.id);
        out.push({ ...submissionToView(s, cats, loc), mine });
      }
    };
    try {
      add(await this.http.getAll<SubmissionDto>('/me/submissions', { status: 'PENDING' }, { auth: 'required' }, 1), true);
      if (await this.isPrivileged()) add(await this.http.getAll<SubmissionDto>('/submissions', { status: 'PENDING' }, {}, 1), false);
    } catch {
      /* pins for pending plans are a nicety; never fail the list because of them */
    }
    return out;
  }

  async listVuelticas({ filters, location, sort = 'cercanos', maxPrice }: ListParams): Promise<ListResult> {
    const now = clockNow();
    const cats = await this.categoryMap();
    const [places, events, pending] = await Promise.all([
      filters.types.includes('lugar') ? this.fetchPlaces(filters, location, cats) : [],
      filters.types.includes('evento') ? this.fetchEvents(filters, location, cats, now) : [],
      this.pendingPins(location, cats),
    ]);
    const saved = await this.savedIds();
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

  async getVueltica(id: string, location: LatLng): Promise<VuelticaDetail> {
    const { kind, uuid } = parseId(id);
    const cats = await this.categoryMap();
    const base = { rating: EMPTY_RATING, reviewsPreview: [] as Review[] };

    if (kind === 'p') {
      const p = await this.http.get<PlaceDetailDto>(`/places/${uuid}`);
      const view = placeToView(p, cats, location);
      void this.remember(view);
      return {
        ...base,
        vuelticaView: view,
        saved: !!p.isFavorite,
        rating: { avg: p.averageRating ?? 0, count: p.reviewCount, distribution: [0, 0, 0, 0, 0] },
        verification: { lastVerifiedAt: p.verifiedAt ?? undefined, count: 0, myVerifiedToday: false },
        community: { authorName: view.authorName, verifiedBy: 0, updatedAt: p.verifiedAt ?? p.updatedAt },
        mine: false,
      };
    }

    if (kind === 'e') {
      const e = await this.http.get<EventDetailDto>(`/events/${uuid}`);
      const view = eventToView(e, e.place ? { ...e.place } : null, cats, location);
      if (!view) throw new NotFoundError();
      void this.remember(view);
      return {
        ...base,
        vuelticaView: view,
        saved: false,
        verification: { count: 0, myVerifiedToday: false },
        community: { authorName: view.authorName, verifiedBy: 0, updatedAt: e.updatedAt },
        mine: false,
      };
    }

    // Submission (a plan that is not published yet): the author's, or any pending one for moderators.
    let s: SubmissionDto;
    try {
      s = await this.http.get<SubmissionDto>(`/me/submissions/${uuid}`, { auth: 'required' });
    } catch (err) {
      if (!(err instanceof NotFoundError) || !(await this.isPrivileged())) throw err;
      s = await this.http.get<SubmissionDto>(`/submissions/${uuid}`);
    }
    const me = this.user;
    const view = submissionToView(s, cats, location, me && s.userId === me.id ? me.displayName : undefined);
    return {
      ...base,
      vuelticaView: view,
      saved: false,
      verification: { count: 0, myVerifiedToday: false },
      community: { authorName: view.authorName, verifiedBy: 0, updatedAt: s.reviewedAt ?? s.createdAt },
      mine: !!me && s.userId === me.id,
      moderation: s.status === 'PENDING' ? this.moderationItem(view.id) : undefined,
    };
  }

  async recentlyViewed(location: LatLng): Promise<VuelticaView[]> {
    const list = (await this.readJson<VuelticaView[]>(KV_RECENT)) ?? [];
    return list.map((v) => ({ ...v, distanceKm: haversineKm(location, v) }));
  }

  /* ---------------------------------------------------------- contributions */

  private moderationItem(vuelticaId: string, votesFor = 0, votesAgainst = 0): ModerationItem {
    // The API has a single moderator decision, not community votes: one approval publishes.
    return { vuelticaId, kind: 'nueva', votesFor, votesAgainst, votesNeeded: 1 };
  }

  async createVueltica(input: CreateVuelticaInput) {
    const me = await this.requireUser('contribute');
    const [categoryId, cats] = [await this.categoryId(input.category), await this.categoryMap()];
    const common = {
      categoryId,
      description: input.description.trim().slice(0, 5000) || undefined,
      targetAudience: audienceToApi(input.audiences),
    };
    // Price, free-for, wheelchair and photos have no field in the API yet (docs/API_INTEGRATION.md).
    const body =
      input.type === 'lugar'
        ? {
            type: 'PLACE',
            data: {
              ...common,
              cantonId: defaultCantonOf(input.province),
              name: input.name.trim(),
              latitude: input.lat,
              longitude: input.lng,
              address: input.address.trim().slice(0, 191) || undefined,
            },
          }
        : {
            type: 'EVENT',
            data: { ...common, placeId: null, title: input.name.trim(), startsAt: input.startAt, endsAt: input.endAt || undefined },
          };
    const s = await this.http.post<SubmissionDto>('/me/submissions', body, { auth: 'required', reason: 'contribute' });
    const vueltica = { ...submissionToView(s, cats, { lat: input.lat, lng: input.lng }, me.displayName), lat: input.lat, lng: input.lng, address: input.address };
    return { vueltica, moderation: this.moderationItem(vueltica.id) };
  }

  async myVuelticas(location: LatLng): Promise<MyVuelticaItem[]> {
    const me = await this.requireUser('contribute');
    const cats = await this.categoryMap();
    const rows = await this.http.getAll<SubmissionDto>('/me/submissions', { sort: '-createdAt' }, { auth: 'required' });
    return rows.map((s) => ({ vuelticaView: submissionToView(s, cats, location, me.displayName), votesFor: s.status === 'PUBLISHED' ? 1 : 0, votesAgainst: s.status === 'REJECTED' ? 1 : 0, votesNeeded: 1 }));
  }

  async withdrawVueltica(id: string): Promise<void> {
    const { kind, uuid } = parseId(id);
    if (kind !== 's') return unsupported('withdraw-published');
    await this.http.del(`/me/submissions/${uuid}`, { auth: 'required', reason: 'contribute' });
  }

  /* ------------------------------------------------------------------ saved */

  private async savedIds(): Promise<Set<string>> {
    if (!(await tokenStore.get())) return new Set();
    try {
      const favs = await this.http.getAll<FavoriteDto>('/me/favorites', {}, { auth: 'required' });
      return new Set(favs.map((f) => makeId('p', f.place.id)));
    } catch {
      return new Set();
    }
  }

  async saveVueltica(id: string): Promise<void> {
    const { kind, uuid } = parseId(id);
    if (kind !== 'p') return unsupported('favorite-events');
    await this.http.put(`/places/${uuid}/favorite`, undefined, { auth: 'required', reason: 'save' });
  }

  async unsaveVueltica(id: string): Promise<void> {
    const { kind, uuid } = parseId(id);
    if (kind !== 'p') return unsupported('favorite-events');
    await this.http.del(`/places/${uuid}/favorite`, { auth: 'required', reason: 'save' });
  }

  async listSaved(location: LatLng): Promise<SavedItem[]> {
    const me = await this.requireUser('save');
    const cats = await this.categoryMap();
    const offset = (await this.getSettings()).reminderOffsetDays;
    const favs = await this.http.getAll<FavoriteDto>('/me/favorites', {}, { auth: 'required' });
    return favs.map((f) => ({
      vuelticaView: { ...placeToView(f.place, cats, location), saved: true },
      saved: { userId: me.id, vueltica: makeId('p', f.place.id), savedAt: f.createdAt, reminderOffsetDays: offset },
    }));
  }

  /* ---------------------------------------- verification, reports, reviews */
  // Not in the API yet. Reads degrade to "nothing yet"; writes say so.

  async verify(_input: VerifyInput): Promise<VerifyResult> {
    return unsupported('verifications');
  }
  async quickConfirm(_vuelticaId: string): Promise<VerifyResult> {
    return unsupported('verifications');
  }
  async flushQueuedVerifications(): Promise<number> {
    return 0;
  }
  async report(_input: ReportInput): Promise<Report> {
    return unsupported('reports');
  }
  async listReviews(_p: ReviewListParams): Promise<ReviewList> {
    return { summary: EMPTY_RATING, items: [] };
  }
  async createReview(_input: CreateReviewInput): Promise<Review> {
    return unsupported('reviews');
  }
  async markUseful(_reviewId: string): Promise<Review> {
    return unsupported('reviews');
  }

  /* ------------------------------------------------------------- moderation */

  async moderationQueue(location: LatLng): Promise<ModerationQueue> {
    if (!(await this.isPrivileged())) return { nuevas: [], reportadas: [], total: 0 };
    const cats = await this.categoryMap();
    const rows = await this.http.getAll<SubmissionDto>('/submissions', { status: 'PENDING', sort: 'createdAt' });
    const nuevas = rows.map((s) => {
      const vuelticaView = submissionToView(s, cats, location);
      return { ...this.moderationItem(vuelticaView.id), vuelticaView };
    });
    return { nuevas, reportadas: [], total: nuevas.length };
  }

  async moderationCount(): Promise<number> {
    if (!(await this.isPrivileged())) return 0;
    const res = await this.http.get<{ total: number }>('/submissions', { query: { status: 'PENDING', pageSize: 1 } });
    return res.total;
  }

  /** "Aprobar" publishes, "Rechazar" rejects (the API wants a reason; the app has no picker yet). */
  async vote({ vuelticaId, choice }: { vuelticaId: string; choice: 'for' | 'against' }): Promise<ModerationItem> {
    const { kind, uuid } = parseId(vuelticaId);
    if (kind !== 's') return unsupported('moderate-published');
    if (choice === 'for') await this.http.post(`/submissions/${uuid}/approve`, undefined, { auth: 'required', reason: 'moderate' });
    else await this.http.post(`/submissions/${uuid}/reject`, { reason: t.moderation.defaultRejectReason }, { auth: 'required', reason: 'moderate' });
    return { ...this.moderationItem(vuelticaId, choice === 'for' ? 1 : 0, choice === 'against' ? 1 : 0), myVote: choice };
  }

  async undoVote(_vuelticaId: string): Promise<ModerationItem> {
    return unsupported('undo-moderation');
  }

  async reputationSummary() {
    await this.requireUser('moderate');
    // No reputation in the API: moderators/admins get the level that unlocks the moderation entry, everyone else level 1.
    const points = this.role === 'USER' ? 0 : LEVELS[2].threshold;
    const summary = reputationFor(points, []);
    return { ...summary, recent: summary.recent };
  }

  /* ---------------------------------------------------------------- account */

  private async requireUser(reason: AuthRequiredError['reason']): Promise<User> {
    const u = this.user ?? (await this.currentUser());
    if (!u) throw new AuthRequiredError(reason);
    return u;
  }

  private async loadUser(dto: UserDto, provider: SignInProvider): Promise<User> {
    const settings = await this.getSettings();
    const since = (await this.readJson<Record<string, string>>(KV_SINCE)) ?? {};
    if (!since[dto.id]) {
      since[dto.id] = clockNow().toISOString(); // the API does not expose createdAt yet
      await this.store.setItem(KV_SINCE, JSON.stringify(since));
    }
    this.role = dto.role;
    this.user = userFromApi(dto, provider, settings.province ?? 'San José', since[dto.id]);
    await this.store.setItem(KV_USER, JSON.stringify({ user: this.user, role: dto.role }));
    return this.user;
  }

  async signIn(input: { provider: SignInProvider; email?: string }): Promise<User> {
    let auth: AuthDto;
    if (input.provider === 'apple') {
      const a = await appleSignIn();
      auth = await this.http.post<AuthDto>('/auth/apple', { identityToken: a.identityToken, firstName: a.firstName, lastName: a.lastName }, { auth: false });
    } else if (input.provider === 'google') {
      auth = await this.http.post<AuthDto>('/auth/google', { token: await googleSignIn() }, { auth: false });
    } else {
      return unsupported('email-login');
    }
    await tokenStore.set(auth.token);
    await tokenStore.setProvider(input.provider);
    return this.loadUser(auth.user, input.provider);
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
    this.role = 'USER';
    await this.store.removeItem(KV_USER);
  }

  async currentUser(): Promise<User | null> {
    if (!(await tokenStore.get())) return null;
    const provider = ((await tokenStore.getProvider()) as SignInProvider | null) ?? 'google';
    try {
      const dto = await this.http.get<UserDto>('/me', { auth: 'required' });
      return await this.loadUser(dto, provider);
    } catch (e) {
      if (e instanceof AuthRequiredError) return null;
      const cached = await this.readJson<{ user: User; role: UserDto['role'] }>(KV_USER);
      if (cached) {
        // Offline (or the API is down): keep the user signed in with what we saw last.
        this.user = cached.user;
        this.role = cached.role;
        return cached.user;
      }
      throw e;
    }
  }

  async getSettings(): Promise<Settings> {
    return { ...defaultSettings(), ...((await this.readJson<Partial<Settings>>(KV_SETTINGS)) ?? {}) };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const next = { ...(await this.getSettings()), ...patch };
    await this.store.setItem(KV_SETTINGS, JSON.stringify(next));
    return next;
  }

  async exportMyData(): Promise<ExportedData> {
    const me = await this.requireUser('save');
    const [profile, favorites, submissions] = await Promise.all([
      this.http.get<unknown>('/me', { auth: 'required' }),
      this.http.getAll<FavoriteDto>('/me/favorites', {}, { auth: 'required' }),
      this.http.getAll<SubmissionDto>('/me/submissions', {}, { auth: 'required' }),
    ]);
    const data = { exportedAt: clockNow().toISOString(), user: me, profile, settings: await this.getSettings(), favorites, submissions };
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

  async scheduleNotifications(): Promise<ScheduledReminder[]> {
    return []; // only places can be saved today and they have no date: nothing to remind about
  }

  async simulateCommunity(_input: SimulateInput): Promise<void> {}
}
