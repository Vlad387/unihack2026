"use client";

import { Bot, CheckCircle2, XCircle } from "lucide-react";
import { BarChart, ParticipationChart } from "@/components/kpi-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ConsultationState, useConsultation } from "@/hooks/use-consultation";
import { campColor } from "@/lib/colors";
import type { Kpis } from "@/lib/types";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

const pct = (agree: number, total: number) => (total ? Math.round((agree / total) * 100) : 0);

export function KpiDashboard({ kpis, threshold, initial }: { kpis: Kpis; threshold: number; initial: ConsultationState }) {
  const { clusters, support } = useConsultation(initial);
  const participants = clusters.points.length;
  const last = support.at(-1);
  const finalPct = last ? pct(last.agree, last.total) : 0;
  const thresholdPct = Math.round(threshold * 100);
  const passed = finalPct >= thresholdPct;
  const color = campColor(clusters.camps);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Participanți" value={participants} hint="live" />
        <Stat label="Voturi pe afirmații" value={kpis.votes} hint={`${(kpis.votes / Math.max(1, participants)).toFixed(1)} / participant`} />
        <Stat label="Afirmații extrase de AI" value={kpis.statements} hint={`din ${kpis.responses} răspunsuri`} />
        <Card className="gap-1 py-4">
          <CardContent className="px-4">
            <p className="text-3xl font-bold tracking-tight tabular-nums">{finalPct}%</p>
            <p className="text-sm text-muted-foreground">Sprijin în runda {last?.round ?? "–"}</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-medium">
              {passed ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <XCircle className="size-3.5 text-rose-600" />}
              {passed ? `peste pragul de ${thresholdPct}%` : `sub pragul de ${thresholdPct}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Participanți în timp</CardTitle>
          </CardHeader>
          <CardContent>
            <ParticipationChart data={kpis.timeline} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sprijin pe runde</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              maxValue={100}
              reference={{ value: thresholdPct, label: `prag ${thresholdPct}%` }}
              data={support.map((r) => ({
                key: String(r.round),
                label: `Runda ${r.round}`,
                value: pct(r.agree, r.total),
                display: `${pct(r.agree, r.total)}%`,
                color: "var(--series-1)",
              }))}
            />
            <p className="mt-2 text-xs text-muted-foreground">Doar voturi reale. Opiniile simulate de AI nu sunt numărate.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mărimea taberelor</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              maxValue={Math.max(1, ...clusters.camps.map((c) => c.size))}
              data={clusters.camps.map((c) => ({
                key: c.id,
                label: c.name.split(" ")[0],
                value: c.size,
                display: String(c.size),
                color: color(c.id),
              }))}
            />
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {clusters.camps.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ background: color(c.id) }} aria-hidden />
                  {c.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bot className="size-4 text-primary" /> AI (Gemini)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Apeluri AI" value={kpis.ai.calls} />
            <Stat label="Latență medie" value={`${(kpis.ai.avg_latency_ms / 1000).toFixed(1)} s`} />
            <Stat label="Cost total" value={`$${kpis.ai.cost_usd.toFixed(2)}`} hint={`$${(kpis.ai.cost_usd / Math.max(1, participants)).toFixed(3)} / participant`} />
            <Stat label="Semnalate la moderare" value={kpis.flagged} />
          </div>
        </section>
      </div>

      <details className="rounded-xl border bg-card p-4 text-sm">
        <summary className="cursor-pointer font-medium">Vezi datele ca tabel</summary>
        <table className="mt-3 w-full tabular-nums">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1 font-normal">Minut</th>
              <th className="py-1 text-right font-normal">Participanți</th>
            </tr>
          </thead>
          <tbody>
            {kpis.timeline.map((d) => (
              <tr key={d.minute} className="border-t">
                <td className="py-1">{d.minute}</td>
                <td className="py-1 text-right">{d.participants}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
