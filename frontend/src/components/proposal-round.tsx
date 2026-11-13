"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, getProposal, getRoundStatus, startProposalRound } from "@/lib/api";

const POLL_MS = 2000;

type View = { state: "idle" } | { state: "running"; seconds: number } | { state: "done"; round: number } | { state: "failed"; error: string };

// Organizer starts a compromise round; mediate + critic run 25–60 s on the server, so we poll the status.
export function ProposalRound() {
  const [token, setToken] = useState("");
  const [view, setView] = useState<View>({ state: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const started = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function poll() {
    timer.current = setTimeout(async () => {
      try {
        const s = await getRoundStatus();
        if (s.state === "running") {
          setView({ state: "running", seconds: Math.round((Date.now() - started.current) / 1000) });
          poll();
        } else if (s.state === "failed") {
          setView({ state: "failed", error: s.error ?? "Eroare necunoscută." });
        } else {
          const p = await getProposal();
          setView({ state: "done", round: p?.round ?? 0 });
        }
      } catch (err) {
        // network blip while polling: keep trying, the round keeps running on the server
        console.error("getRoundStatus failed", err);
        poll();
      }
    }, POLL_MS);
  }

  async function start() {
    clearTimeout(timer.current);
    started.current = Date.now();
    setView({ state: "running", seconds: 0 });
    try {
      await startProposalRound(token.trim() || null);
      poll();
    } catch (err) {
      console.error("startProposalRound failed", err);
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 409) {
        // someone already started a round: follow that one instead of failing
        poll();
        return;
      }
      setView({
        state: "failed",
        error: status === 401 ? "Parola de organizator e greșită sau lipsește." : "Nu am putut porni runda. Verifică conexiunea și încearcă din nou.",
      });
    }
  }

  const running = view.state === "running";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Runda de compromis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Mediatorul AI scrie o propunere din taberele și punctele comune de pe hartă, plus criticile rundei anterioare. Durează
          30–60 de secunde, apoi apare live pe toate ecranele. Ai nevoie de câțiva participanți care au răspuns și au votat.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-token">Parolă organizator (doar pe server)</Label>
          <Input id="org-token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className="max-w-xs" />
        </div>
        <Button onClick={start} disabled={running} className="w-fit">
          {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {running ? "Se generează…" : "Generează propunerea"}
        </Button>
        <div className="text-sm" aria-live="polite">
          {view.state === "running" && <span className="text-muted-foreground">AI-ul lucrează… {view.seconds} s</span>}
          {view.state === "done" && (
            <span className="text-emerald-700 dark:text-emerald-400">Propunerea pentru runda {view.round} e publicată pe toate ecranele.</span>
          )}
          {view.state === "failed" && (
            <span className="flex flex-col gap-1 text-destructive">
              {/429|quota/i.test(view.error)
                ? "Runda a eșuat: limita gratuită Gemini s-a terminat pentru azi. Folosiți altă cheie sau un plan plătit, apoi încercați din nou."
                : view.error.includes("at least one camp")
                  ? "Runda a eșuat: încă nu există tabere pe hartă. Lăsați câțiva participanți să răspundă și să voteze."
                  : "Runda a eșuat. Puteți încerca din nou."}
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Detalii tehnice</summary>
                <span className="break-words">{view.error}</span>
              </details>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
