"use client";

import { useMemo, useState } from "react";
import { BarChart } from "@/components/charts/bar-chart";
import { type Filters, KpiFilters } from "@/components/kpi/kpi-filters";
import { type Ctx, Engagement, FeaturePerformance, Overview } from "@/components/kpi/kpi-sections-a";
import { Conversion, Insights, Quality, Scorecard } from "@/components/kpi/kpi-sections-b";
import { ChartCard, fmtNum, Stat } from "@/components/kpi/kpi-ui";
import { type ConsultationState, useConsultation } from "@/hooks/use-consultation";
import { campColor } from "@/lib/colors";
import { buckets, fmtPct, ratio, scaleDays, sum, summarize, windows } from "@/lib/kpi";
import type { Analytics, Kpis } from "@/lib/types";

const DAY = 86_400_000;
const shift = (iso: string, days: number) => new Date(Date.parse(iso) + days * DAY).toISOString().slice(0, 10);

interface Props {
  kpis: Kpis;
  analytics: Analytics;
  threshold: number;
  initial: ConsultationState;
}

export function KpiDashboard({ kpis, analytics, threshold, initial }: Props) {
  const last = analytics.days.at(-1)?.date ?? "";
  const [f, setF] = useState<Filters>({ range: "30", from: shift(last, -29), to: last, feature: "all", period: "day", compare: true, segment: "all" });
  const set = (p: Partial<Filters>) => setF((old) => ({ ...old, ...p }));

  const ctx: Ctx = useMemo(() => {
    const share = analytics.segments.find((s) => s.key === f.segment)?.share ?? 1;
    const days = scaleDays(analytics.days, share);
    const to = f.range === "custom" ? f.to : last;
    const from = f.range === "custom" ? f.from : shift(last, -(Number(f.range) - 1));
    const { cur, prev } = windows(days, from, to);
    const usersUpTo = (iso: string) => sum(days.filter((d) => d.date <= iso), (d) => d.new_users);
    return {
      analytics,
      S: summarize(cur, analytics.features),
      P: summarize(prev, analytics.features),
      compare: f.compare,
      bks: buckets(cur, f.period),
      prevBks: buckets(prev, f.period),
      feature: f.feature,
      totalUsers: usersUpTo(to),
      prevTotalUsers: prev.length ? usersUpTo(prev.at(-1)!.date) : 0,
    };
  }, [analytics, f, last]);

  return (
    <div className="flex flex-col gap-10">
      <LiveConsultation kpis={kpis} threshold={threshold} initial={initial} />
      <div className="flex flex-col gap-10">
        <KpiFilters f={f} set={set} analytics={analytics} />
        <Overview c={ctx} />
        <FeaturePerformance c={ctx} />
        <Engagement c={ctx} />
        <Quality c={ctx} />
        <Conversion c={ctx} />
        <Scorecard c={ctx} />
        <Insights c={ctx} />
      </div>
    </div>
  );
}

// The consultation running right now, updated live over the WebSocket. Not affected by the date filters.
function LiveConsultation({ kpis, threshold, initial }: { kpis: Kpis; threshold: number; initial: ConsultationState }) {
  const { clusters, support } = useConsultation(initial);
  const participants = clusters.points.length;
  const lastRound = support.at(-1);
  const finalPct = lastRound ? ratio(lastRound.agree, lastRound.total) : 0;
  const color = campColor(clusters.camps);
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
        <span className="size-2 animate-pulse rounded-full bg-brand-amber" aria-hidden /> Consultarea curentă (live)
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Participanți" value={String(participants)} hint="live" />
        <Stat label="Voturi pe afirmații" value={fmtNum(kpis.votes)} hint={`${(kpis.votes / Math.max(1, participants)).toFixed(1)} / participant`} />
        <Stat label={`Sprijin runda ${lastRound?.round ?? "–"}`} value={fmtPct(finalPct)} hint={finalPct >= threshold ? `✓ peste pragul de ${fmtPct(threshold)}` : `✗ sub pragul de ${fmtPct(threshold)}`} />
        <Stat label="Cost AI (Gemini)" value={`$${kpis.ai.cost_usd.toFixed(2)}`} hint={`${kpis.ai.calls} apeluri · ${(kpis.ai.avg_latency_ms / 1000).toFixed(1)} s medie`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Sprijin pe runde" note="Doar voturi reale. Opiniile simulate de AI nu sunt numărate.">
          <BarChart
            label="Sprijin pe runde"
            maxValue={1}
            reference={{ value: threshold, label: `prag ${fmtPct(threshold)}` }}
            data={support.map((r) => ({ key: String(r.round), label: `Runda ${r.round}`, value: ratio(r.agree, r.total), display: fmtPct(ratio(r.agree, r.total)), color: "var(--series-1)" }))}
          />
        </ChartCard>
        <ChartCard title="Mărimea taberelor">
          <BarChart
            label="Mărimea taberelor"
            maxValue={Math.max(1, ...clusters.camps.map((c) => c.size))}
            data={clusters.camps.map((c) => ({ key: c.id, label: c.name.split(" ")[0], value: c.size, display: String(c.size), color: color(c.id) }))}
          />
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {clusters.camps.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ background: color(c.id) }} aria-hidden />
                {c.name}
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </section>
  );
}
