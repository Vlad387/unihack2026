// Self-check for kpi.ts. Run from frontend/: node src/lib/kpi.check.mjs
import assert from "node:assert/strict";
import { buckets, change, fmtDate, scaleDays, summarize, windows } from "./kpi.ts";

const feat = ["answer", "vote", "map", "proposal", "board", "organizer"];
const rec = (v) => Object.fromEntries(feat.map((k) => [k, v]));
const day = (date, dau) => ({
  date, dau, wau: dau * 5, mau: dau * 20, visits: dau * 2, new_users: dau / 2, sessions: dau, avg_session_s: 100,
  ops: 100, errors: 5, avg_response_ms: 400, uptime: 100,
  feature_users: rec(dau / 2), feature_uses: rec(10), feature_errors: rec(1),
});
const days = Array.from({ length: 10 }, (_, i) => day(`2026-11-${String(i + 1).padStart(2, "0")}`, 10 + i));
const features = feat.map((key) => ({ key, label: key, retention: 0.5, avg_time_s: 10, completion: 0.5, availability: 99 }));

const { cur, prev } = windows(days, "2026-11-06", "2026-11-10");
assert.equal(cur.length, 5);
assert.deepEqual(prev.map((d) => d.date), ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]);

const b = buckets(days, "week");
assert.equal(b.length, 2);
assert.equal(b.at(-1).days.length, 7, "latest bucket is full");
assert.equal(b[0].days.length, 3);

const s = summarize(cur, features);
assert.equal(s.errorRate, 0.05);
assert.equal(s.activation, 0.25); // answered users = dau/2, visits = dau*2
assert.equal(s.returning, 0.5);
assert.equal(change(110, 100), 0.1);
assert.equal(change(5, 0), null);
assert.equal(scaleDays(days, 0.5)[0].dau, 5);
assert.equal(fmtDate("2026-11-13"), "13 nov");
console.log("kpi.ts: all checks passed");
