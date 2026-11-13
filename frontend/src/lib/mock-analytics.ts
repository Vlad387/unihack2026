// shortcut: 90 days of deterministic fake analytics for the KPI page, replace with GET /analytics from the API.
import type { Analytics, DayStats, FeatureInfo, FeatureKey } from "./types";

const N = 90;
const END = Date.UTC(2026, 10, 15);
const DAY = 86_400_000;

// mulberry32: same numbers on server and client, so no hydration mismatch
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const features: FeatureInfo[] = [
  { key: "answer", label: "Răspuns (voce/text)", retention: 0.42, avg_time_s: 74, completion: 0.91, availability: 99.6 },
  { key: "vote", label: "Vot afirmații", retention: 0.58, avg_time_s: 96, completion: 0.83, availability: 99.9 },
  { key: "map", label: "Harta opiniilor", retention: 0.51, avg_time_s: 38, completion: 0.97, availability: 99.9 },
  { key: "proposal", label: "Vot compromis", retention: 0.47, avg_time_s: 52, completion: 0.76, availability: 99.8 },
  { key: "board", label: "Ecran live", retention: 0.88, avg_time_s: 1260, completion: 1, availability: 99.7 },
  { key: "organizer", label: "Panou organizator", retention: 0.79, avg_time_s: 410, completion: 0.69, availability: 99.9 },
];

function build(): Analytics {
  const rand = rng(42);
  const dau: number[] = [];
  const days: DayStats[] = [];

  for (let i = 0; i < N; i++) {
    const ms = END - (N - 1 - i) * DAY;
    const weekend = [0, 6].includes(new Date(ms).getUTCDay());
    const d = Math.round((12 + i * 1.6) * (weekend ? 1.25 : 1) * (0.9 + rand() * 0.2));
    dau.push(d);
    const spike = i % 23 === 11; // a few bad days so quality charts have something to show
    const share: Record<FeatureKey, number> = {
      answer: 0.82,
      vote: 0.7,
      map: 0.55,
      proposal: i < 25 ? 0 : Math.min(0.48, (i - 25) * 0.02),
      board: 0,
      organizer: 0,
    };
    const users = Object.fromEntries(
      Object.entries(share).map(([k, s]) => [k, Math.round(d * s * (0.92 + rand() * 0.16))]),
    ) as Record<FeatureKey, number>;
    users.board = 3 + Math.round(rand() * 3);
    users.organizer = 2 + Math.round(rand() * 2);
    const perUser: Record<FeatureKey, number> = { answer: 1.1, vote: 6.2, map: 1.6, proposal: 1.2, board: 14, organizer: 5 };
    const uses = Object.fromEntries(
      features.map((f) => [f.key, Math.round(users[f.key] * perUser[f.key])]),
    ) as Record<FeatureKey, number>;
    const errRate = 0.008 + rand() * 0.006 + (spike ? 0.04 : 0);
    // audio upload in "answer" fails more often than taps
    const errs = Object.fromEntries(
      features.map((f) => [f.key, Math.round(uses[f.key] * errRate * (f.key === "answer" ? 2.2 : 1))]),
    ) as Record<FeatureKey, number>;
    // interactions also include page views, scrolling the map, opening menus: not only feature uses
    const ops = Math.round(Object.values(uses).reduce((a, b) => a + b, 0) * (1.3 + rand() * 0.1));

    days.push({
      date: new Date(ms).toISOString().slice(0, 10),
      dau: d,
      wau: Math.round(dau.slice(-7).reduce((a, b) => a + b, 0) * 0.55),
      mau: Math.round(dau.slice(-30).reduce((a, b) => a + b, 0) * 0.35),
      visits: Math.round(d * (1.15 + rand() * 0.08)),
      new_users: Math.round(d * (0.3 + rand() * 0.1)),
      sessions: Math.round(d * (1.3 + rand() * 0.3)),
      avg_session_s: Math.round(170 + rand() * 90),
      ops,
      errors: Object.values(errs).reduce((a, b) => a + b, 0),
      avg_response_ms: Math.round(380 + rand() * 120 + (spike ? 1400 : 0)),
      uptime: spike ? 98.7 : Math.min(100, 99.9 + rand() * 0.1),
      feature_users: users,
      feature_uses: uses,
      feature_errors: errs,
    });
  }

  const cohorts = Array.from({ length: 8 }, (_, w) => {
    const week = days[N - 56 + w * 7];
    return {
      week: week.date,
      size: days.slice(N - 56 + w * 7, N - 49 + w * 7).reduce((a, x) => a + x.new_users, 0),
      retention: Array.from({ length: 8 - w }, (_, k) =>
        k === 0 ? 1 : Math.min(1, 0.55 * 0.82 ** (k - 1) * (0.9 + rand() * 0.2)),
      ),
    };
  });

  return {
    days,
    features,
    cohorts,
    segments: [
      { key: "all", label: "Toți participanții", share: 1 },
      { key: "resident", label: "Locuitori", share: 0.34 },
      { key: "student", label: "Studenți", share: 0.26 },
      { key: "bar_owner", label: "Patroni", share: 0.14 },
      { key: "tourist", label: "Turiști", share: 0.16 },
      { key: "elderly", label: "Vârstnici", share: 0.1 },
    ],
  };
}

export const mockAnalytics: Analytics = build();
