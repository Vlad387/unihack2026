"use client";

import { useEffect, useState } from "react";
import { subscribe } from "@/lib/ws";
import type { ClusterResult, ConsultationEvent, Proposal, Statement, SupportRound } from "@/lib/types";

export interface ConsultationState {
  clusters: ClusterResult;
  bridges: Statement[];
  proposal: Proposal | null;
  support: SupportRound[];
}

function apply(state: ConsultationState, e: ConsultationEvent): ConsultationState {
  switch (e.type) {
    case "map_updated":
      return { ...state, clusters: e.data };
    case "bridges_updated":
      return { ...state, bridges: e.data };
    case "proposal_published":
      return { ...state, proposal: e.data };
    case "support_updated":
      return { ...state, support: e.data };
  }
}

export function useConsultation(initial: ConsultationState): ConsultationState {
  const [state, setState] = useState(initial);
  useEffect(() => subscribe((e) => setState((s) => apply(s, e))), []);
  return state;
}
