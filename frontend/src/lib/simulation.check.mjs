// Self-check for simulation.ts. Run from frontend/: node src/lib/simulation.check.mjs
import assert from "node:assert/strict";
import { demoFrame, demoStatuses, DONE_STEP, liveStatuses, STAGES } from "./simulation.ts";

// demo statuses walk the 9 stages in order
assert.deepEqual(demoStatuses(0), STAGES.map(() => "waiting"));
assert.deepEqual(demoStatuses(1).slice(0, 2), ["processing", "waiting"]);
assert.deepEqual(demoStatuses(5).slice(3, 6), ["done", "processing", "waiting"]);
assert.ok(demoStatuses(DONE_STEP).every((s) => s === "done"));

// demo data: scattered and colorless before clustering, clustered and named after, never a real id
const before = demoFrame(4);
const after = demoFrame(6);
assert.equal(before.clusters.camps.length, 0);
assert.ok(before.clusters.points.every((p) => p.camp_id === null));
assert.equal(after.clusters.camps.length, 3);
assert.equal(after.clusters.points.length, before.clusters.points.length, "same people move, none appear or vanish");
assert.ok(after.clusters.points.every((p) => p.participant_id.startsWith("demo-")));
assert.ok(demoFrame(DONE_STEP).proposal?.proxies?.every((v) => v.simulated));
assert.deepEqual(demoFrame(9, { agree: 3, total: 4 }).support, [{ round: 1, agree: 3, total: 4 }]);

// live: empty backend = all waiting; a running round = mediation processing; a published proposal = final vote open
const empty = { clusters: { camps: [], points: [] }, bridges: [], proposal: null, round: null, stats: null };
assert.ok(liveStatuses(empty).every((s) => s === "waiting"));
const map = { camps: [{ id: "c", name: "c", description: "", size: 1, member_ids: ["p"] }], points: [{ participant_id: "p", x: 0, y: 0, camp_id: "c", text: null }] };
const running = liveStatuses({ ...empty, clusters: map, round: { state: "running", error: null } });
assert.equal(running[7], "processing");
assert.equal(running[8], "waiting");
const published = liveStatuses({ ...empty, clusters: map, proposal: { id: "x", round: 1, text: "", tradeoffs: [] }, round: { state: "idle", error: null } });
assert.deepEqual(published.slice(6), ["done", "done", "processing"]);
assert.equal(liveStatuses({ ...empty, stats: { pending: 2, failed: 0, done: 0 } })[2], "processing", "answers waiting for AI");
console.log("simulation.check: ok");
