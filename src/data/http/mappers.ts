import { haversineKm, PROVINCE_CENTERS } from '@/domain/geo';
import { levelByNumber, tierForPrice, tierMaxPrice } from '@/domain/rules';
import type {
  Audience, LatLng, ModerationItem, Province, Report, ReputationEvent, ReputationKind, ReputationSummary, Review, User, VuelticaStatus, VuelticaView,
} from '@/domain/types';
import { formatTime, initialsOf } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import type {
  ContentStatus, EventDetailDto, EventDto, ModerationTallyDto, MyProfileDto, OpeningHoursDto, PlaceDetailDto, PlaceDto, PlanConditionsDto, ReportDto,
  ReputationDto, ReviewDto, SubmissionDto, TargetAudience, UserDto,
} from './dto';

/* Ids: the app has a single id space for places and events, the API has two (and a third for submissions). */
export type IdKind = 'p' | 'e' | 's';
export const makeId = (kind: IdKind, uuid: string) => `${kind}-${uuid}`;
export function parseId(id: string): { kind: IdKind; uuid: string } {
  const m = /^([pes])-(.+)$/.exec(id);
  if (!m) return { kind: 'p', uuid: id };
  return { kind: m[1] as IdKind, uuid: m[2] };
}

/** INEC province code = first digit of the canton id (101 = San José … 701 = Limón). Same order as the API's province ids. */
export const PROVINCES: Province[] = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];
export const provinceOfCanton = (cantonId: number): Province => PROVINCES[Math.floor(cantonId / 100) - 1] ?? 'San José';
export const provinceById = (id: number | null | undefined): Province | null => (id ? (PROVINCES[id - 1] ?? null) : null);
export const provinceIdOf = (p: Province): number => PROVINCES.indexOf(p) + 1;
/** Interim: the form only collects a province, so submissions use that province's central canton (x01). */
export const defaultCantonOf = (province: Province): number => provinceIdOf(province) * 100 + 1;
/** Events with their own location have no canton: take the province whose center is closest. */
export function nearestProvince(p: LatLng): Province {
  let best: Province = 'San José';
  let bestKm = Infinity;
  for (const name of PROVINCES) {
    const km = haversineKm(p, PROVINCE_CENTERS[name]);
    if (km < bestKm) {
      best = name;
      bestKm = km;
    }
  }
  return best;
}

export const statusFromApi = (s: ContentStatus): VuelticaStatus =>
  s === 'PUBLISHED' ? 'publicada' : s === 'REJECTED' ? 'rechazada' : s === 'ARCHIVED' ? 'oculta' : 'pendiente';

/** Legacy single audience: only used when the API (or an old row) has no `audiences`. */
export function audiencesFromApi(a: TargetAudience): Audience[] {
  switch (a) {
    case 'CHILDREN': return ['familias'];
    case 'SENIORS': return ['ciudadanosOro'];
    default: return ['todo'];
  }
}
export function audienceToApi(audiences: Audience[]): TargetAudience {
  if (audiences.includes('ciudadanosOro')) return 'SENIORS';
  if (audiences.includes('familias')) return 'CHILDREN';
  return 'EVERYONE';
}

/** Price, free-for, audiences and accessibility (#36). An unknown price is shown as the "hasta ₡5.000" tier. */
function conditionsFromApi(c: PlanConditionsDto, legacy: TargetAudience) {
  const price = c.pricePerPerson ?? null;
  const priceTier = c.priceTier ?? (price !== null ? tierForPrice(price) : null) ?? 'hasta5000';
  return {
    priceTier,
    pricePerPerson: price ?? tierMaxPrice(priceTier),
    freeFor: c.freeFor ?? [],
    audiences: c.audiences?.length ? c.audiences : audiencesFromApi(legacy),
    wheelchair: c.wheelchair ?? false,
  };
}

const DAYS: [keyof OpeningHoursDto, string][] = [
  ['monday', 'Lun'], ['tuesday', 'Mar'], ['wednesday', 'Mié'], ['thursday', 'Jue'], ['friday', 'Vie'], ['saturday', 'Sáb'], ['sunday', 'Dom'],
];
const fmtHM = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return formatTime(new Date(2000, 0, 1, h, m));
};

/** `{ monday: [{open:"09:00",close:"17:00"}], … }` → "Lun–Vie · 9:00 a.m.–5:00 p.m." (consecutive days with the same hours are grouped). */
export function formatOpeningHours(oh: OpeningHoursDto | null): string | undefined {
  if (!oh) return undefined;
  const groups: { from: string; to: string; hours: string }[] = [];
  for (const [key, label] of DAYS) {
    const ranges = oh[key];
    if (!ranges?.length) continue;
    const hours = ranges.map((r) => `${fmtHM(r.open)}–${fmtHM(r.close)}`).join(', ');
    const last = groups[groups.length - 1];
    const prevLabel = DAYS[DAYS.findIndex(([, l]) => l === label) - 1]?.[1];
    if (last && last.hours === hours && last.to === prevLabel) last.to = label;
    else groups.push({ from: label, to: label, hours });
  }
  if (!groups.length) return undefined;
  return groups.map((g) => `${g.from === g.to ? g.from : `${g.from}–${g.to}`} · ${g.hours}`).join(' · ');
}

const DAY_ALIASES: Record<string, number> = {
  lun: 0, lunes: 0, mar: 1, martes: 1, mie: 2, miercoles: 2, jue: 3, jueves: 3, vie: 4, viernes: 4, sab: 5, sabado: 5, dom: 6, domingo: 6,
};
const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function parseClock(s: string): string | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)?$/.exec(s.trim().toLowerCase());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const pm = m[3]?.startsWith('p');
  const am = m[3]?.startsWith('a');
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Best-effort inverse of `formatOpeningHours` for the contribute form's free text ("Mar–Dom · 9:00 a.m. – 5:00 p.m.",
 * "Lun-Vie 8am-4pm, Sáb 9-12"). Returns `undefined` when any part cannot be understood, so nothing wrong is sent.
 */
export function parseOpeningHours(text: string | undefined): OpeningHoursDto | undefined {
  if (!text?.trim()) return undefined;
  const out: OpeningHoursDto = {};
  const re = /([a-záéíóú]+)(?:\s*[–-]\s*([a-záéíóú]+))?\s*[·:,]?\s*(\d{1,2}(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?)\s*(?:–|-|a)\s*(\d{1,2}(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?)/gi;
  let matched = 0;
  for (const m of text.matchAll(re)) {
    const from = DAY_ALIASES[strip(m[1])];
    const to = m[2] ? DAY_ALIASES[strip(m[2])] : from;
    const open = parseClock(m[3]);
    const close = parseClock(m[4]);
    if (from === undefined || to === undefined || !open || !close || open >= close) return undefined;
    for (let d = from; ; d = (d + 1) % 7) {
      (out[DAYS[d][0]] ??= []).push({ open, close });
      if (d === to) break;
    }
    matched++;
  }
  return matched ? out : undefined;
}

const BASE = { verificationCount: 0, authorId: null };
const authorOf = (name: string | null | undefined) => name ?? t.common.community;

export function placeToView(p: PlaceDto | PlaceDetailDto, categories: Map<number, string>, loc: LatLng): VuelticaView {
  const detail = p as Partial<PlaceDetailDto>;
  return {
    ...BASE,
    ...conditionsFromApi(p, p.targetAudience),
    id: makeId('p', p.id),
    type: 'lugar',
    name: p.name,
    category: categories.get(p.categoryId) ?? '',
    description: p.description ?? '',
    photos: detail.photos?.length ? [...detail.photos].sort((a, b) => a.position - b.position).map((x) => x.url) : p.coverPhotoUrl ? [p.coverPhotoUrl] : [],
    lat: p.latitude,
    lng: p.longitude,
    address: p.address ?? '',
    province: provinceOfCanton(p.cantonId),
    openingHours: formatOpeningHours(p.openingHours),
    status: statusFromApi(p.status),
    authorName: authorOf(p.authorName),
    hiddenReason: p.hiddenReason ?? undefined,
    createdAt: p.createdAt,
    lastVerifiedAt: detail.lastVerifiedAt ?? p.verifiedAt ?? undefined,
    verificationCount: detail.verificationCount ?? 0,
    ratingAvg: p.averageRating ?? 0,
    ratingCount: p.reviewCount ?? 0,
    distanceKm: haversineKm(loc, { lat: p.latitude, lng: p.longitude }),
    saved: detail.isFavorite ?? false,
  };
}

/** `null` when the event has no location (#37 allows it): it cannot be shown on the map or by distance. */
export function eventToView(e: EventDto | EventDetailDto, categories: Map<number, string>, loc: LatLng): VuelticaView | null {
  if (e.latitude == null || e.longitude == null) return null;
  const detail = e as Partial<EventDetailDto>;
  const point = { lat: e.latitude, lng: e.longitude };
  return {
    ...BASE,
    ...conditionsFromApi(e, e.targetAudience),
    id: makeId('e', e.id),
    type: 'evento',
    name: e.title,
    category: categories.get(e.categoryId) ?? '',
    description: e.description ?? '',
    photos: detail.photos?.length ? [...detail.photos].sort((a, b) => a.position - b.position).map((x) => x.url) : e.coverPhotoUrl ? [e.coverPhotoUrl] : [],
    ...point,
    address: e.address ?? e.place?.address ?? e.place?.name ?? '',
    province: e.place ? provinceOfCanton(e.place.cantonId) : nearestProvince(point),
    startAt: e.startsAt,
    endAt: e.endsAt ?? undefined,
    status: statusFromApi(e.status),
    authorName: authorOf(e.authorName),
    hiddenReason: e.hiddenReason ?? undefined,
    createdAt: e.createdAt,
    lastVerifiedAt: detail.lastVerifiedAt ?? undefined,
    verificationCount: detail.verificationCount ?? 0,
    ratingAvg: e.averageRating ?? 0,
    ratingCount: e.reviewCount ?? 0,
    distanceKm: haversineKm(loc, point),
    saved: detail.isFavorite ?? false,
  };
}

/** A submission is a plan that is not published yet. `data` is the Place / Event body. */
export function submissionToView(s: SubmissionDto, categories: Map<number, string>, loc: LatLng, authorName: string = t.common.community): VuelticaView {
  const d = s.data as Record<string, unknown> & PlanConditionsDto;
  const isEvent = s.type === 'EVENT';
  const lat = Number(d.latitude ?? 0);
  const lng = Number(d.longitude ?? 0);
  const photos = Array.isArray(d.photos) ? (d.photos as unknown[]).map(String) : [];
  return {
    ...BASE,
    ...conditionsFromApi(d, (d.targetAudience as TargetAudience) ?? 'EVERYONE'),
    id: makeId('s', s.id),
    type: isEvent ? 'evento' : 'lugar',
    name: String((isEvent ? d.title : d.name) ?? ''),
    category: categories.get(Number(d.categoryId)) ?? '',
    description: String(d.description ?? ''),
    photos,
    lat,
    lng,
    address: String(d.address ?? ''),
    province: d.cantonId ? provinceOfCanton(Number(d.cantonId)) : nearestProvince({ lat, lng }),
    startAt: isEvent ? String(d.startsAt) : undefined,
    endAt: isEvent && d.endsAt ? String(d.endsAt) : undefined,
    openingHours: !isEvent ? formatOpeningHours((d.openingHours as OpeningHoursDto) ?? null) : undefined,
    status: statusFromApi(s.status),
    authorId: s.userId ?? null,
    authorName,
    createdAt: s.createdAt,
    rejectionReason: s.rejectionMessage ?? s.reviewNote ?? undefined,
    ratingAvg: 0,
    ratingCount: 0,
    distanceKm: haversineKm(loc, { lat, lng }),
  };
}

/** Profile fields of #42. `fallback` covers an API without them (or a login response, which has no `counts`). */
export function userFromApi(
  u: MyProfileDto,
  provider: User['provider'],
  fallback: { province: Province; memberSince: string; counts?: User['counts'] },
): User {
  const displayName = [u.name, u.surnames].filter(Boolean).join(' ').trim() || u.email.split('@')[0];
  return {
    id: u.id,
    displayName,
    initials: initialsOf(displayName),
    province: provinceById(u.province?.id) ?? fallback.province,
    memberSince: u.createdAt ?? fallback.memberSince,
    provider,
    email: u.email,
    points: u.points ?? 0,
    counts: u.counts ?? fallback.counts ?? { vuelticas: 0, reviews: 0, verifications: 0 },
  };
}

const KINDS: ReputationKind[] = ['published', 'verified', 'reviewUseful', 'moderationVote', 'rejected', 'reported', 'minorityModerator'];

/** `GET /me/reputation` → the app's summary. Level names and perk texts stay in `config/levels.ts`. */
export function reputationFromApi(r: ReputationDto, userId: string, role: UserDto['role']): ReputationSummary & { recent: ReputationEvent[] } {
  const level = levelByNumber(r.level);
  const recent: ReputationEvent[] = r.recent
    .filter((e): e is ReputationDto['recent'][number] & { kind: ReputationKind } => (KINDS as string[]).includes(e.kind))
    .map((e, i) => ({ id: `${e.createdAt}#${i}`, userId, kind: e.kind, delta: e.delta, createdAt: e.createdAt }));
  return {
    level,
    points: r.points,
    nextLevel: r.nextLevel ? levelByNumber(r.nextLevel) : undefined,
    pointsToNext: r.pointsToNext,
    progress: r.progress,
    recent,
    canModerate: r.perks.includes('moderation') || role === 'MODERATOR' || role === 'ADMIN',
  };
}
export function reviewFromApi(r: ReviewDto): Review {
  return {
    id: r.id,
    vuelticaId: r.placeId ? makeId('p', r.placeId) : makeId('e', r.eventId ?? ''),
    authorId: r.author.id,
    authorName: r.author.name,
    authorInitials: r.author.initials,
    createdAt: r.createdAt,
    stars: r.rating,
    // Optional in the API (other clients), required in the app's form.
    wentWith: r.wentWith ?? 'amigos',
    spent: r.spent ?? 'nada',
    text: r.comment ?? '',
    photos: r.photos,
    usefulCount: r.usefulCount,
    markedUsefulByMe: r.markedUsefulByMe,
  };
}

export function reportFromApi(r: ReportDto): Report {
  return {
    id: r.id,
    vuelticaId: r.placeId ? makeId('p', r.placeId) : makeId('e', r.eventId ?? ''),
    reporterId: '',
    reason: r.reason,
    details: r.details ?? undefined,
    photo: r.photo ?? undefined,
    createdAt: r.createdAt,
  };
}

export function moderationFromTally(vuelticaId: string, kind: ModerationItem['kind'], tally: ModerationTallyDto, extra: Partial<ModerationItem> = {}): ModerationItem {
  return {
    vuelticaId,
    kind,
    votesFor: tally.votesFor,
    votesAgainst: tally.votesAgainst,
    votesNeeded: tally.votesNeeded,
    myVote: tally.myVote ?? undefined,
    ...extra,
  };
}
