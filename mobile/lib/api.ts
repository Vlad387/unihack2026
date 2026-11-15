// The ONLY place the app calls the CityMind API (same endpoints as frontend/src/lib/api.ts).
// Native fetch has no CORS, so the app can talk to the Azure API directly.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClusterResult, Proposal, ResponseStats, RoundStatus, Statement, SupportRound, VoteValue } from './types';

// EXPO_PUBLIC_API_URL in mobile/.env overrides it, e.g. http://<your Mac's IP>:8000 for the local backend.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://citymind-api-dkab4.azurewebsites.net';

// Same text as the site (frontend/src/lib/mock.ts): the consultation question is not served by the API yet.
export const QUESTION = 'Ce facem cu viața de noapte din centru?';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) throw new ApiError(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`, res.status);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// Citizens join without an account: the phone remembers an anonymous id.
const ID_KEY = 'citymind:participant';
let cachedId: string | null = null;
export async function getParticipantId(): Promise<string> {
  if (cachedId) return cachedId;
  const saved = await AsyncStorage.getItem(ID_KEY).catch(() => null);
  if (saved) return (cachedId = saved);
  // not a secret, only needs to be unique per phone
  const id = `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(ID_KEY, id).catch(e => console.warn('Could not save the participant id', e));
  return (cachedId = id);
}

export type ResponseInput = { text: string | null; audioUri: string | null; neighborhood: string | null; age: number | null };

// Answers are processed in the background (Gemini); the API answers 202 as soon as it has stored them.
export async function submitResponse(input: ResponseInput): Promise<void> {
  const form = new FormData();
  form.append('participant_id', await getParticipantId());
  if (input.text) form.append('text', input.text);
  // React Native's FormData takes a file as { uri, name, type }; the backend sniffs the real format (m4a)
  if (input.audioUri) form.append('audio', { uri: input.audioUri, name: 'answer.m4a', type: 'audio/mp4' } as unknown as Blob);
  if (input.neighborhood) form.append('neighborhood', input.neighborhood);
  if (input.age !== null) form.append('age', String(input.age));
  await http('/responses', { method: 'POST', body: form });
}

// Approved statements this participant hasn't written or voted on yet.
export async function getStatementsToVote(): Promise<Statement[]> {
  return http(`/statements?participant_id=${encodeURIComponent(await getParticipantId())}&limit=20`);
}

export async function submitVote(statementId: string, value: VoteValue): Promise<void> {
  await http('/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participant_id: await getParticipantId(), statement_id: statementId, value }),
  });
}

export const getClusters = (): Promise<ClusterResult> => http('/clusters');
export const getBridges = (): Promise<Statement[]> => http('/bridges');
// null before the organizer has started the first round.
export const getProposal = (): Promise<Proposal | null> => http('/proposal');
// Real citizens only: seed/demo participants and simulated voices are never counted.
export const getSupport = (): Promise<SupportRound[]> => http('/support');

// Throws ApiError 409 when a newer round exists (this one is closed). Voting again overwrites.
export async function submitProposalVote(proposalId: string, support: boolean, critique: string | null): Promise<void> {
  await http('/proposal-votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant_id: await getParticipantId(),
      proposal_id: proposalId,
      support,
      critique: critique?.slice(0, 1000) || null,
    }),
  });
}

const tokenHeader = (token: string | null): Record<string, string> => (token ? { 'X-Organizer-Token': token } : {});

// Is a compromise round running on the server right now? Public.
export const getRoundStatus = (): Promise<RoundStatus> => http('/proposals/status');

// Organizer: answers still waiting for (or failed) AI intake. Needs the organizer password.
export const getResponseStats = (token: string): Promise<ResponseStats> => http('/responses/stats', { headers: tokenHeader(token) });

// Organizer: starts mediate + critic in the background (30–60 s). 401 = wrong password, 409 = a round is already running.
export async function startProposalRound(token: string | null): Promise<void> {
  await http('/proposals', { method: 'POST', headers: tokenHeader(token) });
}

// A fetch that never reached the server throws TypeError (offline, DNS); anything else is a server problem.
export const errorText = (err: unknown) =>
  err instanceof TypeError ? 'Nu ne putem conecta. Verifică internetul și încearcă din nou.' : 'Serverul nu răspunde acum. Încearcă din nou puțin mai târziu.';
