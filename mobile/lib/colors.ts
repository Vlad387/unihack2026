import type { Camp } from './types';
import { SERIES } from '../theme';

// Same idea as frontend/src/lib/colors.ts: a camp keeps a stable color from its id (8 slots, collisions move on).
export function campColors(camps: Camp[]): Map<string, string> {
  const taken = new Set<number>();
  const result = new Map<string, string>();
  for (const id of camps.map(c => c.id).sort()) {
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    let slot = h % SERIES.length;
    while (taken.has(slot) && taken.size < SERIES.length) slot = (slot + 1) % SERIES.length;
    taken.add(slot);
    result.set(id, SERIES[slot]);
  }
  return result;
}
