/**
 * Wire types of mi-vueltica-api (the response interfaces under src/presentation/http in that repo). Hand-copied; keep in
 * sync with its OpenAPI document (`GET /openapi.json` outside production).
 */
import type { Audience, FreeFor, PricePaid, ReportReason, SpentTier, StillHappening, VoteChoice, WentWith } from '@/domain/types';

export type ContentStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type TargetAudience = 'EVERYONE' | 'CHILDREN' | 'ADULTS' | 'SENIORS';
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';
export type PlanType = 'PLACE' | 'EVENT';
export type ApiPriceTier = 'gratis' | 'hasta2500' | 'hasta5000';

/* ------------------------------------------------------------------ users */

export interface UserDto {
  id: string;
  email: string;
  name: string;
  surnames: string;
  ageRange: string | null;
  role: UserRole;
  /** #42. INEC province (1 San José … 7 Limón); null when the user never picked one. */
  province?: { id: number; name: string } | null;
  /** #42. ISO 8601, "Miembro desde". */
  createdAt?: string;
  points?: number;
  level?: number;
}
/** `GET /me` only: the profile adds the interests and the activity counts. */
export interface MyProfileDto extends UserDto {
  interests?: { id: number; name: string }[];
  counts?: { vuelticas: number; reviews: number; verifications: number };
}
export interface AuthDto {
  user: UserDto;
  token: string;
  expiresIn: string;
}
export type ReputationPerk = 'priceVerification' | 'moderation' | 'doubleVerification' | 'doubleModerationVote';
export interface ReputationDto {
  points: number;
  level: number;
  nextLevel: number | null;
  pointsToNext: number;
  progress: number;
  perks: ReputationPerk[];
  recent: { kind: string; delta: number; createdAt: string }[];
}

/* ------------------------------------------------------------ places/events */

export interface DayRange {
  open: string;
  close: string;
}
export type OpeningHoursDto = Partial<Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', DayRange[]>>;

/** Price, audiences and accessibility (#36), shared by places and events. */
export interface PlanConditionsDto {
  /** Colones per person; 0 = free, null = unknown. */
  pricePerPerson?: number | null;
  priceTier?: ApiPriceTier | null;
  freeFor?: FreeFor[];
  audiences?: Audience[];
  wheelchair?: boolean;
}
/** Hidden reason and author (#39, #40). */
export interface PlanCommunityDto {
  hiddenReason?: string | null;
  authorName?: string | null;
}
/** List cards (`GET /places`, `GET /events`, `/me/favorites`). */
export interface PlanStatsDto {
  averageRating?: number | null;
  reviewCount?: number;
  coverPhotoUrl?: string | null;
}
/** Detail only (#39). */
export interface VerificationFieldsDto {
  lastVerifiedAt?: string | null;
  verificationCount?: number;
  myVerifiedToday?: boolean;
}
export interface PhotoDto {
  id: string;
  url: string;
  position: number;
}

export interface PlaceDto extends PlanConditionsDto, PlanCommunityDto, PlanStatsDto {
  id: string;
  cantonId: number;
  categoryId: number;
  sourceId: string | null;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  openingHours: OpeningHoursDto | null;
  targetAudience: TargetAudience;
  status: ContentStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PlaceDetailDto extends PlaceDto, VerificationFieldsDto {
  photos: PhotoDto[];
  averageRating: number | null;
  reviewCount: number;
  ratingDistribution?: number[];
  isFavorite?: boolean;
  isMine?: boolean;
}
export interface PlaceSummaryDto {
  id: string;
  name: string;
  cantonId: number;
  latitude: number;
  longitude: number;
  address: string | null;
  status: ContentStatus;
}
export interface EventDto extends PlanConditionsDto, PlanCommunityDto, PlanStatsDto {
  id: string;
  placeId: string | null;
  categoryId: number;
  sourceId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  /** #37: the resolved location (the place's point, else the event's own, else null). */
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  place?: PlaceSummaryDto | null;
  targetAudience: TargetAudience;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}
export interface EventDetailDto extends EventDto, VerificationFieldsDto {
  photos?: PhotoDto[];
  averageRating?: number | null;
  reviewCount?: number;
  ratingDistribution?: number[];
  isFavorite?: boolean;
  isMine?: boolean;
}
export interface CategoryDto {
  id: number;
  name: string;
}
export interface FavoriteDto {
  /** #37. Older APIs only had places (no `type`, `place` always set). */
  type?: PlanType;
  place: PlaceDto | null;
  event?: EventDto | null;
  createdAt: string;
}

/* ------------------------------------------------------------ submissions */

/** `GET /me/blocks` item: the blocked person's display name only (no id of the user). */
export interface BlockDto {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProvinceDto {
  id: number;
  name: string;
  /** Only with `?include=cantons`. */
  cantons?: { id: number; name: string }[];
}

export interface SubmissionDto {
  id: string;
  /** Absent in the community moderation queue (voters do not see the author). */
  userId?: string;
  type: PlanType;
  data: Record<string, unknown>;
  status: ContentStatus;
  reviewedById?: string | null;
  reviewedAt: string | null;
  rejectionReason?: string | null;
  reviewNote: string | null;
  rejectionMessage?: string | null;
  /** #40: the place/event it became once approved. */
  created?: { type: PlanType; id: string } | null;
  createdAt: string;
}
export interface UploadDto {
  id: string;
  url: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
}

/* ---------------------------------------------------------------- reviews */

export interface ReviewDto {
  id: string;
  placeId: string | null;
  eventId: string | null;
  rating: number;
  comment: string | null;
  wentWith: WentWith | null;
  spent: SpentTier | null;
  photos: string[];
  usefulCount: number;
  markedUsefulByMe: boolean;
  status: ContentStatus;
  createdAt: string;
  author: { id: string | null; name: string; initials: string };
}
export interface ReviewListDto {
  data: ReviewDto[];
  page: number;
  pageSize: number;
  total: number;
  summary: { averageRating: number | null; reviewCount: number; distribution: number[] };
}

/* ------------------------------------------------------- community (#39) */

export interface VerifyBodyDto {
  stillHappening: StillHappening;
  pricePaid?: PricePaid | null;
  scheduleCorrect?: boolean | null;
  correctedTime?: string | null;
  photo?: string | null;
}
export interface VerifyDto {
  queued: boolean;
  points: number;
  hidden: boolean;
}
export interface ReportDto {
  id: string;
  placeId: string | null;
  eventId: string | null;
  reason: ReportReason;
  details: string | null;
  photo: string | null;
  createdAt: string;
  hidden?: boolean;
}
export interface ReportQueueItemDto {
  type: PlanType;
  placeId: string | null;
  eventId: string | null;
  title: string;
  status: ContentStatus;
  hiddenReason: string | null;
  reportedAt: string | null;
  needsReview: boolean;
  reportCount: number;
  topReason: ReportReason | null;
  firstReportAt: string;
  lastReportAt: string;
}

/* ------------------------------------------------ community moderation (#43) */

export interface ModerationTallyDto {
  votesFor: number;
  votesAgainst: number;
  votesNeeded: number;
  myVote: VoteChoice | null;
}
export interface ModerationQueueDto {
  nuevas: (ModerationTallyDto & { submission: SubmissionDto })[];
  reportadas: (ModerationTallyDto & { report: ReportQueueItemDto })[];
  totals: { nuevas: number; reportadas: number };
  total: number;
}
export type ModerationDecisionDto = 'pending' | 'publish' | 'reject' | 'hide' | 'keep';
export interface ModerationVoteDto extends ModerationTallyDto {
  type: PlanType | 'SUBMISSION';
  id: string;
  kind: 'nueva' | 'reportada';
  decision: ModerationDecisionDto;
}
