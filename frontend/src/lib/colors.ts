import type { Camp } from "./types";

const SLOTS = 8;

// Browser only: camps already on screen keep their slot when a new camp collides with them.
// The server stays stateless, so SSR and the first client render compute the same thing.
const seen = new Map<string, number>();

function home(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % SLOTS;
}

/** camp id → slot 0..7. A camp keeps its slot as long as it exists; a vanished camp frees it. */
export function assignSlots(camps: Camp[], memory: Map<string, number>): Map<string, number> {
  const ids = new Set(camps.map((c) => c.id));
  for (const id of memory.keys()) if (!ids.has(id)) memory.delete(id);
  const taken = new Set(memory.values());
  // sorted, so the result never depends on the order the backend lists camps in
  for (const id of [...ids].filter((id) => !memory.has(id)).sort()) {
    for (let k = 0; k < SLOTS; k++) {
      const slot = (home(id) + k) % SLOTS;
      if (!taken.has(slot)) {
        memory.set(id, slot);
        taken.add(slot);
        break;
      }
    }
  }
  return memory;
}

// Returns a CSS var so light pages and the dark board each get their validated step.
// More than 8 camps fold back to gray rather than inventing hues.
export function campColor(camps: Camp[]): (id: string | null) => string {
  const slots = assignSlots(camps, typeof window === "undefined" ? new Map() : seen);
  return (id) => {
    const i = id === null ? undefined : slots.get(id);
    return i === undefined ? "var(--muted-foreground)" : `var(--series-${i + 1})`;
  };
}
