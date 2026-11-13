// Mirror of backend/app/schemas.py (synced 2026-11-14). Change it only together with Rares.

export type VoteValue = "agree" | "disagree" | "pass";

export interface Statement {
  id: string;
  text: string;
  author_id: string | null;
  // set by the intake agent; flagged statements go to moderation, not to voting
  flag?: ModerationReason | null;
}

export interface Vote {
  participant_id: string;
  statement_id: string;
  value: VoteValue;
}

export interface Point {
  participant_id: string;
  x: number;
  y: number;
  camp_id: string | null;
  // what this participant said (moderated), shown when hovering their dot
  text: string | null;
}

export interface Camp {
  id: string;
  name: string;
  description: string;
  size: number;
  member_ids: string[];
}

export interface ClusterResult {
  camps: Camp[];
  points: Point[];
}

export interface CampTradeoff {
  camp_id: string;
  gains: string;
  gives_up: string;
}

export interface Proposal {
  id: string;
  round: number;
  text: string;
  tradeoffs: CampTradeoff[];
}

// Real citizen votes only: simulated proxy votes are never counted here.
export interface SupportRound {
  round: number;
  agree: number;
  total: number;
}

// WebSocket messages from the backend. shortcut: {type, data} shape is a guess, agree it with Rares.
export type ConsultationEvent =
  | { type: "map_updated"; data: ClusterResult }
  | { type: "bridges_updated"; data: Statement[] }
  | { type: "proposal_published"; data: Proposal }
  | { type: "support_updated"; data: SupportRound[] };

export interface Consultation {
  id: string;
  question: string;
  context: string;
  // share of real "agree" votes (0–1) a proposal needs to pass
  threshold: number;
}

export type ModerationReason = "abuse" | "personal_data" | "off_topic";

export interface ModerationItem {
  statement: Statement;
  reason: ModerationReason;
}

export interface Kpis {
  responses: number;
  votes: number;
  statements: number;
  flagged: number;
  ai: { calls: number; avg_latency_ms: number; cost_usd: number };
}

// Product analytics for the KPI dashboard. A "feature" is one part of the app people use.
export type FeatureKey = "answer" | "vote" | "map" | "proposal" | "board" | "organizer";

export interface DayStats {
  date: string; // YYYY-MM-DD
  dau: number;
  wau: number;
  mau: number;
  visits: number; // QR scans / landing visits
  new_users: number;
  sessions: number;
  avg_session_s: number;
  ops: number; // all interactions (answers, votes, page actions)
  errors: number;
  avg_response_ms: number;
  uptime: number; // percent
  feature_users: Record<FeatureKey, number>;
  feature_uses: Record<FeatureKey, number>;
  feature_errors: Record<FeatureKey, number>;
}

export interface FeatureInfo {
  key: FeatureKey;
  label: string;
  retention: number; // share of users who use it again within 7 days
  avg_time_s: number;
  completion: number; // share of users who start it and finish it
  availability: number; // percent
}

export interface Analytics {
  days: DayStats[];
  features: FeatureInfo[];
  cohorts: { week: string; size: number; retention: number[] }[];
  segments: { key: string; label: string; share: number }[];
}

export interface Verdict {
  faithful: boolean;
  balanced: boolean;
  feasible: boolean;
  notes: string;
}
