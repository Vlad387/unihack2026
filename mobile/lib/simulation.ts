// Pipeline stages for the /simulare dashboard, plus the DEMO data. Pure functions only: the demo never touches the
// API, and live statuses are derived from real backend state. Self-check: node lib/simulation.check.mjs (copied from frontend/src/lib/simulation.ts, keep both in sync)
import type { Camp, ClusterResult, Point, Proposal, ResponseStats, RoundStatus, Statement, SupportRound } from "./types";

export type StageStatus = "waiting" | "processing" | "done";

export const STAGES = [
  { title: "Răspunsuri trimise", api: "POST /responses" },
  { title: "Salvate imediat", api: "DB · pending · HTTP 202" },
  { title: "Intake AI", api: "afirmații + semnalări" },
  { title: "Vot pe afirmații", api: "POST /votes" },
  { title: "Tabere de opinie", api: "cluster()" },
  { title: "Puncte comune", api: "bridges() + name_camps" },
  { title: "Organizatorul pornește runda", api: "POST /proposals" },
  { title: "Mediere + Critic", api: "mediate() · critic()" },
  { title: "Vot final", api: "POST /proposal-votes" },
] as const;

// Demo steps: 0 = not started, k = stage k is processing (earlier ones done), DONE_STEP = every stage done.
export const DONE_STEP = STAGES.length + 1;

export function demoStatuses(step: number): StageStatus[] {
  return STAGES.map((_, i) => (i < step - 1 ? "done" : i === step - 1 ? "processing" : "waiting"));
}

export interface LiveInput {
  clusters: ClusterResult;
  bridges: Statement[];
  proposal: Proposal | null;
  round: RoundStatus | null;
  stats: ResponseStats | null; // only with the organizer password
}

// Live: read the stages off real backend state. Without the organizer password, stages 2–3 fall back to the map.
export function liveStatuses({ clusters, bridges, proposal, round, stats }: LiveInput): StageStatus[] {
  const people = clusters.points.length > 0;
  const answers = people || (stats !== null && stats.pending + stats.failed + stats.done > 0);
  const waitingAi = (stats?.pending ?? 0) + (stats?.failed ?? 0) > 0;
  const running = round?.state === "running";
  const camps = clusters.camps.length > 0;
  const s = (done: boolean, busy = false): StageStatus => (done ? "done" : busy ? "processing" : "waiting");
  return [
    s(answers),
    s(answers && !waitingAi, waitingAi),
    s((stats?.done ?? 0) > 0 || people, waitingAi),
    s(proposal !== null, people && proposal === null),
    s(camps, people && !camps),
    s(bridges.length > 0, camps && bridges.length === 0),
    s(running || proposal !== null),
    s(proposal !== null && !running, running),
    s(false, proposal !== null && !running),
  ];
}

// ---------- DEMO (fictional, frontend-only) ----------

// seeded, so server and browser render the same scatter (no hydration mismatch) and RESET replays it exactly
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ids picked so the shared camp palette gives blue / orange / green (clearly different on the map)
const CAMPS = [
  { id: "demo-2", name: "Liniște pentru locuitori", center: [-0.62, -0.35], size: 19 },
  { id: "demo-3", name: "Centru viu noaptea", center: [0.6, -0.25], size: 15 },
  { id: "demo-4", name: "Siguranță și transport", center: [0.02, 0.62], size: 11 },
] as const;

const SAYS: Record<string, string[]> = {
  "demo-2": ["Terasele să închidă la 23 în zilele lucrătoare.", "Amenzi reale pentru muzica după miezul nopții."],
  "demo-3": ["Localurile țin centrul viu, nu le închideți.", "Program prelungit în weekend, cu reguli clare."],
  "demo-4": ["Autobuze de noapte, ca lumea să plece repede.", "Mai multă lumină și patrule pe străzile laterale."],
};

const BRIDGES = [
  "Ar trebui mai multe coșuri, toalete publice și curățenie după petreceri.",
  "Localurile care respectă regulile nu ar trebui sancționate pentru alții.",
  "Trotuarele trebuie să rămână libere pentru toată lumea.",
];

export const DEMO_COUNCIL =
  "Primăria propune ca toate localurile din centru să închidă la ora 24:00, șapte zile din șapte, fără excepții.";

const PROPOSAL: Proposal = {
  id: "demo-proposal",
  round: 1,
  text: "Program-pilot de trei luni: terasele se închid la 23:00, interiorul localurilor cu izolare fonică verificată poate rămâne deschis până la 02:00 vinerea și sâmbăta. Primăria adaugă autobuze de noapte, toalete și curățenie după petreceri, iar amenzile se dau doar localurilor care depășesc limita de zgomot.",
  tradeoffs: [
    { camp_id: "demo-2", gains: "Terase închise la 23 și amenzi pentru zgomot.", gives_up: "Interiorul rămâne deschis până la 02 în weekend." },
    { camp_id: "demo-3", gains: "Program târziu în weekend, reguli stabile.", gives_up: "Terasele după ora 23." },
    { camp_id: "demo-4", gains: "Autobuze de noapte și curățenie.", gives_up: "Fără patrule permanente în fiecare noapte." },
  ],
  verdict: { faithful: true, balanced: true, feasible: true, notes: "Fidelă argumentelor din toate cele trei tabere, realizabilă ca program-pilot." },
  proxies: [
    { group: "Lucrători în ture de noapte", text: "Avem nevoie de transport sigur la 3 dimineața, nu doar de liniște.", simulated: true },
  ],
};

export interface DemoFrame {
  clusters: ClusterResult;
  bridges: Statement[];
  proposal: Proposal | null;
  council: string | null;
  support: SupportRound[];
  note: string;
}

const people = (() => {
  const r = rng(2026);
  const jitter = () => (r() + r() + r() - 1.5) * 0.22;
  return CAMPS.flatMap((c) =>
    Array.from({ length: c.size }, (_, i) => ({
      id: `${c.id}-${i}`,
      camp: c.id,
      scatter: [r() * 2 - 1, r() * 2 - 1] as const,
      home: [c.center[0] + jitter(), c.center[1] + jitter()] as const,
      text: SAYS[c.id][i % 2],
    })),
  );
})();

const NOTES = [
  "Apasă START: urmărești tot drumul unei consultări, pe date fictive.",
  "45 de oameni scanează codul QR și răspund, cu vocea sau în scris.",
  "Fiecare răspuns e salvat imediat (HTTP 202). Nimic nu se pierde, chiar dacă AI-ul e ocupat.",
  "Intake AI: 68 de afirmații extrase, 2 semnalate pentru moderare (date personale, limbaj).",
  "Oamenii votează afirmațiile celorlalți: 312 de acord, 141 nu, 57 nu știu.",
  "Clustering: punctele se adună în tabere după cum au votat, nu după cine sunt.",
  "Puncte comune: 3 afirmații acceptate de fiecare tabără. AI-ul numește taberele.",
  "Organizatorul pornește runda: propunerea inițială a primăriei intră pe masă.",
  "Mediatorul scrie compromisul, Criticul verifică: fidel, echilibrat, realizabil.",
  "Vot final pe compromis. Criticile intră în runda următoare.",
  "Gata: de la păreri împrăștiate la un compromis votat.",
];

// `votes` = fictional final-round votes counted so far (step 9 animates them), plus the viewer's own demo vote.
export function demoFrame(step: number, votes = { agree: 0, total: 0 }): DemoFrame {
  const shown = step >= 1 ? people : [];
  const clustered = step >= 5;
  const named = step >= 6;
  const camps: Camp[] = clustered
    ? CAMPS.map((c, i) => ({
        id: c.id,
        name: named ? c.name : `Tabăra ${i + 1}`,
        description: "",
        size: c.size,
        member_ids: people.filter((p) => p.camp === c.id).map((p) => p.id),
      }))
    : [];
  const points: Point[] = shown.map((p) => ({
    participant_id: p.id,
    x: clustered ? p.home[0] : p.scatter[0],
    y: clustered ? p.home[1] : p.scatter[1],
    camp_id: clustered ? p.camp : null,
    text: step >= 3 ? p.text : null,
  }));
  return {
    clusters: { camps, points },
    bridges: named ? BRIDGES.map((text, i) => ({ id: `demo-bridge-${i}`, text, author_id: null })) : [],
    council: step >= 7 ? DEMO_COUNCIL : null,
    proposal: step >= 8 ? PROPOSAL : null,
    support: step >= 9 ? [{ round: 1, ...votes }] : [],
    note: NOTES[Math.min(step, NOTES.length - 1)],
  };
}
