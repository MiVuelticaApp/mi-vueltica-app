import type {
  ModerationKind, ReportReason, Report, ReputationEvent, Review, Saved, Settings, User, Verification, VoteChoice, Vueltica, PricePaid, StillHappening,
} from '@/domain/types';

export interface VoteRecord {
  vuelticaId: string;
  voterId: string;
  kind: ModerationKind;
  choice: VoteChoice;
  weight: number;
}

/** Votes cast by "the community" (simulated others), kept as counters per item. */
export interface CommunityVotes {
  votesFor: number;
  votesAgainst: number;
}

export interface QueuedVerification {
  id: string;
  vuelticaId: string;
  stillHappening: StillHappening;
  pricePaid?: PricePaid;
  scheduleCorrect?: boolean;
  correctedTime?: string;
  photo?: string;
  queuedAt: string;
}

export interface DB {
  version: number;
  seq: number;
  vuelticas: Vueltica[];
  reviews: Review[];
  ratingDist: Record<string, number[]>;
  verifications: Verification[];
  reports: Report[];
  reportDevices: string[];
  saved: Saved[];
  votes: VoteRecord[];
  community: Record<string, CommunityVotes>;
  reportMeta: Record<string, { count: number; topReason: ReportReason; lastReportAt: string }>;
  events: ReputationEvent[];
  users: User[];
  currentUserId: string | null;
  settings: Settings;
  viewed: string[];
  queue: QueuedVerification[];
  /** Per-vueltica status of the author's notification (published / rejected) already notified. */
  notified: string[];
}

export const DB_VERSION = 4;
