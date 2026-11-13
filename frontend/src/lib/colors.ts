import type { Camp } from "./types";

const SLOTS = 8;

// Same camp order → same color everywhere. Returns a CSS var so light pages and the dark board each get their validated step.
// More than 8 camps fold back to gray rather than inventing hues.
export function campColor(camps: Camp[]): (id: string | null) => string {
  const order = new Map(camps.map((c, i) => [c.id, i]));
  return (id) => {
    const i = id === null ? undefined : order.get(id);
    return i === undefined || i >= SLOTS ? "var(--muted-foreground)" : `var(--series-${i + 1})`;
  };
}
