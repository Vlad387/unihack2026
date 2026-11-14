// Self-check for colors.ts. Run from frontend/: node src/lib/colors.check.mjs
import assert from "node:assert/strict";
import { assignSlots } from "./colors.ts";

const camp = (id) => ({ id });
const ids = Array.from({ length: 6 }, (_, i) => `c-${i}`);

// same camps in any order → same slots (server and fresh client agree)
const a = assignSlots(ids.map(camp), new Map());
const b = assignSlots([...ids].reverse().map(camp), new Map());
assert.deepEqual([...a].sort(), [...b].sort());
assert.equal(new Set(a.values()).size, ids.length, "no two camps share a slot");

// a new camp never takes an existing camp's slot, a vanished camp frees its slot
const mem = new Map();
assignSlots(ids.slice(0, 3).map(camp), mem);
const before = new Map(mem);
assignSlots([...ids.slice(1, 3), ...ids.slice(3)].map(camp), mem);
for (const id of ids.slice(1, 3)) assert.equal(mem.get(id), before.get(id));
assert.ok(!mem.has("c-0"));
assert.equal(new Set(mem.values()).size, mem.size);

// more than 8 camps: the extras get no slot (gray)
const many = assignSlots(Array.from({ length: 10 }, (_, i) => camp(`x${i}`)), new Map());
assert.equal(many.size, 8);

console.log("colors ok");
