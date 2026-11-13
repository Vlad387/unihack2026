"use client";

import { Lightbulb } from "lucide-react";
import { BarChart, FunnelChart, HBarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import type { Ctx } from "@/components/kpi/kpi-sections-a";
import { ChartCard, Delta, featureColor, fmtNum, fmtTime, Section, Stat } from "@/components/kpi/kpi-ui";
import { avg, change, fmtPct, ratio, sum } from "@/lib/kpi";

export function Quality({ c }: { c: Ctx }) {
  const { analytics, S, P, compare } = c;
  const fs = analytics.features;
  const cmp = (cur: number, prev: number) => (compare ? { cur, prev } : {});
  return (
    <Section n={4} title="Calitate și fiabilitate">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Rată de succes" value={fmtPct(S.successRate, 1)} {...cmp(S.successRate, P.successRate)} />
        <Stat label="Rată de eroare" value={fmtPct(S.errorRate, 2)} invert {...cmp(S.errorRate, P.errorRate)} />
        <Stat label="Operațiuni eșuate" value={fmtNum(S.failed)} invert {...cmp(S.failed, P.failed)} />
        <Stat label="Timp mediu de răspuns" value={`${fmtNum(S.responseMs)} ms`} invert {...cmp(S.responseMs, P.responseMs)} />
        <Stat label="Uptime" value={`${S.uptime.toFixed(2)}%`} {...cmp(S.uptime, P.uptime)} />
        <Stat label="Disponibilitate funcții" value={`${(fs.reduce((a, f) => a + f.availability, 0) / fs.length).toFixed(2)}%`} hint="medie pe funcții" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Timp mediu de răspuns (ms)">
          <LineChart label="Timp mediu de răspuns" labels={c.bks.map((b) => b.label)} series={[{ key: "ms", label: "ms", color: "var(--series-1)", values: c.bks.map((b) => avg(b.days, (d) => d.avg_response_ms)) }]} />
        </ChartCard>
        <ChartCard title="Operațiuni eșuate în timp">
          <LineChart label="Operațiuni eșuate" area labels={c.bks.map((b) => b.label)} series={[{ key: "err", label: "eșuate", color: "var(--series-8)", values: c.bks.map((b) => sum(b.days, (d) => d.errors)) }]} />
        </ChartCard>
        <ChartCard title="Succes vs eroare pe funcție">
          <HBarChart
            maxValue={1}
            data={fs.map((f) => {
              const err = S.featureErrorRate[f.key];
              return { key: f.key, label: f.label, value: 1 - err, display: `${fmtPct(1 - err, 1)} succes · ${fmtPct(err, 1)} erori`, color: featureColor(fs, f.key), dim: c.feature !== "all" && c.feature !== f.key };
            })}
          />
        </ChartCard>
      </div>
    </Section>
  );
}

export function Conversion({ c }: { c: Ctx }) {
  const { analytics, S, P, compare } = c;
  const fs = analytics.features;
  const cmp = (cur: number, prev: number) => (compare ? { cur, prev } : {});
  const sel = c.feature === "all" ? null : fs.find((f) => f.key === c.feature);
  return (
    <Section n={5} title="Conversie și impact">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Rată de activare" value={fmtPct(S.activation)} hint="au intrat → au răspuns" {...cmp(S.activation, P.activation)} />
        <Stat label="Rată de finalizare" value={fmtPct(S.completion)} hint="au răspuns → au votat compromisul" {...cmp(S.completion, P.completion)} />
        <Stat
          label={sel ? `Conversie: ${sel.label}` : "Conversie medie pe funcție"}
          value={fmtPct(sel ? sel.completion : fs.reduce((a, f) => a + f.completion, 0) / fs.length)}
          hint="au început → au terminat"
        />
        <Stat label="Venit pe funcție" value="–" hint="nu se aplică: serviciu public gratuit" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Parcursul participantului (pâlnie)">
          <FunnelChart steps={S.funnel} color="var(--series-1)" />
        </ChartCard>
        <ChartCard title="Rata de conversie pe funcție">
          <BarChart
            label="Rata de conversie pe funcție"
            maxValue={1}
            data={fs.map((f) => ({ key: f.key, label: f.label.split(" ")[0], value: f.completion, display: fmtPct(f.completion), color: featureColor(fs, f.key), dim: c.feature !== "all" && c.feature !== f.key }))}
          />
        </ChartCard>
        <ChartCard title="Tendința conversiei">
          <LineChart
            label="Rata de activare și de finalizare în timp"
            format={(v) => fmtPct(v)}
            yMax={1}
            labels={c.bks.map((b) => b.label)}
            series={[
              { key: "act", label: "Activare", color: "var(--series-1)", values: c.bks.map((b) => ratio(sum(b.days, (d) => d.feature_users.answer), sum(b.days, (d) => d.visits))) },
              { key: "fin", label: "Finalizare", color: "var(--series-2)", values: c.bks.map((b) => ratio(sum(b.days, (d) => d.feature_users.proposal), sum(b.days, (d) => d.feature_users.answer))) },
            ]}
          />
        </ChartCard>
        <ChartCard title="De la utilizare la conversie">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Funcție</th>
                <th className="py-1 text-right font-normal">Utilizări</th>
                <th className="py-1 text-right font-normal">Finalizate</th>
                <th className="py-1 text-right font-normal">Conversie</th>
              </tr>
            </thead>
            <tbody>
              {fs.map((f) => (
                <tr key={f.key} className="border-t">
                  <td className="py-1.5">{f.label}</td>
                  <td className="py-1.5 text-right">{fmtNum(S.uses[f.key])}</td>
                  <td className="py-1.5 text-right">{fmtNum(S.uses[f.key] * f.completion)}</td>
                  <td className="py-1.5 text-right font-semibold">{fmtPct(f.completion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      </div>
    </Section>
  );
}

export function Scorecard({ c }: { c: Ctx }) {
  const { S, P, analytics } = c;
  const citizen = analytics.features.filter((f) => ["answer", "vote", "map", "proposal"].includes(f.key));
  const adoption = (s: typeof S) => citizen.reduce((a, f) => a + s.adoption[f.key], 0) / citizen.length;
  const growth = change(S.dau, P.dau);
  const items = [
    { k: "Utilizare", v: fmtNum(S.featureUsage), cur: S.featureUsage, prev: P.featureUsage },
    { k: "Adopție", v: fmtPct(adoption(S)), cur: adoption(S), prev: adoption(P) },
    { k: "Implicare", v: fmtTime(S.engagementS), cur: S.engagementS, prev: P.engagementS },
    { k: "Retenție", v: fmtPct(S.returning), cur: S.returning, prev: P.returning },
    { k: "Conversie", v: fmtPct(S.activation), cur: S.activation, prev: P.activation },
    { k: "Fiabilitate", v: fmtPct(S.successRate, 1), cur: S.successRate, prev: P.successRate },
    { k: "Performanță", v: `${fmtNum(S.responseMs)} ms`, cur: S.responseMs, prev: P.responseMs, invert: true },
    { k: "Creștere", v: growth === null ? "–" : `${growth > 0 ? "+" : ""}${fmtPct(growth, 1)}` },
  ];
  return (
    <Section n={6} title="Indicatori cheie (KPI)">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.k} className="flex flex-col gap-0.5 rounded-xl border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">{i.k}</p>
            <p className="text-xl font-bold tabular-nums">{i.v}</p>
            {i.cur !== undefined && <Delta cur={i.cur} prev={i.prev} invert={i.invert} />}
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Insights({ c }: { c: Ctx }) {
  const { S, P, analytics } = c;
  const fs = analytics.features;
  const citizen = fs.filter((f) => ["answer", "vote", "map", "proposal"].includes(f.key));
  const by = <T,>(arr: T[], f: (x: T) => number) => [...arr].sort((a, b) => f(b) - f(a));
  const top = by(fs, (f) => S.uses[f.key])[0];
  const fastest = by(fs, (f) => change(S.uses[f.key], P.uses[f.key]) ?? 0)[0];
  const retained = by(fs, (f) => f.retention)[0];
  const lowAdopt = by(citizen, (f) => -S.adoption[f.key])[0];
  const errors = by(fs, (f) => S.featureErrorRate[f.key]).slice(0, 2);
  const g = change(S.uses[fastest.key], P.uses[fastest.key]);
  const cards = [
    { k: "Cea mai performantă funcție", v: top.label, d: `${fmtNum(S.uses[top.key])} utilizări` },
    { k: "Creștere cea mai rapidă", v: fastest.label, d: g === null ? "fără date anterioare" : `${g > 0 ? "+" : ""}${fmtPct(g, 1)} față de perioada anterioară` },
    { k: "Retenție cea mai mare", v: retained.label, d: `${fmtPct(retained.retention)} revin în 7 zile` },
    { k: "Adopție cea mai mică", v: lowAdopt.label, d: `${fmtPct(S.adoption[lowAdopt.key])} din utilizatorii activi` },
    { k: "Rată de eroare cea mai mare", v: errors.map((f) => f.label).join(", "), d: errors.map((f) => fmtPct(S.featureErrorRate[f.key], 1)).join(" · ") },
  ];
  const tips = [
    `Promovează „${lowAdopt.label}”: doar ${fmtPct(S.adoption[lowAdopt.key])} dintre participanți ajung la ea. Un buton mai vizibil la finalul votului poate ajuta.`,
    `Verifică „${errors[0].label}”: are cea mai mare rată de eroare (${fmtPct(S.featureErrorRate[errors[0].key], 1)}).${errors[0].key === "answer" ? " Încărcarea audio pe rețele slabe e suspectul principal." : ""}`,
    S.responseMs > 600
      ? `Timpul mediu de răspuns (${fmtNum(S.responseMs)} ms) e ridicat: mută apelurile AI în fundal.`
      : `Timpul de răspuns e bun (${fmtNum(S.responseMs)} ms). Păstrează apelurile AI în fundal.`,
    `${fmtPct(1 - S.completion)} dintre cei care răspund nu ajung la votul pe compromis. Anunță pe ecranul live când apare propunerea.`,
  ];
  return (
    <Section n={7} title="Concluzii și recomandări">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((x) => (
          <div key={x.k} className="flex flex-col gap-1 rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{x.k}</p>
            <p className="font-semibold">{x.v}</p>
            <p className="text-xs text-muted-foreground">{x.d}</p>
          </div>
        ))}
      </div>
      <ChartCard title="Recomandări">
        <ul className="flex flex-col gap-3">
          {tips.map((t) => (
            <li key={t} className="flex gap-3 text-sm">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-amber" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Recomandări calculate automat din cifrele de mai sus. Timp mediu pe sesiune: {fmtTime(S.engagementS)}.</p>
      </ChartCard>
    </Section>
  );
}
