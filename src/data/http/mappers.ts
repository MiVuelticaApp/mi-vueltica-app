import { haversineKm } from '@/domain/geo';
import type { Audience, LatLng, Province, User, VuelticaStatus, VuelticaView } from '@/domain/types';
import { formatTime, initialsOf } from '@/i18n/format';
import { t } from '@/i18n/es-CR';
import type {
  ContentStatus, EventDetailDto, EventDto, OpeningHoursDto, PlaceDetailDto, PlaceDto, SubmissionDto, TargetAudience, UserDto,
} from './dto';

/* Ids: the app has a single id space for places and events, the API has two (and a third for submissions). */
export type IdKind = 'p' | 'e' | 's';
export const makeId = (kind: IdKind, uuid: string) => `${kind}-${uuid}`;
export function parseId(id: string): { kind: IdKind; uuid: string } {
  const m = /^([pes])-(.+)$/.exec(id);
  if (!m) return { kind: 'p', uuid: id };
  return { kind: m[1] as IdKind, uuid: m[2] };
}

/** INEC province code = first digit of the canton id (101 = San José … 701 = Limón). */
const PROVINCES: Province[] = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];
export const provinceOfCanton = (cantonId: number): Province => PROVINCES[Math.floor(cantonId / 100) - 1] ?? 'San José';
/** Interim: the form only collects a province, so submissions use that province's central canton (x01). */
export const defaultCantonOf = (province: Province): number => (PROVINCES.indexOf(province) + 1) * 100 + 1;

export const statusFromApi = (s: ContentStatus): VuelticaStatus =>
  s === 'PUBLISHED' ? 'publicada' : s === 'REJECTED' ? 'rechazada' : s === 'ARCHIVED' ? 'oculta' : 'pendiente';

/** The API has one audience enum; the app has a set. Lossy both ways until the API models it (see API_INTEGRATION.md). */
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

/*
 * Fields the API does not have (price, who is free, accessibility, verifications, views, author) get neutral
 * defaults. Price defaults to the "hasta ₡5.000" tier because every published plan is, by the app's rules, ≤ ₡5.000.
 */
const FALLBACK = {
  priceTier: 'hasta5000' as const,
  pricePerPerson: 0,
  freeFor: [] as never[],
  wheelchair: false,
  verificationCount: 0,
  views: 0,
  authorId: null,
  authorName: t.common.community,
};

export function placeToView(p: PlaceDto | PlaceDetailDto, categories: Map<number, string>, loc: LatLng): VuelticaView {
  const detail = p as Partial<PlaceDetailDto>;
  return {
    ...FALLBACK,
    id: makeId('p', p.id),
    type: 'lugar',
    name: p.name,
    category: categories.get(p.categoryId) ?? '',
    description: p.description ?? '',
    photos: detail.photos?.map((x) => x.url) ?? [],
    lat: p.latitude,
    lng: p.longitude,
    address: p.address ?? '',
    province: provinceOfCanton(p.cantonId),
    openingHours: formatOpeningHours(p.openingHours),
    audiences: audiencesFromApi(p.targetAudience),
    status: statusFromApi(p.status),
    createdAt: p.createdAt,
    lastVerifiedAt: p.verifiedAt ?? undefined,
    ratingAvg: detail.averageRating ?? 0,
    ratingCount: detail.reviewCount ?? 0,
    distanceKm: haversineKm(loc, { lat: p.latitude, lng: p.longitude }),
    saved: detail.isFavorite ?? false,
  };
}

export interface EventPlace {
  id: string;
  cantonId: number;
  latitude: number;
  longitude: number;
  address: string | null;
  name: string;
}

/** Events carry no coordinates of their own: they take the place's. `null` when the event has no (visible) place. */
export function eventToView(e: EventDto | EventDetailDto, place: EventPlace | null, categories: Map<number, string>, loc: LatLng): VuelticaView | null {
  if (!place) return null;
  return {
    ...FALLBACK,
    id: makeId('e', e.id),
    type: 'evento',
    name: e.title,
    category: categories.get(e.categoryId) ?? '',
    description: e.description ?? '',
    photos: [],
    lat: place.latitude,
    lng: place.longitude,
    address: place.address ?? place.name,
    province: provinceOfCanton(place.cantonId),
    startAt: e.startsAt,
    endAt: e.endsAt ?? undefined,
    audiences: audiencesFromApi(e.targetAudience),
    status: statusFromApi(e.status),
    createdAt: e.createdAt,
    ratingAvg: 0,
    ratingCount: 0,
    distanceKm: haversineKm(loc, { lat: place.latitude, lng: place.longitude }),
    saved: false,
  };
}

/** A submission is what the author sees while the plan waits for a moderator. `data` is the Place / Event body. */
export function submissionToView(s: SubmissionDto, categories: Map<number, string>, loc: LatLng, authorName: string = t.common.community): VuelticaView {
  const d = s.data as Record<string, unknown>;
  const isEvent = s.type === 'EVENT';
  const lat = Number(d.latitude ?? 0);
  const lng = Number(d.longitude ?? 0);
  return {
    ...FALLBACK,
    id: makeId('s', s.id),
    type: isEvent ? 'evento' : 'lugar',
    name: String((isEvent ? d.title : d.name) ?? ''),
    category: categories.get(Number(d.categoryId)) ?? '',
    description: String(d.description ?? ''),
    photos: [],
    lat,
    lng,
    address: String(d.address ?? ''),
    province: provinceOfCanton(Number(d.cantonId ?? 101)),
    startAt: isEvent ? String(d.startsAt) : undefined,
    endAt: isEvent && d.endsAt ? String(d.endsAt) : undefined,
    openingHours: !isEvent ? formatOpeningHours((d.openingHours as OpeningHoursDto) ?? null) : undefined,
    audiences: audiencesFromApi((d.targetAudience as TargetAudience) ?? 'EVERYONE'),
    status: statusFromApi(s.status),
    authorId: s.userId,
    authorName,
    createdAt: s.createdAt,
    rejectionReason: s.reviewNote ?? undefined,
    ratingAvg: 0,
    ratingCount: 0,
    distanceKm: haversineKm(loc, { lat, lng }),
  };
}

export function userFromApi(u: UserDto, provider: User['provider'], province: Province, memberSince: string): User {
  const displayName = [u.name, u.surnames].filter(Boolean).join(' ').trim() || u.email.split('@')[0];
  return {
    id: u.id,
    displayName,
    initials: initialsOf(displayName),
    province,
    memberSince,
    provider,
    email: u.email,
    // Reputation is not modelled by the API yet (docs/API_INTEGRATION.md): counts start at zero.
    points: 0,
    counts: { vuelticas: 0, reviews: 0, verifications: 0 },
  };
}
