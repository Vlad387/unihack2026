"use client";

import { Brand } from "@/components/brand";
import { ProxyVoices } from "@/components/proxy-voices";
import { VerdictView } from "@/components/verdict";
import { JoinQr } from "@/components/join-qr";
import { OpinionMap } from "@/components/opinion-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { campColor } from "@/lib/colors";
import { type ConsultationState, useConsultation } from "@/hooks/use-consultation";
import type { SupportRound } from "@/lib/types";

// Romanian plural: 0 voturi, 1 vot, 2–19 voturi, 20+ "de voturi" (except when the last two digits are 01–19)
const votes = (n: number) => (n === 1 ? "1 vot" : n === 0 || (n % 100 >= 1 && n % 100 <= 19) ? `${n} voturi` : `${n} de voturi`);

// Long AI proposals are hard to read from far away: the first sentence leads (bold), and the concrete facts
// (times, durations, percentages) are highlighted inside the rest.
const FACT = /(\d{1,2}:\d{2}|\d+\s?(?:%|lei|luni|zile|ore|săptămâni)|trei luni|program-pilot|weekend)/gi;
function ProposalText({ text }: { text: string }) {
  const [, lead = text, rest = ""] = text.match(/^(.+?[.!?])\s+([\s\S]*)$/) ?? [];
  const facts = (t: string) =>
    t.split(FACT).map((part, i) =>
      i % 2 ? (
        <mark key={i} className="rounded bg-[var(--cyan)]/15 px-1 font-semibold text-foreground">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  return (
    <div className="flex flex-col gap-2">
      <p className="text-lg leading-snug font-semibold">{facts(lead)}</p>
      {rest && <p className="text-ink-2">{facts(rest)}</p>}
    </div>
  );
}

const pct = (r: SupportRound) => (r.total ? Math.round((r.agree / r.total) * 100) : 0);
const BAR = "bg-[linear-gradient(90deg,oklch(58%_0.25_300),oklch(68%_0.15_235))]";

// The round's outcome is what the room waits for: the current round is one big number, earlier rounds stay small.
function SupportCard({ support }: { support: SupportRound[] }) {
  const now = support.at(-1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sprijin pe runde</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3" aria-live="polite">
        {!now && <p className="text-sm text-muted-foreground">Încă nu s-a votat nicio propunere.</p>}
        {now && (
          <div className="flex flex-col gap-2">
            <p className="flex items-baseline justify-between gap-3">
              <span className="bg-[linear-gradient(90deg,var(--cyan),oklch(55%_0.17_245))] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent tabular-nums">
                {pct(now)}%
              </span>
              <span className="text-right text-sm text-muted-foreground">
                susțin runda {now.round}
                <br />
                {votes(now.total)} reale
              </span>
            </p>
            <div className="h-4 overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${BAR} transition-all duration-700`} style={{ width: `${pct(now)}%` }} />
            </div>
          </div>
        )}
        {support.slice(0, -1).reverse().map((r) => (
          <div key={r.round} className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="w-16 shrink-0">Runda {r.round}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={`h-full ${BAR} opacity-60`} style={{ width: `${pct(r)}%` }} />
            </div>
            <span className="w-10 text-right tabular-nums">{pct(r)}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AiBadge() {
  return (
    <Badge variant="secondary" className="font-normal">
      Generat de AI
    </Badge>
  );
}

export function LiveBoard({ question, initial }: { question: string; initial: ConsultationState }) {
  const { clusters, bridges, proposal, support } = useConsultation(initial);
  const color = campColor(clusters.camps);

  // Map first and as large as possible (top-left); everything else lives in the right column, starting with
  // the identity block (logo, live, question, participants, QR) so the projector reads at a glance.
  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
      <Card className="board-map lg:sticky lg:top-6">
        <CardContent>
          {/* capped to the screen height (map is 800x560), so it never fills the whole projector */}
          <div className="mx-auto w-full max-w-[calc((100dvh-9rem)*1.43)]">
            <OpinionMap clusters={clusters} />
          </div>
        </CardContent>
      </Card>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <Brand className="text-base" />
              <span className="flex items-center gap-1.5 text-sm font-semibold tracking-wider text-[var(--cyan)] uppercase">
                <span className="size-2 animate-pulse rounded-full bg-[var(--cyan)]" aria-hidden /> Live
              </span>
            </div>
            <h1 className="text-xl leading-snug font-bold text-balance">{question}</h1>
            <div className="flex items-center justify-between gap-4">
              <div aria-live="polite">
                <p className="text-5xl font-bold tabular-nums">{clusters.points.length}</p>
                <p className="text-sm text-muted-foreground">participanți</p>
              </div>
              <JoinQr size={110} />
            </div>
          </CardContent>
        </Card>

        <SupportCard support={support} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tabere</CardTitle>
            <AiBadge />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {clusters.camps.length === 0 && (
              <p className="text-sm text-muted-foreground">Taberele apar când votează mai mulți oameni.</p>
            )}
            {clusters.camps.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: color(c.id) }} />
                <div className="flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
                <span className="font-semibold tabular-nums">{c.size}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Puncte comune</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {bridges.length === 0 && <p className="text-sm text-muted-foreground">Încă le căutăm…</p>}
            {bridges.map((b) => (
              <p key={b.id} className="rounded-lg bg-primary/10 p-3 text-ink-2 ring-1 ring-primary/25">
                „{b.text}”
              </p>
            ))}
          </CardContent>
        </Card>

        {proposal && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Propunerea · runda {proposal.round}</CardTitle>
              <AiBadge />
            </CardHeader>
            <CardContent>
              <ProposalText text={proposal.text} />
              {proposal.verdict && (
                <div className="mt-3">
                  <VerdictView verdict={proposal.verdict} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* simulated voices in their own clearly-different box: never part of the proposal's votes */}
        {!!proposal?.proxies?.length && (
          <section className="rounded-xl border-2 border-dashed border-foreground/25 bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--violet)_10%,var(--carbon))_0_12px,color-mix(in_oklch,var(--violet)_4%,var(--carbon))_12px_24px)] p-4">
            <ProxyVoices proxies={proposal.proxies} compact />
          </section>
        )}

      </aside>
    </div>
  );
}
