/** Domain entities (the ten from the requirements "Data model" table). */
export type VuelticaType = 'lugar' | 'evento';
export type PriceTier = 'gratis' | 'hasta2500' | 'hasta5000';
export type Audience = 'todo' | 'familias' | 'estudiantes' | 'ciudadanosOro';
export type FreeFor = 'estudiantes' | 'ciudadanosOro';
export type VuelticaStatus = 'pendiente' | 'publicada' | 'rechazada' | 'oculta';
export type Province = 'San José' | 'Alajuela' | 'Cartago' | 'Heredia' | 'Guanacaste' | 'Puntarenas' | 'Limón';
export type SignInProvider = 'apple' | 'google' | 'email';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Vueltica extends LatLng {
  id: string;
  type: VuelticaType;
  name: string;
  category: string;
  description: string;
  photos: string[];
  address: string;
  province: Province;
  /** ISO strings, events only. */
  startAt?: string;
  endAt?: string;
  /** Places only, display text e.g. "Mar–Dom · 9:00 a.m.–5:00 p.m." */
  openingHours?: string;
  priceTier: PriceTier;
  pricePerPerson: number;
  freeFor: FreeFor[];
  audiences: Audience[];
  wheelchair: boolean;
  status: VuelticaStatus;
  authorId: string | null;
  authorName: string;
  createdAt: string;
  lastVerifiedAt?: string;
  verificationCount: number;
  ratingAvg: number;
  ratingCount: number;
  views: number;
  rejectionReason?: string;
  /** Hidden after confirmed reports / verification (reason shown to author). */
  hiddenReason?: string;
  /** Under review after reports; flagged "Necesita revisión" after 72 h. */
  reportedAt?: string;
}

export interface VuelticaView extends Vueltica {
  distanceKm: number;
  saved?: boolean;
}

export type SettingsDirections = 'preguntar' | 'apple' | 'google' | 'waze';
export type MaxPrice = 'hasta5000' | 'hasta2500' | 'gratis';
export type LocationPermission = 'undetermined' | 'granted' | 'denied';

export interface Settings {
  darkMode: 'system' | 'on' | 'off';
  /** 1 = system default; user slider 0.85–1.5 multiplies. */
  textScale: number | null;
  largerButtons: boolean;
  moreContrast: boolean;
  reduceMotion: boolean;
  notifyReminders: boolean;
  notifyNewNearby: boolean;
  notifyMyStatus: boolean;
  maxPrice: MaxPrice;
  directionsApp: SettingsDirections;
  rememberedDirections: SettingsDirections | null;
  locationPermission: LocationPermission;
  province: Province | null;
  reminderOffsetDays: number;
}

export interface User {
  id: string;
  displayName: string;
  initials: string;
  province: Province;
  memberSince: string;
  provider: SignInProvider;
  email?: string;
  points: number;
  counts: { vuelticas: number; reviews: number; verifications: number };
}

export interface Saved {
  userId: string;
  vueltica: string;
  savedAt: string;
  reminderOffsetDays: number;
}

export type WentWith = 'familia' | 'amigos' | 'pareja' | 'solo';
export type SpentTier = 'nada' | 'menos2500' | 'entre2500y5000';

export interface Review {
  id: string;
  vuelticaId: string;
  authorId: string | null;
  authorName: string;
  authorInitials: string;
  createdAt: string;
  stars: number;
  wentWith: WentWith;
  spent: SpentTier;
  text: string;
  photos: string[];
  usefulCount: number;
  markedUsefulByMe: boolean;
}

export type StillHappening = 'si' | 'no' | 'nose';
export type PricePaid = 'gratis' | 'menos2500' | 'entre2500y5000' | 'mas5000';

export interface Verification {
  id: string;
  vuelticaId: string;
  userId: string | null;
  stillHappening: StillHappening;
  pricePaid?: PricePaid;
  scheduleCorrect?: boolean;
  correctedTime?: string;
  photo?: string;
  /** Who verified: user id, or `device:<id>` for guests. One counted verification per person per plan. */
  personKey?: string;
  createdAt: string;
}

export type ReportReason = 'cerro' | 'noGratis' | 'masDe5000' | 'horario' | 'inapropiado' | 'spam' | 'otro';

export interface Report {
  id: string;
  vuelticaId: string;
  /** Stored, never shown. */
  reporterId: string;
  reason: ReportReason;
  details?: string;
  photo?: string;
  createdAt: string;
}

export type ModerationKind = 'nueva' | 'reportada';
export type VoteChoice = 'for' | 'against';

export interface ModerationItem {
  vuelticaId: string;
  kind: ModerationKind;
  votesFor: number;
  votesAgainst: number;
  votesNeeded: number;
  reportCount?: number;
  topReason?: ReportReason;
  lastReportAt?: string;
  myVote?: VoteChoice;
}

export type ReputationKind = 'published' | 'verified' | 'reviewUseful' | 'moderationVote' | 'rejected' | 'reported';

export interface ReputationEvent {
  id: string;
  userId: string;
  kind: ReputationKind;
  delta: number;
  createdAt: string;
}

export interface Level {
  number: 1 | 2 | 3 | 4 | 5;
  name: string;
  threshold: number;
  perk: string;
}

export interface ReputationSummary {
  level: Level;
  points: number;
  nextLevel?: Level;
  pointsToNext: number;
  progress: number;
  recent: ReputationEvent[];
}

export type DateFilter = 'any' | 'hoy' | 'finDeSemana' | { from: string; to: string };

export interface Filters {
  text: string;
  types: VuelticaType[];
  maxPrice: MaxPrice;
  students: boolean;
  seniors: boolean;
  families: boolean;
  /** km from current location, max 5. */
  distanceKm: number;
  date: DateFilter;
  wheelchair: boolean;
  nearMe: boolean;
}

export type SortKey = 'cercanos' | 'calificados' | 'recientes' | 'fecha';
