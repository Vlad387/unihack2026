"use client";

import { FlaskConical, Pause, Play, Radio, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useState } from "react";
import { OpinionMap } from "@/components/opinion-map";
import { ProposalRound } from "@/components/proposal-round";
import { Pipeline } from "@/components/simulation/pipeline";
import { ProposalPanel } from "@/components/simulation/proposal-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ConsultationState, useConsultation } from "@/hooks/use-consultation";
import { API_URL, ApiError, getResponseStats, getRoundStatus, submitProposalVote } from "@/lib/api";
import { campColor } from "@/lib/colors";
import { type StageStatus, demoFrame, demoStatuses, DONE_STEP, liveStatuses } from "@/lib/simulation";
import type { ClusterResult, ResponseStats, RoundStatus, Statement } from "@/lib/types";

type Mode = "demo" | "live";

export function SimulationDashboard({ initial }: { initial: ConsultationState }) {
  const [mode, setMode] = useState<Mode>("demo");
  return (
    <div className="board flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Mod" className="inline-flex rounded-xl border border-foreground/15 bg-[var(--glass)] p-1">
          {(["demo", "live"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "text-ink-2 hover:bg-foreground/5"
              }`}
            >
              {m === "demo" ? <FlaskConical className="size-4" /> : <Radio className="size-4" />}
              {m === "demo" ? "DEMO" : "LIVE"}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-2">
          {mode === "demo"
            ? "Date fictive, doar în browser. Nimic nu ajunge la server."
            : API_URL
              ? "Date reale de la server, actualizate live prin WebSocket."
              : "Fără NEXT_PUBLIC_API_URL: aplicația folosește datele ei mock, nu un server real."}
        </p>
      </div>
      {mode === "demo" ? <DemoView /> : <LiveView initial={initial} />}
    </div>
  );
}

const FINAL_VOTES = 36;
type Sim = { step: number; votes: { agree: number; total: number } };

// Final voting (step 9) fills up vote by vote (~2 of 3 agree) before the demo finishes; `skip` jumps to the next stage.
function next(s: Sim, skip: boolean): Sim {
  if (s.step === 9 && s.votes.total < FINAL_VOTES) {
    const add = skip ? FINAL_VOTES - s.votes.total : 1;
    const total = s.votes.total + add;
    const votes = { total, agree: s.votes.agree + (skip ? Math.round((add * 2) / 3) : total % 3 === 0 ? 0 : 1) };
    return { step: skip ? DONE_STEP : s.step, votes };
  }
  return { ...s, step: Math.min(s.step + 1, DONE_STEP) };
}

function DemoView() {
  const [sim, setSim] = useState<Sim>({ step: 0, votes: { agree: 0, total: 0 } });
  const [running, setRunning] = useState(false);
  const done = sim.step === DONE_STEP;
  const playing = running && !done; // the demo stops by itself at the end

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSim((s) => next(s, false)), sim.step === 9 ? 350 : 3200);
    return () => clearInterval(id);
  }, [playing, sim.step]);

  const reset = () => {
    setRunning(false);
    setSim({ step: 0, votes: { agree: 0, total: 0 } });
  };
  const frame = demoFrame(sim.step, sim.votes);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            if (done) setSim({ step: 1, votes: { agree: 0, total: 0 } });
            else if (sim.step === 0) setSim((s) => ({ ...s, step: 1 }));
            setRunning(true);
          }}
          disabled={playing || (sim.step > 0 && !done)}
        >
          <Play /> Pornește simularea
        </Button>
        <Button variant="outline" onClick={() => setRunning(false)} disabled={!playing}>
          <Pause /> Pauză
        </Button>
        <Button variant="outline" onClick={() => setRunning(true)} disabled={playing || sim.step === 0 || done}>
          <Play /> Continuă
        </Button>
        <Button variant="outline" onClick={() => setSim((s) => next(s, true))} disabled={playing || done}>
          <SkipForward /> Pas înainte
        </Button>
        <Button variant="outline" onClick={reset} disabled={sim.step === 0}>
          <RotateCcw /> Resetează
        </Button>
      </div>
      <Layout
        note={frame.note}
        clusters={frame.clusters}
        bridges={frame.bridges}
        statuses={demoStatuses(sim.step)}
        panel={
          <ProposalPanel
            proposal={frame.proposal}
            council={frame.council}
            camps={frame.clusters.camps}
            support={frame.support}
            // demo vote: counted locally only, never sent to the API
            onVote={async (yes) =>
              setSim((s) => ({ ...s, votes: { agree: s.votes.agree + (yes ? 1 : 0), total: s.votes.total + 1 } }))
            }
          />
        }
      />
    </>
  );
}

function LiveView({ initial }: { initial: ConsultationState }) {
  const { clusters, bridges, proposal, support } = useConsultation(initial);
  const [round, setRound] = useState<RoundStatus | null>(null);
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [token, setToken] = useState("");

  // round status is public; the answer queue needs the organizer password
  useEffect(() => {
    const poll = () => {
      getRoundStatus().then(setRound, (err) => console.error("getRoundStatus failed", err));
      if (token.trim())
        getResponseStats(token.trim()).then(setStats, (err) => {
          console.error("getResponseStats failed", err);
          setStats(null);
        });
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [token]);

  async function vote(yes: boolean, critique: string | null) {
    if (!proposal) return;
    try {
      await submitProposalVote({ proposalId: proposal.id, support: yes, critique });
    } catch (err) {
      throw new Error(
        err instanceof ApiError && err.status === 409
          ? "Runda aceasta s-a încheiat. Propunerea nouă apare imediat aici."
          : "Nu am putut trimite votul. Încearcă din nou.",
      );
    }
  }

  return (
    <Layout
      note={round?.state === "running" ? "Mediatorul și Criticul lucrează (30–60 s)…" : "Date reale: se actualizează singure, fără reîncărcare."}
      clusters={clusters}
      bridges={bridges}
      statuses={liveStatuses({ clusters, bridges, proposal, round, stats })}
      panel={
        <>
          <ProposalPanel proposal={proposal} camps={clusters.camps} support={support} onVote={vote} />
          <details className="rounded-xl border border-foreground/15 bg-[var(--glass)] p-4">
            <summary className="cursor-pointer text-sm font-semibold">Organizator: pornește o rundă</summary>
            <div className="mt-3 flex flex-col gap-3">
              <Label htmlFor="sim-token">Parolă organizator (doar pe server)</Label>
              <Input id="sim-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
              <ProposalRound token={token} />
            </div>
          </details>
        </>
      }
    />
  );
}

interface LayoutProps {
  note: string;
  clusters: ClusterResult;
  bridges: Statement[];
  statuses: StageStatus[];
  panel: React.ReactNode;
}

function Layout({ note, clusters, bridges, statuses, panel }: LayoutProps) {
  const color = campColor(clusters.camps);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <div className="flex min-w-0 flex-col gap-4">
        <Card className="board-map">
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm font-medium" aria-live="polite">
              {note}
            </p>
            <OpinionMap clusters={clusters} bridges={bridges.length} />
            <ul className="flex flex-wrap gap-2" aria-label="Tabere">
              <li className="rounded-full bg-foreground/5 px-3 py-1 text-sm">
                <strong className="tabular-nums">{clusters.points.length}</strong> participanți
              </li>
              {clusters.camps.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-sm">
                  <span className="size-2.5 rounded-full" style={{ background: color(c.id) }} aria-hidden />
                  {c.name} · <strong className="tabular-nums">{c.size}</strong>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Pipeline statuses={statuses} />
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20">{panel}</aside>
    </div>
  );
}

