import answers from "./mock-answers.json";
import type {
  ClusterResult,
  Kpis,
  Consultation,
  ConsultationEvent,
  ModerationItem,
  Proposal,
  Statement,
  SupportRound,
} from "./types";

export const mockQuestion = "Ce facem cu viața de noapte din centru?";

export const mockConsultation: Consultation = {
  id: "demo",
  question: mockQuestion,
  context: "Primăria analizează programul teraselor și barurilor din centrul istoric.",
  threshold: 0.6,
};

export const mockModeration: ModerationItem[] = [
  { statement: { id: "m1", text: "Patronii de baruri sunt toți niște hoți.", author_id: null }, reason: "abuse" },
  { statement: { id: "m2", text: "Sunați-mă la 07xx xxx xxx să vă zic tot.", author_id: null }, reason: "personal_data" },
  { statement: { id: "m3", text: "Ar trebui să reparăm și drumul spre aeroport.", author_id: null }, reason: "off_topic" },
];

// Statements are real sentences from seed/responses.json (Eidrien), ids point back to the seed entry.
export const mockStatements: Statement[] = [
  { id: "seed-001", text: "Aș vrea ca terasele să închidă la 23, chiar dacă muzica din interior continuă.", author_id: null },
  { id: "seed-014", text: "Vreau terase deschise până la unu vara. Centrul trăiește din terase.", author_id: null },
  { id: "seed-022", text: "Dacă ar exista autobuze noaptea, nu am mai aștepta taxiul în grupuri gălăgioase lângă terase.", author_id: null },
  { id: "seed-008", text: "Aș prefera să mutăm cluburile mari într-o zonă fără locuințe.", author_id: null },
  { id: "seed-013", text: "Susțin sancțiuni pentru localurile care depășesc repetat limita de zgomot.", author_id: null },
  { id: "seed-033", text: "Aș vrea patrule vizibile și lumină pe străzile laterale, fără să interzicem distracția.", author_id: null },
  { id: "seed-047", text: "Coșurile, toaletele publice și curățenia ar trebui rezolvate indiferent de program.", author_id: null },
  { id: "seed-026", text: "În timpul săptămânii aș închide mai devreme, iar în weekend aș lăsa cluburile până la trei.", author_id: null },
];

// Sizes add up to the 50 seed answers.
const camps = [
  { id: "c1", name: "Liniște pentru locuitori", description: "Vor terase închise mai devreme și zgomot măsurat și sancționat.", size: 19 },
  { id: "c2", name: "Centru viu", description: "Vor program târziu, terase vara și concerte, fără boxe pe stradă.", size: 18 },
  { id: "c3", name: "Siguranță și transport", description: "Pun accent pe transport de noapte, patrule, lumină și curățenie.", size: 13 },
];

// Seed answers grouped roughly by the camp their authors would fall into.
const campAnswers: Record<string, string[]> = {
  c1: [...answers.resident, ...answers.elderly],
  c2: [...answers.bar_owner, ...answers.student],
  c3: [...answers.tourist, ...answers.student.slice(0, 3)],
};

const centers: Record<string, [number, number]> = { c1: [-0.6, 0.4], c2: [0.6, 0.3], c3: [0, -0.6] };

export const mockClusters: ClusterResult = {
  camps,
  points: camps.flatMap((c) =>
    Array.from({ length: c.size }, (_, i) => ({
      participant_id: `${c.id}-p${i}`,
      // deterministic jitter so SSR and client render match
      x: centers[c.id][0] + Math.sin(i * 12.9898) * 0.25,
      y: centers[c.id][1] + Math.cos(i * 78.233) * 0.25,
      camp_id: c.id,
      text: campAnswers[c.id][i % campAnswers[c.id].length],
    })),
  ),
};

export const mockBridges: Statement[] = [mockStatements[2], mockStatements[6]];

export const mockProposal: Proposal = {
  id: "p1",
  round: 1,
  text: "Terasele închid la 23:00, interiorul poate rămâne deschis până la 02:00 vinerea și sâmbăta doar cu izolare fonică verificată. Primăria introduce autobuze de noapte, măsurători de zgomot cu sancțiuni pentru abateri repetate și curățenie de noapte plătită dintr-o taxă proporțională cu mărimea localului.",
  tradeoffs: [
    { camp_id: "c1", gains: "Terase închise la 23 și sancțiuni reale pentru zgomot", gives_up: "Interiorul rămâne deschis până la 02 în weekend" },
    { camp_id: "c2", gains: "Program târziu în weekend, reguli stabile pentru toți", gives_up: "Terasele după 23 și o taxă de curățenie" },
    { camp_id: "c3", gains: "Autobuze de noapte și curățenie dimineața", gives_up: "Fără patrule permanente în fiecare noapte" },
  ],
};

export const mockSupport: SupportRound[] = [
  { round: 1, agree: 24, total: 46 },
  { round: 2, agree: 33, total: 48 },
];

// Fakes live WebSocket traffic so the board animates before the backend exists.
export function simulateEvents(onEvent: (e: ConsultationEvent) => void): () => void {
  let clusters = mockClusters;
  let support = mockSupport;
  let n = 0;
  const timer = setInterval(() => {
    n++;
    const camp = camps[n % camps.length];
    const [cx, cy] = centers[camp.id];
    clusters = {
      camps: clusters.camps.map((c) => (c.id === camp.id ? { ...c, size: c.size + 1 } : c)),
      points: [
        ...clusters.points,
        {
          participant_id: `sim-${n}`,
          x: cx + (Math.random() - 0.5) * 0.6,
          y: cy + (Math.random() - 0.5) * 0.6,
          camp_id: camp.id,
          text: campAnswers[camp.id][n % campAnswers[camp.id].length],
        },
      ],
    };
    onEvent({ type: "map_updated", data: clusters });
    if (n % 3 === 0) {
      const last = support[support.length - 1];
      const vote = { ...last, total: last.total + 1, agree: last.agree + (Math.random() < 0.7 ? 1 : 0) };
      support = [...support.slice(0, -1), vote];
      onEvent({ type: "support_updated", data: support });
    }
  }, 2000);
  return () => clearInterval(timer);
}

export const mockKpis: Kpis = {
  responses: 50,
  votes: 312,
  statements: 74,
  flagged: 3,
  ai: { calls: 186, avg_latency_ms: 1420, cost_usd: 0.38 },
};
