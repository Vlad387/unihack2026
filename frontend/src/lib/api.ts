// The ONLY place that calls the REST API. shortcut: returns mock data until Rares's endpoints are up.
import { mockBridges, mockClusters, mockProposal, mockQuestion, mockStatements, mockSupport } from "./mock";
import type { ClusterResult, Proposal, Statement, SupportRound, VoteValue } from "./types";

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
  console.log("submitResponse (mock)", { ...input, audio: input.audio?.size });
}

export async function getStatementsToVote(): Promise<Statement[]> {
  return mockStatements;
}

export async function submitVote(statementId: string, value: VoteValue): Promise<void> {
  console.log("submitVote (mock)", { statementId, value });
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
