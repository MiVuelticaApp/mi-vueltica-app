/**
 * Business rules. The only place where tiers, votes, points and levels are decided,
 * so a backend can replace them one by one.
 */
import { LEVELS, POINTS } from '@/config/levels';
import type {
  Level,
  ModerationItem,
  PriceTier,
  PricePaid,
  Report,
  ReportReason,
  ReputationEvent,
  ReputationKind,
  ReputationSummary,
  Review,
  Vueltica,
  Verification,
  VoteChoice,
} from './types';

export const MAX_PRICE = 5000;
export const TIER_LIMITS = { gratis: 0, hasta2500: 2500, hasta5000: 5000 } as const;
export const VERIFICATIONS_TO_UPDATE = 3;
export const REPORTS_TO_HIDE = 3;
export const NEEDS_REVIEW_HOURS = 72;
export const MODERATOR_LEVEL = 3;
export const VERIFY_PRICE_LEVEL = 2;

/** Tier for a per-person price; `null` when the plan is not allowed (> ₡5.000 or invalid). */
export function tierForPrice(price: number): PriceTier | null {
  if (!Number.isFinite(price) || price < 0) return null;
  if (price === 0) return 'gratis';
  if (price <= 2500) return 'hasta2500';
  if (price <= MAX_PRICE) return 'hasta5000';
  return null;
}

export function isPublishablePrice(price: number): boolean {
  return tierForPrice(price) !== null;
}

/** Pin / card opacity by tier (selected pins are always fully opaque). */
export function pinOpacity(tier: PriceTier, selected: boolean): number {
  if (selected) return 1;
  return tier === 'gratis' ? 1 : tier === 'hasta2500' ? 0.75 : 0.5;
}

/** Highest price (₡) a tier allows. */
export function tierMaxPrice(tier: PriceTier): number {
  return TIER_LIMITS[tier];
}

export function tierRank(tier: PriceTier): number {
  return tier === 'gratis' ? 0 : tier === 'hasta2500' ? 1 : 2;
}

export function levelForPoints(points: number): Level {
  let result = LEVELS[0];
  for (const l of LEVELS) if (points >= l.threshold) result = l;
  return result;
}

export function levelByNumber(n: number): Level {
  return LEVELS.find((l) => l.number === n) ?? LEVELS[0];
}

export function reputationFor(points: number, recent: ReputationEvent[] = []): ReputationSummary {
  const level = levelForPoints(points);
  const nextLevel = LEVELS.find((l) => l.number === level.number + 1);
  const pointsToNext = nextLevel ? Math.max(0, nextLevel.threshold - points) : 0;
  const progress = nextLevel
    ? Math.min(1, Math.max(0, (points - level.threshold) / (nextLevel.threshold - level.threshold)))
    : 1;
  return { level, points, nextLevel, pointsToNext, progress, recent };
}

export function canModerate(level: number): boolean {
  return level >= MODERATOR_LEVEL;
}

/** Votes required to publish: 5, or 3 when the author is level 3+. */
export function votesNeeded(authorLevel: number): 3 | 5 {
  return authorLevel >= 3 ? 3 : 5;
}

/** Placeholder: level 5 moderators' votes count double. */
export function voteWeight(level: number): 1 | 2 {
  return level >= 5 ? 2 : 1;
}

export function canVerifyPrice(level: number): boolean {
  return level >= VERIFY_PRICE_LEVEL;
}

export type ModerationDecision = 'publish' | 'reject' | 'pending';

/** New vueltica: publish with majority once the needed number of votes is in. */
export function decideNew(item: Pick<ModerationItem, 'votesFor' | 'votesAgainst' | 'votesNeeded'>): ModerationDecision {
  const total = item.votesFor + item.votesAgainst;
  if (total < item.votesNeeded) return 'pending';
  return item.votesFor > item.votesAgainst ? 'publish' : 'reject';
}

export type ReportDecision = 'keep' | 'hide' | 'pending';

/** Reported vueltica: majority of the votes needed (3) decides "Sigue igual" vs "Ocultar". */
export function decideReported(item: Pick<ModerationItem, 'votesFor' | 'votesAgainst' | 'votesNeeded'>): ReportDecision {
  const total = item.votesFor + item.votesAgainst;
  if (total < item.votesNeeded) return 'pending';
  // For reported items "for" means "Ocultar vueltica".
  return item.votesFor > item.votesAgainst ? 'hide' : 'keep';
}

export function isMinorityVote(choice: VoteChoice, item: Pick<ModerationItem, 'votesFor' | 'votesAgainst'>): boolean {
  const majority: VoteChoice = item.votesFor >= item.votesAgainst ? 'for' : 'against';
  return item.votesFor !== item.votesAgainst && choice !== majority;
}

export function pointsFor(kind: ReputationKind): number {
  return POINTS[
    kind === 'published'
      ? 'published'
      : kind === 'verified'
        ? 'verified'
        : kind === 'reviewUseful'
          ? 'reviewUseful'
          : kind === 'moderationVote'
            ? 'moderationVote'
            : kind === 'rejected'
              ? 'rejected'
              : 'reported'
  ];
}

/** Adds a delta without dropping under zero. */
export function applyPoints(current: number, delta: number): number {
  return Math.max(0, current + delta);
}

export function pricePaidToTier(p: PricePaid): PriceTier | 'mas5000' {
  return p === 'gratis' ? 'gratis' : p === 'menos2500' ? 'hasta2500' : p === 'entre2500y5000' ? 'hasta5000' : 'mas5000';
}

export interface VerificationOutcome {
  priceTier?: PriceTier;
  hidden?: boolean;
  hiddenReason?: string;
}

/**
 * 3 matching verifications update the listing: all three agree the plan is gone
 * (hide), cost over ₡5.000 (hide), or cost a different tier (update tier).
 */
export function outcomeOfVerifications(vs: Pick<Verification, 'stillHappening' | 'pricePaid'>[]): VerificationOutcome {
  const gone = vs.filter((v) => v.stillHappening === 'no').length;
  if (gone >= VERIFICATIONS_TO_UPDATE) return { hidden: true, hiddenReason: 'Ya no existe' };
  const counts = new Map<string, number>();
  for (const v of vs) {
    if (!v.pricePaid) continue;
    const t = pricePaidToTier(v.pricePaid);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  for (const [tier, n] of counts) {
    if (n >= VERIFICATIONS_TO_UPDATE) {
      if (tier === 'mas5000') return { hidden: true, hiddenReason: 'Cuesta más de ₡5.000' };
      return { priceTier: tier as PriceTier };
    }
  }
  return {};
}

/** 3 matching reports (same reason) hide the vueltica while moderators review it. */
export function reportsHide(reports: Pick<Report, 'reason'>[]): { hide: boolean; topReason?: ReportReason; count: number } {
  const counts = new Map<ReportReason, number>();
  for (const r of reports) counts.set(r.reason, (counts.get(r.reason) ?? 0) + 1);
  let top: ReportReason | undefined;
  let topN = 0;
  for (const [reason, n] of counts) {
    if (n > topN) {
      top = reason;
      topN = n;
    }
  }
  return { hide: topN >= REPORTS_TO_HIDE, topReason: top, count: reports.length };
}

export function needsReview(reportedAt: string | undefined, now: Date): boolean {
  if (!reportedAt) return false;
  return now.getTime() - new Date(reportedAt).getTime() > NEEDS_REVIEW_HOURS * 3600_000;
}

/** Who sees a vueltica: published to all; pending only to its author and moderators. */
export function isVisibleTo(v: Pick<Vueltica, 'status' | 'authorId'>, userId: string | null, userLevel: number): boolean {
  if (v.status === 'publicada') return true;
  if (v.status === 'pendiente') return !!userId && (v.authorId === userId || canModerate(userLevel));
  if (v.status === 'rechazada' || v.status === 'oculta') return !!userId && v.authorId === userId;
  return false;
}

/** Account deletion: published vuelticas stay as "Anónimo"; reviews/pending are removed. */
export function anonymizeOnDelete<T extends { authorId: string | null; authorName: string }>(item: T, userId: string): T {
  return item.authorId === userId ? { ...item, authorId: null, authorName: 'Anónimo' } : item;
}

export function ratingSummary(reviews: Pick<Review, 'stars'>[]): { avg: number; count: number; distribution: number[] } {
  const distribution = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const r of reviews) {
    distribution[r.stars - 1] += 1;
    sum += r.stars;
  }
  return { avg: reviews.length ? Math.round((sum / reviews.length) * 10) / 10 : 0, count: reviews.length, distribution };
}
