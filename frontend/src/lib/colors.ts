import { scaleOrdinal, schemeTableau10 } from "d3";
import type { Camp } from "./types";

const UNASSIGNED = "#a1a1aa";

// Same camp order → same color everywhere (map, legend, screens, report).
export function campColor(camps: Camp[]): (id: string | null) => string {
  const scale = scaleOrdinal<string, string>(schemeTableau10).domain(camps.map((c) => c.id));
  return (id) => (id ? scale(id) : UNASSIGNED);
}
