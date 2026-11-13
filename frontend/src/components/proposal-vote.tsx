"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { campColor } from "@/lib/colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ConsultationState, useConsultation } from "@/hooks/use-consultation";
import { getMyPosition, submitProposalVote } from "@/lib/api";

export function ProposalVote({ initial }: { initial: ConsultationState }) {
  const { clusters, proposal } = useConsultation(initial);
  const [myCamp, setMyCamp] = useState<string | null>(null);
  const [critique, setCritique] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  // keyed by round: a newly published proposal reopens the vote without an effect
  const [votedRound, setVotedRound] = useState<number | null>(null);

  useEffect(() => {
    getMyPosition()
      .then((p) => setMyCamp(p?.camp_id ?? null))
      .catch((err) => console.error("getMyPosition failed", err));
  }, []);

  if (!proposal) {
    return <p className="text-center text-muted-foreground">Mediatorul pregătește propunerea. Revino în câteva minute.</p>;
  }

  const color = campColor(clusters.camps);
  const campName = (id: string) => clusters.camps.find((c) => c.id === id)?.name ?? "Tabără";

  async function vote(support: boolean) {
    if (!proposal) return;
    setSending(true);
    setError(false);
    try {
      await submitProposalVote({ proposalId: proposal.id, support, critique: critique.trim() || null });
      setVotedRound(proposal.round);
      setCritique("");
    } catch (err) {
      // keep the critique text so the citizen can retry
      console.error("submitProposalVote failed", err);
      setError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Propunerea · runda {proposal.round}</CardTitle>
          <Badge variant="secondary" className="font-normal">
            Generat de AI
          </Badge>
        </CardHeader>
        <CardContent>
          <p className="text-lg">{proposal.text}</p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Ce câștigă și ce cedează fiecare tabără</h2>
        {proposal.tradeoffs.map((t) => (
          <div
            key={t.camp_id}
            className="rounded-lg border-l-4 bg-card p-3 text-sm shadow-sm"
            style={{ borderLeftColor: color(t.camp_id) }}
          >
            <p className="mb-1 font-semibold">
              {campName(t.camp_id)}
              {t.camp_id === myCamp && <span className="ml-2 text-xs font-normal text-muted-foreground">(tabăra ta)</span>}
            </p>
            <p>
              <span className="text-emerald-700 dark:text-emerald-400">Câștigă:</span> {t.gains}
            </p>
            <p>
              <span className="text-rose-700 dark:text-rose-400">Cedează:</span> {t.gives_up}
            </p>
          </div>
        ))}
      </section>

      {votedRound === proposal.round ? (
        <div className="flex flex-col items-center gap-2 text-center" aria-live="polite">
          <p className="text-2xl font-semibold">Mulțumim pentru vot! 🗳️</p>
          <p className="text-muted-foreground">
            Dacă propunerea nu trece pragul, mediatorul o rescrie ținând cont de critici. Runda nouă apare aici.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="critique">Ce ai schimba? (opțional)</Label>
            <Textarea
              id="critique"
              rows={3}
              maxLength={1000}
              placeholder="De exemplu: weekendul ar trebui să se încheie la 01:00."
              value={critique}
              onChange={(e) => setCritique(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">Nu am putut trimite votul. Încearcă din nou.</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-14 bg-emerald-600 text-base text-white hover:bg-emerald-700"
              disabled={sending}
              onClick={() => vote(true)}
            >
              <ThumbsUp /> Susțin
            </Button>
            <Button
              size="lg"
              className="h-14 bg-rose-600 text-base text-white hover:bg-rose-700"
              disabled={sending}
              onClick={() => vote(false)}
            >
              <ThumbsDown /> Nu susțin
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
