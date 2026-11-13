import type {
  ClusterResult,
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

export const mockStatements: Statement[] = [
  { id: "s1", text: "Terasele ar trebui să închidă la miezul nopții în zilele lucrătoare.", author_id: null },
  { id: "s2", text: "Viața de noapte aduce turiști și locuri de muncă.", author_id: null },
  { id: "s3", text: "Avem nevoie de mai multe patrule de poliție noaptea.", author_id: null },
  { id: "s4", text: "Zgomotul după ora 1 face imposibil somnul locuitorilor.", author_id: null },
  { id: "s5", text: "Transportul public ar trebui să circule și noaptea.", author_id: null },
];

const camps = [
  { id: "c1", name: "Liniște pentru locuitori", description: "Vor program redus și control al zgomotului.", size: 18 },
  { id: "c2", name: "Centru viu", description: "Susțin barurile și evenimentele de noapte.", size: 15 },
  { id: "c3", name: "Siguranță întâi", description: "Pun accent pe pază și transport.", size: 9 },
];

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
    })),
  ),
};

export const mockBridges: Statement[] = [mockStatements[4]];

export const mockProposal: Proposal = {
  id: "p1",
  round: 1,
  text: "Terasele închid la 00:00 în zilele lucrătoare și la 02:00 în weekend, cu autobuze de noapte și patrule în weekend.",
  tradeoffs: [
    { camp_id: "c1", gains: "Liniște în timpul săptămânii", gives_up: "Program prelungit în weekend" },
    { camp_id: "c2", gains: "Weekend până la 02:00", gives_up: "Seri lungi în zilele lucrătoare" },
    { camp_id: "c3", gains: "Patrule și transport de noapte", gives_up: "Fără restricții totale" },
  ],
};

export const mockSupport: SupportRound[] = [
  { round: 1, agree: 21, total: 38 },
  { round: 2, agree: 29, total: 40 },
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
        { participant_id: `sim-${n}`, x: cx + (Math.random() - 0.5) * 0.6, y: cy + (Math.random() - 0.5) * 0.6, camp_id: camp.id },
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
