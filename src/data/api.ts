/**
 * The contract the UI talks to. `MockApi` (offline demo / e2e) and `HttpApi` (mi-vueltica-api) implement it;
 * `src/data/index.ts` picks one from `EXPO_PUBLIC_API_URL`.
 */
import type {
  Audience, BlockedUser, FreeFor, Filters, LatLng, MaxPrice, ModerationItem, PricePaid, Province, Report, ReportReason, ReputationSummary, Review, Saved,
  Settings, SignInProvider, SortKey, SpentTier, StillHappening, User, VoteChoice, VuelticaType, VuelticaView, WentWith, ReputationEvent, RejectionCode,
} from '@/domain/types';
import type { Canton } from '@/domain/cantons';

export class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}
export class AuthRequiredError extends Error {
  constructor(public reason: 'save' | 'contribute' | 'review' | 'moderate' | 'useful' | 'block') {
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
/** The connected backend has no endpoint for this yet (see the `mi-vueltica-api` issues labelled in docs/API_INTEGRATION.md). */
export class NotSupportedError extends Error {
  constructor(public feature: string) {
    super(`not-supported:${feature}`);
    this.name = 'NotSupportedError';
  }
}
/** The user dismissed the Apple / Google sign-in sheet. Not an error to show. */
export class SignInCancelledError extends Error {
  constructor() {
    super('sign-in-cancelled');
    this.name = 'SignInCancelledError';
  }
}
export class ConflictError extends Error {
  constructor(message = 'conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
/** 429: the API's per-person / per-IP rate limit (reports 10 / 15 min, verifications 30 / 15 min, uploads 60 / 15 min). */
export class RateLimitError extends Error {
  constructor() {
    super('rate-limited');
    this.name = 'RateLimitError';
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
  /** Required for places (the API needs the canton); events have their own point and no canton. */
  cantonId?: number;
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

export interface DecideInput {
  vuelticaId: string;
  decision: 'approve' | 'reject';
  reason?: RejectionCode;
  /** Required with `otro`; optional extra text for the other codes. */
  note?: string;
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
  /** Edit a pending suggestion (same body as create). `ConflictError` once it was decided. */
  updateVueltica(id: string, input: CreateVuelticaInput): Promise<VuelticaView>;
  myVuelticas(location: LatLng): Promise<MyVuelticaItem[]>;
  /** Cantons of a province, for the suggestion form. */
  listCantons(province: Province): Promise<Canton[]>;
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
  /** Own reviews only (`PUT /reviews/:id`). */
  updateReview(reviewId: string, input: CreateReviewInput): Promise<Review>;
  /** Own reviews only (`DELETE /reviews/:id`). */
  deleteReview(reviewId: string): Promise<void>;
  moderationQueue(location: LatLng): Promise<ModerationQueue>;
  moderationCount(): Promise<number>;
  vote(input: { vuelticaId: string; choice: VoteChoice }): Promise<ModerationItem>;
  undoVote(vuelticaId: string): Promise<ModerationItem>;
  /** Team roles only: approve or reject a suggestion directly (`ForbiddenError` otherwise). */
  decideSubmission(input: DecideInput): Promise<void>;
  /**
   * Block the author of a community plan or a review (responses carry the author's name, not their id). Their plans and
   * reviews disappear for the caller. Idempotent; `NotFoundError` when the content has no author (curated plans).
   */
  blockAuthor(target: { kind: 'vueltica' | 'review'; id: string }): Promise<void>;
  listBlocks(): Promise<BlockedUser[]>;
  unblock(blockId: string): Promise<void>;
  reputationSummary(): Promise<ReputationSummary & { recent: ReputationEvent[] }>;
  signIn(input: { provider: SignInProvider }): Promise<User>;
  /** Providers the connected backend can sign in with (the login screen hides the rest). */
  readonly signInProviders: SignInProvider[];
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
