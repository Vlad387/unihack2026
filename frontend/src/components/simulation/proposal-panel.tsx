"use client";

import { Minus, Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { ProxyVoices } from "@/components/proxy-voices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VerdictView } from "@/components/verdict";
import { campColor } from "@/lib/colors";
import type { Camp, Proposal, SupportRound, Verdict } from "@/lib/types";

const card = "rounded-2xl border border-foreground/10 bg-[var(--glass)] p-5";
const heading = "text-sm font-semibold tracking-wide text-ink-3 uppercase";

// The round's headline, shown on top of the map: the AI compromise, else the council's proposal, else the question.
export function RoundTitle({ proposal, council, question }: { proposal: Proposal | null; council?: string | null; question: string }) {
  const [label, text] = proposal
    ? [`Runda ${proposal.round} · compromisul propus`, proposal.text]
    : council
      ? ["Runda 1 · propunerea primăriei", council]
      : ["Întrebarea consultării", question];
  return (
    <header className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-2 font-mono text-meta tracking-[0.12em] text-[var(--cyan)] uppercase">
        {label}
        {proposal && (
          <Badge variant="secondary" className="font-sans font-normal tracking-normal normal-case">
            Generat de AI
          </Badge>
        )}
      </p>
      <h2 className={`font-semibold text-balance ${proposal || council ? "text-lg leading-snug sm:text-xl" : "text-2xl leading-tight sm:text-3xl"}`}>
        {text}
      </h2>
    </header>
  );
}

// Right column, under the process: the critic agent's checks.
export function ChecksCard({ verdict }: { verdict?: Verdict | null }) {
  return (
    <section className={card}>
      <h3 className={`mb-3 ${heading}`}>Verificările AI</h3>
      {verdict ? <VerdictView verdict={verdict} /> : <p className="text-sm text-ink-3">Apar după ce Mediatorul scrie compromisul.</p>}
    </section>
  );
}

interface DetailsProps {
  proposal: Proposal | null;
  // demo: fictional text or null until step 7; live: undefined, because the API has no "original proposal" yet
  council?: string | null;
  camps: Camp[];
  support: SupportRound[];
  // demo counts locally, live posts to /proposal-votes; throws to show the message to the voter
  onVote: (support: boolean, critique: string | null) => Promise<void>;
}

// Under the map: what each camp gains and gives up, the vote, and the context (council proposal, simulated voices).
export function RoundDetails({ proposal, council, camps, support, onVote }: DetailsProps) {
  const [critique, setCritique] = useState("");
  const [votedRound, setVotedRound] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const color = campColor(camps);

  if (!proposal) {
    return (
      <section className={`${card} text-center`}>
        <p className="font-semibold">Aici apare compromisul</p>
        <p className="mt-1 text-sm text-ink-3">După ce organizatorul pornește runda, vezi ce câștigă fiecare tabără și poți vota.</p>
      </section>
    );
  }

  const now = support.find((r) => r.round === proposal.round);
  const pct = now?.total ? Math.round((now.agree / now.total) * 100) : 0;

  async function vote(yes: boolean) {
    setSending(true);
    setError(null);
    try {
      await onVote(yes, critique.trim() || null);
      setVotedRound(proposal?.round ?? null);
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
      <section>
        <h3 className={`mb-3 ${heading}`}>Ce câștigă și ce cedează fiecare tabără</h3>
        <ul className="grid gap-3 md:grid-cols-3">
          {proposal.tradeoffs.map((t) => (
            <li key={t.camp_id} className={`${card} border-t-4 p-4`} style={{ borderTopColor: color(t.camp_id) }}>
              <p className="mb-2 font-semibold">{camps.find((c) => c.id === t.camp_id)?.name ?? "Tabără"}</p>
              <p className="flex gap-2 text-sm">
                <Plus className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Câștigă" />
                {t.gains}
              </p>
              <p className="mt-1.5 flex gap-2 text-sm text-ink-2">
                <Minus className="mt-0.5 size-4 shrink-0 text-rose-600" aria-label="Cedează" />
                {t.gives_up}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className={card} aria-live="polite">
          <h3 className={heading}>Votul pe compromis</h3>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold tracking-tight tabular-nums">{pct}%</span>
            <span className="text-sm text-ink-3">
              susțin · {now?.total ?? 0} {now?.total === 1 ? "vot" : "voturi"} {council === undefined ? "(doar voturi reale)" : "(fictive)"}
            </span>
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full rounded-full bg-emerald-600 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          {votedRound === proposal.round ? (
            <p className="mt-4 text-sm font-medium">Mulțumim! Criticile intră în runda următoare.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={sending} onClick={() => vote(true)}>
                  <ThumbsUp /> Susțin
                </Button>
                <Button className="bg-rose-600 text-white hover:bg-rose-700" disabled={sending} onClick={() => vote(false)}>
                  <ThumbsDown /> Nu susțin
                </Button>
              </div>
              <details>
                <summary className="cursor-pointer text-sm text-ink-3">Adaugă o critică (opțional)</summary>
                <Textarea
                  className="mt-2"
                  aria-label="Ce ai schimba?"
                  placeholder="Ce ai schimba? De exemplu: weekendul ar trebui să se încheie la 01:00."
                  rows={2}
                  maxLength={1000}
                  value={critique}
                  onChange={(e) => setCritique(e.target.value)}
                />
              </details>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </section>

        <section className={`${card} flex flex-col gap-4`}>
          <div>
            <h3 className={heading}>De unde a pornit</h3>
            <p className="mt-2 text-sm">
              {council === undefined ? (
                <span className="text-ink-3">Propunerea inițială a primăriei nu există încă în API.</span>
              ) : (
                council
              )}
            </p>
          </div>
          <ProxyVoices proxies={proposal.proxies} compact />
        </section>
      </div>
    </div>
  );
}
