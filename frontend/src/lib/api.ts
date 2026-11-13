// The ONLY place that calls the REST API. shortcut: returns mock data until Rares's endpoints are up.
import {
  mockBridges,
  mockClusters,
  mockConsultation,
  mockKpis,
  mockModeration,
  mockProposal,
  mockQuestion,
  mockStatements,
  mockSupport,
} from "./mock";
import { mockAnalytics } from "./mock-analytics";
import { getParticipantId } from "./participant";
import type {
  Analytics,
  ClusterResult,
  Consultation,
  Kpis,
  ModerationItem,
  Point,
  Proposal,
  Statement,
  SupportRound,
  VoteValue,
} from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function getQuestion(): Promise<string> {
  return mockQuestion;
}

export interface ResponseInput {
  text: string | null;
  audio: Blob | null;
  neighborhood: string | null;
  age: number | null;
}

export async function submitResponse(input: ResponseInput): Promise<void> {
  console.log("submitResponse (mock)", { participant_id: getParticipantId(), ...input, audio: input.audio?.size });
}

export async function getStatementsToVote(): Promise<Statement[]> {
  return mockStatements;
}

export async function submitVote(statementId: string, value: VoteValue): Promise<void> {
  console.log("submitVote (mock)", { participant_id: getParticipantId(), statementId, value });
}

export async function getClusters(): Promise<ClusterResult> {
  return mockClusters;
}

export async function getBridges(): Promise<Statement[]> {
  return mockBridges;
}

export async function getProposal(): Promise<Proposal> {
  return mockProposal;
}

export async function getSupport(): Promise<SupportRound[]> {
  return mockSupport;
}

// Client-only: needs the participant id from localStorage.
export async function getMyPosition(): Promise<Point | null> {
  const id = getParticipantId();
  // shortcut: mock puts you on an existing dot in camp c1
  return { ...mockClusters.points[3], participant_id: id };
}

export interface ProposalVoteInput {
  proposalId: string;
  support: boolean;
  critique: string | null;
}

export async function submitProposalVote(input: ProposalVoteInput): Promise<void> {
  console.log("submitProposalVote (mock)", { participant_id: getParticipantId(), ...input });
}

// Organizer. shortcut: no organizer login yet (Auth0 only if time allows).
export async function getConsultation(): Promise<Consultation> {
  return mockConsultation;
}

export async function createConsultation(input: Omit<Consultation, "id">): Promise<Consultation> {
  console.log("createConsultation (mock)", input);
  return { ...input, id: mockConsultation.id };
}

export async function getModerationQueue(): Promise<ModerationItem[]> {
  return mockModeration;
}

export async function moderateStatement(statementId: string, approve: boolean): Promise<void> {
  console.log("moderateStatement (mock)", { statementId, approve });
}

export async function getKpis(): Promise<Kpis> {
  return mockKpis;
}

export async function getAnalytics(): Promise<Analytics> {
  return mockAnalytics;
}
