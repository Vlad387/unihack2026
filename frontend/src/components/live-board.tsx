"use client";

import { Brand } from "@/components/brand";
import { VerdictView } from "@/components/verdict";
import { JoinQr } from "@/components/join-qr";
import { OpinionMap } from "@/components/opinion-map";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { campColor } from "@/lib/colors";
import { type ConsultationState, useConsultation } from "@/hooks/use-consultation";

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

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[1fr_400px]">
      <section className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-4 lg:flex-nowrap">
          <div>
            <p className="flex items-center gap-3 text-sm">
              <Brand className="text-base" />
              <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-brand-amber">
                <span className="size-2 animate-pulse rounded-full bg-brand-amber" aria-hidden /> Live
              </span>
            </p>
            <h1 className="text-2xl font-bold lg:text-4xl">{question}</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right" aria-live="polite">
              <p className="text-4xl font-bold tabular-nums lg:text-6xl">{clusters.points.length}</p>
              <p className="text-sm text-muted-foreground">participanți</p>
            </div>
            <div className="hidden lg:block">
              <JoinQr size={110} />
            </div>
          </div>
        </header>
        <Card className="flex-1">
          <CardContent>
            <OpinionMap clusters={clusters} />
          </CardContent>
        </Card>
      </section>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tabere</CardTitle>
            <AiBadge />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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
              <p key={b.id} className="rounded-lg bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
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
              <p>{proposal.text}</p>
              {proposal.verdict && (
                <div className="mt-3">
                  <VerdictView verdict={proposal.verdict} />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sprijin pe runde</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {support.length === 0 && <p className="text-sm text-muted-foreground">Încă nu s-a votat nicio propunere.</p>}
            {support.map((r) => {
              const pct = r.total ? Math.round((r.agree / r.total) * 100) : 0;
              return (
                <div key={r.round} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>Runda {r.round}</span>
                    <span className="tabular-nums">
                      <strong>{pct}%</strong> · {r.total} voturi
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-emerald-600 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
