// Pure KPI math for the dashboard. No React, so it can be checked with plain node (kpi.check.mjs).
import type { DayStats, FeatureInfo, FeatureKey } from "./types";

export type Period = "day" | "week" | "month";

export const sum = (ds: DayStats[], f: (d: DayStats) => number) => ds.reduce((a, d) => a + f(d), 0);
export const avg = (ds: DayStats[], f: (d: DayStats) => number) => (ds.length ? sum(ds, f) / ds.length : 0);
export const ratio = (a: number, b: number) => (b ? a / b : 0);
export const change = (cur: number, prev: number) => (prev ? (cur - prev) / prev : null);

const MONTHS = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
export function fmtDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
export const fmtPct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

const mapRecord = (r: Record<FeatureKey, number>, f: (v: number) => number) =>
  Object.fromEntries(Object.entries(r).map(([k, v]) => [k, f(v)])) as Record<FeatureKey, number>;

// shortcut: a segment is approximated by scaling counts by its share, until the API reports real per-segment numbers.
export function scaleDays(days: DayStats[], share: number): DayStats[] {
  if (share === 1) return days;
  const s = (v: number) => Math.round(v * share);
  return days.map((d) => ({
    ...d,
    dau: s(d.dau),
    wau: s(d.wau),
    mau: s(d.mau),
    visits: s(d.visits),
    new_users: s(d.new_users),
    sessions: s(d.sessions),
    ops: s(d.ops),
    errors: s(d.errors),
    feature_users: mapRecord(d.feature_users, s),
    feature_uses: mapRecord(d.feature_uses, s),
    feature_errors: mapRecord(d.feature_errors, s),
  }));
}

// Days in [from, to] plus the same-length window right before it, for "compare with previous period".
export function windows(days: DayStats[], from: string, to: string) {
  const cur = days.filter((d) => d.date >= from && d.date <= to);
  const start = days.findIndex((d) => d.date >= from);
  const prev = start < 0 ? [] : days.slice(Math.max(0, start - cur.length), start);
  return { cur, prev };
}

// Groups days into buckets, aligned to the end so the latest bucket is always full.
export function buckets(days: DayStats[], period: Period): { label: string; days: DayStats[] }[] {
  const size = period === "day" ? 1 : period === "week" ? 7 : 30;
  const out: { label: string; days: DayStats[] }[] = [];
  for (let end = days.length; end > 0; end -= size) {
    const chunk = days.slice(Math.max(0, end - size), end);
    out.unshift({ label: fmtDate(chunk[0].date), days: chunk });
  }
  return out;
}

export function summarize(days: DayStats[], features: FeatureInfo[]) {
  const per = <T,>(f: (k: FeatureKey) => T) => Object.fromEntries(features.map((x) => [x.key, f(x.key)])) as Record<FeatureKey, T>;
  const dauSum = sum(days, (d) => d.dau);
  const ops = sum(days, (d) => d.ops);
  const errors = sum(days, (d) => d.errors);
  const uses = per((k) => sum(days, (d) => d.feature_uses[k]));
  const users = per((k) => avg(days, (d) => d.feature_users[k]));
  const featureErrors = per((k) => sum(days, (d) => d.feature_errors[k]));
  const visits = sum(days, (d) => d.visits);
  const funnel = [
    { label: "Au intrat (QR / site)", value: visits },
    { label: "Au răspuns", value: sum(days, (d) => d.feature_users.answer) },
    { label: "Au votat afirmații", value: sum(days, (d) => d.feature_users.vote) },
    { label: "Au văzut harta", value: sum(days, (d) => d.feature_users.map) },
    { label: "Au votat compromisul", value: sum(days, (d) => d.feature_users.proposal) },
  ];
  return {
    dau: avg(days, (d) => d.dau),
    wau: days.at(-1)?.wau ?? 0,
    mau: days.at(-1)?.mau ?? 0,
    newUsers: sum(days, (d) => d.new_users),
    interactions: ops,
    featureUsage: Object.values(uses).reduce((a, b) => a + b, 0),
    engagementS: avg(days, (d) => d.avg_session_s),
    sessionsPerUser: ratio(sum(days, (d) => d.sessions), dauSum),
    returning: 1 - ratio(sum(days, (d) => d.new_users), dauSum),
    successRate: 1 - ratio(errors, ops),
    errorRate: ratio(errors, ops),
    failed: errors,
    responseMs: avg(days, (d) => d.avg_response_ms),
    uptime: avg(days, (d) => d.uptime),
    uses,
    users,
    adoption: per((k) => ratio(users[k], avg(days, (d) => d.dau))),
    featureErrorRate: per((k) => ratio(featureErrors[k], uses[k])),
    funnel,
    activation: ratio(funnel[1].value, visits),
    completion: ratio(funnel[4].value, funnel[1].value),
  };
}

export type Summary = ReturnType<typeof summarize>;
