// Mirror of backend/app/schemas.py. shortcut: guessed before Rares pushed schemas.py, sync once it lands.

export type VoteValue = "agree" | "disagree" | "pass";

export interface Statement {
  id: string;
  text: string;
  author_id: string | null;
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
}

export interface Camp {
  id: string;
  name: string;
  description: string;
  size: number;
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

export interface Verdict {
  faithful: boolean;
  balanced: boolean;
  feasible: boolean;
  notes: string;
}
