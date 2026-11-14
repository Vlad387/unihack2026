"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { ProxyVoices } from "@/components/proxy-voices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { VerdictView } from "@/components/verdict";
import { campColor } from "@/lib/colors";
import type { Camp, Proposal, SupportRound } from "@/lib/types";

interface Props {
  proposal: Proposal | null;
  // demo: fictional text or null until step 7; live: undefined, because the API has no "original proposal" yet
  council?: string | null;
  camps: Camp[];
  support: SupportRound[];
  // demo counts locally, live posts to /proposal-votes; throws to show the message to the voter
  onVote: (support: boolean, critique: string | null) => Promise<void>;
}

const pct = (r: SupportRound) => (r.total ? Math.round((r.agree / r.total) * 100) : 0);

// Persistent sidebar: council proposal → AI compromise → tradeoffs → critic → live results → vote.
export function ProposalPanel({ proposal, council, camps, support, onVote }: Props) {
  const [critique, setCritique] = useState("");
  const [votedRound, setVotedRound] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const color = campColor(camps);
  const campName = (id: string) => camps.find((c) => c.id === id)?.name ?? "Tabără";

  async function vote(yes: boolean) {
    if (!proposal) return;
    setSending(true);
    setError(null);
    try {
      await onVote(yes, critique.trim() || null);
      setVotedRound(proposal.round);
      setCritique("");
    } catch (err) {
      // keep the critique so the voter can retry
      console.error("proposal vote failed", err);
      setError(err instanceof Error ? err.message : "Nu am putut trimite votul.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Propunerea inițială a primăriei</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {council === undefined ? (
            <p className="text-muted-foreground">Nu există încă în API: consultarea și propunerea primăriei sunt doar în date mock.</p>
          ) : council ? (
            <p>{council}</p>
          ) : (
            <p className="text-muted-foreground">Apare când organizatorul pornește runda.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{proposal ? `Compromisul · runda ${proposal.round}` : "Compromisul AI"}</CardTitle>
          {proposal && (
            <Badge variant="secondary" className="font-normal">
              Generat de AI
            </Badge>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          {!proposal && <p className="text-muted-foreground">Mediatorul scrie compromisul după ce organizatorul pornește runda.</p>}
          {proposal && (
            <>
              <p className="text-base">{proposal.text}</p>
              <ul className="flex flex-col gap-2">
                {proposal.tradeoffs.map((t) => (
                  <li key={t.camp_id} className="rounded-lg border-l-4 bg-foreground/[0.03] p-2.5" style={{ borderLeftColor: color(t.camp_id) }}>
                    <p className="font-semibold">{campName(t.camp_id)}</p>
                    <p>
                      <span className="text-emerald-700 dark:text-emerald-400">Câștigă:</span> {t.gains}
                    </p>
                    <p>
                      <span className="text-rose-700 dark:text-rose-400">Cedează:</span> {t.gives_up}
                    </p>
                  </li>
                ))}
              </ul>
              {proposal.verdict && <VerdictView verdict={proposal.verdict} />}
              <ProxyVoices proxies={proposal.proxies} compact />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vot live</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {support.length === 0 && <p className="text-muted-foreground">Încă nu s-a votat nicio propunere.</p>}
          {support.map((r) => (
            <div key={r.round} className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Runda {r.round}</span>
                <span className="tabular-nums">
                  <strong>{pct(r)}%</strong> susțin · {r.total} {r.total === 1 ? "vot" : "voturi"}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-emerald-600 transition-all duration-700" style={{ width: `${pct(r)}%` }} />
              </div>
            </div>
          ))}

          {proposal &&
            (votedRound === proposal.round ? (
              <p className="font-medium" aria-live="polite">
                Mulțumim pentru vot! Criticile intră în runda următoare.
              </p>
            ) : (
              <div className="flex flex-col gap-2 border-t pt-3">
                <Textarea
                  aria-label="Ce ai schimba? (opțional)"
                  placeholder="Ce ai schimba? (opțional)"
                  rows={2}
                  maxLength={1000}
                  value={critique}
                  onChange={(e) => setCritique(e.target.value)}
                />
                {error && <p className="text-destructive">{error}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={sending} onClick={() => vote(true)}>
                    <ThumbsUp /> Susțin
                  </Button>
                  <Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={sending} onClick={() => vote(false)}>
                    <ThumbsDown /> Nu susțin
                  </Button>
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
