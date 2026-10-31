/**
 * The contract the UI talks to. `MockApi` implements it today; a real backend is an
 * `HttpApi` class plus a one-line change in `src/data/index.ts`.
 */
import type {
  Audience, FreeFor, Filters, LatLng, MaxPrice, ModerationItem, PricePaid, Province, Report, ReportReason, ReputationSummary, Review, Saved,
  Settings, SignInProvider, SortKey, SpentTier, StillHappening, User, VoteChoice, VuelticaType, VuelticaView, WentWith, ReputationEvent,
} from '@/domain/types';

export class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}
export class AuthRequiredError extends Error {
  constructor(public reason: 'save' | 'contribute' | 'review' | 'moderate' | 'useful') {
    super('auth-required');
    this.name = 'AuthRequiredError';
  }
}
export class ForbiddenError extends Error {
  constructor(message = 'forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
export class NotFoundError extends Error {
  constructor() {
    super('not-found');
    this.name = 'NotFoundError';
  }
}
export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
export class DuplicateReportError extends Error {
  constructor() {
    super('duplicate-report');
    this.name = 'DuplicateReportError';
  }
}

export interface ListParams {
  filters: Filters;
  location: LatLng;
  sort?: SortKey;
  maxPrice?: MaxPrice;
}

export interface ListResult {
  items: VuelticaView[];
  count: number;
  freeCount: number;
  /** Yellow "Pendiente" pins visible to this user (own pending + the queue for moderators). */
  pending: (VuelticaView & { mine: boolean })[];
}

export interface RatingSummary {
  avg: number;
  count: number;
  distribution: number[];
}

export interface VuelticaDetail {
  vuelticaView: VuelticaView;
  saved: boolean;
  rating: RatingSummary;
  reviewsPreview: Review[];
  verification: { lastVerifiedAt?: string; count: number; myVerifiedToday: boolean };
  community: { authorName: string; verifiedBy: number; updatedAt: string };
  mine: boolean;
  moderation?: ModerationItem;
}

export interface CreateVuelticaInput {
  type: VuelticaType;
  name: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  province: Province;
  startAt?: string;
  endAt?: string;
  openingHours?: string;
  pricePerPerson: number;
  freeFor: FreeFor[];
  audiences: Audience[];
  wheelchair: boolean;
  photos: string[];
}

export interface MyVuelticaItem {
  vuelticaView: VuelticaView;
  votesFor: number;
  votesAgainst: number;
  votesNeeded: number;
}

export interface SavedItem {
  vuelticaView: VuelticaView;
  saved: Saved;
}

export interface VerifyInput {
  vuelticaId: string;
  stillHappening: StillHappening;
  pricePaid?: PricePaid;
  scheduleCorrect?: boolean;
  correctedTime?: string;
  photo?: string;
}

export interface VerifyResult {
  queued: boolean;
  points: number;
  hidden: boolean;
}

export interface ReportInput {
  vuelticaId: string;
  reason: ReportReason;
  details?: string;
  photo?: string;
}

export interface ReviewListParams {
  vuelticaId: string;
  sort: 'recientes' | 'fotos' | 'utiles';
  audience?: 'familias' | 'estudiantes';
}

export interface ReviewList {
  summary: RatingSummary;
  items: Review[];
}

export interface CreateReviewInput {
  vuelticaId: string;
  stars: number;
  wentWith: WentWith;
  spent: SpentTier;
  text: string;
  photos: string[];
}

export interface ModerationQueue {
  nuevas: (ModerationItem & { vuelticaView: VuelticaView })[];
  reportadas: (ModerationItem & { vuelticaView: VuelticaView })[];
  total: number;
}

export interface ScheduledReminder {
  id: string;
  vuelticaId: string;
  title: string;
  body: string;
  fireAt: string;
}

export interface ExportedData {
  filename: string;
  mimeType: string;
  content: string;
}

export interface SimulateInput {
  kind: 'votes' | 'verifications' | 'reports';
  vuelticaId?: string;
  count?: number;
  choice?: VoteChoice;
  reason?: ReportReason;
  pricePaid?: PricePaid;
  stillHappening?: StillHappening;
}

export interface MiVuelticaApi {
  listVuelticas(p: ListParams): Promise<ListResult>;
  searchVuelticas(p: ListParams): Promise<ListResult>;
  getVueltica(id: string, location: LatLng): Promise<VuelticaDetail>;
  recentlyViewed(location: LatLng): Promise<VuelticaView[]>;
  createVueltica(input: CreateVuelticaInput): Promise<{ vueltica: VuelticaView; moderation: ModerationItem }>;
  myVuelticas(location: LatLng): Promise<MyVuelticaItem[]>;
  withdrawVueltica(id: string): Promise<void>;
  saveVueltica(id: string): Promise<void>;
  unsaveVueltica(id: string): Promise<void>;
  listSaved(location: LatLng): Promise<SavedItem[]>;
  verify(input: VerifyInput): Promise<VerifyResult>;
  quickConfirm(vuelticaId: string): Promise<VerifyResult>;
  flushQueuedVerifications(): Promise<number>;
  report(input: ReportInput): Promise<Report>;
  listReviews(p: ReviewListParams): Promise<ReviewList>;
  createReview(input: CreateReviewInput): Promise<Review>;
  markUseful(reviewId: string): Promise<Review>;
  moderationQueue(location: LatLng): Promise<ModerationQueue>;
  moderationCount(): Promise<number>;
  vote(input: { vuelticaId: string; choice: VoteChoice }): Promise<ModerationItem>;
  undoVote(vuelticaId: string): Promise<ModerationItem>;
  reputationSummary(): Promise<ReputationSummary & { recent: ReputationEvent[] }>;
  signIn(input: { provider: SignInProvider; email?: string }): Promise<User>;
  signOut(): Promise<void>;
  currentUser(): Promise<User | null>;
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  exportMyData(): Promise<ExportedData>;
  deleteAccount(): Promise<void>;
  scheduleNotifications(): Promise<ScheduledReminder[]>;
  /** Dev only: act as the rest of the community. */
  simulateCommunity(input: SimulateInput): Promise<void>;
}
