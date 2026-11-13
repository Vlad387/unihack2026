// The ONLY place that calls the REST API.
// Real backend (docs/tips/FRONTEND_TIPS.md) when NEXT_PUBLIC_API_URL is set, mock data otherwise.
// shortcut: consultation, proposal, support, moderation, KPI and analytics stay mock-only until Rares adds their endpoints.
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

export const API_URL = process.env.NEXT_PUBLIC_API_URL;
const MOCK = !API_URL;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store", ...init });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export async function getQuestion(): Promise<string> {
  return mockQuestion;
}

export interface ResponseInput {
  text: string | null;
  audio: Blob | null;
  neighborhood: string | null;
  age: number | null;
}

// Answers are processed in the background (Gemini), so this returns as soon as the API has stored it (202).
export async function submitResponse(input: ResponseInput): Promise<void> {
  if (MOCK) {
    console.log("submitResponse (mock)", { participant_id: getParticipantId(), ...input, audio: input.audio?.size });
    return;
  }
  const form = new FormData();
  form.append("participant_id", getParticipantId());
  if (input.text) form.append("text", input.text);
  if (input.audio) form.append("audio", input.audio, "answer.webm");
  if (input.neighborhood) form.append("neighborhood", input.neighborhood);
  if (input.age !== null) form.append("age", String(input.age));
  // no Content-Type header: the browser sets the multipart boundary
  await http("/responses", { method: "POST", body: form });
}

// Client-only: approved statements this participant hasn't written or voted on yet.
export async function getStatementsToVote(): Promise<Statement[]> {
  if (MOCK) return mockStatements;
  return http(`/statements?participant_id=${encodeURIComponent(getParticipantId())}&limit=20`);
}

export async function submitVote(statementId: string, value: VoteValue): Promise<void> {
  if (MOCK) {
    console.log("submitVote (mock)", { participant_id: getParticipantId(), statementId, value });
    return;
  }
  await http("/votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participant_id: getParticipantId(), statement_id: statementId, value }),
  });
}

export async function getClusters(): Promise<ClusterResult> {
  return MOCK ? mockClusters : http("/clusters");
}

export async function getBridges(): Promise<Statement[]> {
  return MOCK ? mockBridges : http("/bridges");
}

export async function getProposal(): Promise<Proposal> {
  return mockProposal;
}

export async function getSupport(): Promise<SupportRound[]> {
  return mockSupport;
}

// Client-only: needs the participant id from localStorage. The API has no endpoint for this,
// so we look ourselves up in /clusters. null = not placed on the map yet.
export async function getMyPosition(): Promise<Point | null> {
  const id = getParticipantId();
  // shortcut: mock puts you on an existing dot in camp c1
  if (MOCK) return { ...mockClusters.points[3], participant_id: id };
  const { points } = await getClusters();
  return points.find((p) => p.participant_id === id) ?? null;
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
