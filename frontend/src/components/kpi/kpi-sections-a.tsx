"use client";

import { BarChart, HBarChart } from "@/components/charts/bar-chart";
import { Legend } from "@/components/charts/chart-tooltip";
import { LineChart } from "@/components/charts/line-chart";
import { ChartCard, Delta, featureColor, fmtNum, fmtTime, Section, Stat } from "@/components/kpi/kpi-ui";
import { avg, change, fmtDate, fmtPct, sum, type Summary } from "@/lib/kpi";
import type { Analytics, DayStats, FeatureKey } from "@/lib/types";

export interface Ctx {
  analytics: Analytics;
  S: Summary;
  P: Summary;
  compare: boolean;
  bks: { label: string; days: DayStats[] }[];
  prevBks: { label: string; days: DayStats[] }[];
  feature: "all" | FeatureKey;
  totalUsers: number;
  prevTotalUsers: number;
}

export function Overview({ c }: { c: Ctx }) {
  const { S, P, compare } = c;
  const growth = change(S.dau, P.dau);
  const cmp = (cur: number, prev: number) => (compare ? { cur, prev } : {});
  return (
    <Section n={1} title="Privire generală">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Utilizatori totali" value={fmtNum(c.totalUsers)} {...cmp(c.totalUsers, c.prevTotalUsers)} />
        <Stat label="Activi (DAU medie)" value={fmtNum(S.dau)} hint={`WAU ${fmtNum(S.wau)} · MAU ${fmtNum(S.mau)}`} {...cmp(S.dau, P.dau)} />
        <Stat label="Utilizări funcții" value={fmtNum(S.featureUsage)} {...cmp(S.featureUsage, P.featureUsage)} />
        <Stat label="Interacțiuni" value={fmtNum(S.interactions)} {...cmp(S.interactions, P.interactions)} />
        <Stat label="Timp mediu / sesiune" value={fmtTime(S.engagementS)} {...cmp(S.engagementS, P.engagementS)} />
        <Stat label="Rată de creștere" value={growth === null ? "–" : `${growth > 0 ? "+" : ""}${fmtPct(growth, 1)}`} hint="DAU vs perioada anterioară" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Creștere: utilizatori activi">
            <LineChart
              label="Utilizatori activi pe perioadă"
              area
              labels={c.bks.map((b) => b.label)}
              series={[
                { key: "cur", label: "Perioada curentă", color: "var(--series-1)", values: c.bks.map((b) => avg(b.days, (d) => d.dau)) },
                ...(compare
                  ? [{ key: "prev", label: "Perioada anterioară", color: "var(--muted-foreground)", dashed: true, values: c.prevBks.map((b) => avg(b.days, (d) => d.dau)) }]
                  : []),
              ]}
            />
          </ChartCard>
        </div>
        <ChartCard title="Statistici de utilizare">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Vizite (QR / site)", fmtNum(S.funnel[0].value)],
              ["Utilizatori noi", fmtNum(S.newUsers)],
              ["Sesiuni / utilizator", S.sessionsPerUser.toFixed(2)],
              ["Utilizatori care revin", fmtPct(S.returning)],
              ["Interacțiuni / zi", fmtNum(S.interactions / Math.max(1, c.bks.flatMap((b) => b.days).length))],
              ["Rată de succes", fmtPct(S.successRate, 1)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-lg font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </ChartCard>
      </div>
    </Section>
  );
}

export function FeaturePerformance({ c }: { c: Ctx }) {
  const { analytics, S, P, feature } = c;
  const fs = analytics.features;
  const shown = feature === "all" ? fs : fs.filter((f) => f.key === feature);
  const ranked = [...fs].sort((a, b) => S.uses[b.key] - S.uses[a.key]);
  const dim = (k: FeatureKey) => feature !== "all" && feature !== k;
  return (
    <Section n={2} title="Performanța funcțiilor">
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Utilizări pe funcție">
          <BarChart
            label="Utilizări pe funcție"
            maxValue={Math.max(...fs.map((f) => S.uses[f.key]))}
            data={fs.map((f) => ({ key: f.key, label: f.label.split(" ")[0], value: S.uses[f.key], display: fmtNum(S.uses[f.key]), color: featureColor(fs, f.key), dim: dim(f.key) }))}
          />
          <Legend shape="box" items={fs.map((f) => ({ label: f.label, color: featureColor(fs, f.key) }))} />
        </ChartCard>
        <ChartCard title="Utilizarea funcțiilor în timp">
          <LineChart
            label="Utilizarea funcțiilor în timp"
            labels={c.bks.map((b) => b.label)}
            series={shown.map((f) => ({ key: f.key, label: f.label, color: featureColor(fs, f.key), values: c.bks.map((b) => sum(b.days, (d) => d.feature_uses[f.key])) }))}
          />
        </ChartCard>
        <ChartCard title="Rata de adopție (% din utilizatorii activi)">
          <HBarChart
            maxValue={1}
            data={fs.map((f) => ({ key: f.key, label: f.label, value: S.adoption[f.key], display: fmtPct(S.adoption[f.key]), color: featureColor(fs, f.key), dim: dim(f.key) }))}
          />
        </ChartCard>
        <ChartCard title="Clasament funcții">
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2 font-normal">#</th>
                  <th className="py-1 pr-2 font-normal">Funcție</th>
                  <th className="py-1 pr-2 text-right font-normal">Utilizări</th>
                  <th className="py-1 pr-2 text-right font-normal">Unici/zi</th>
                  <th className="py-1 text-right font-normal">Tendință</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((f, i) => (
                  <tr key={f.key} className={`border-t ${dim(f.key) ? "opacity-40" : ""}`}>
                    <td className="py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-1.5 pr-2">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ background: featureColor(fs, f.key) }} aria-hidden />
                        {f.label}
                        {i === 0 && <span className="rounded bg-secondary px-1.5 text-xs text-secondary-foreground">cea mai folosită</span>}
                        {i === ranked.length - 1 && <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">cea mai puțin folosită</span>}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 text-right font-semibold">{fmtNum(S.uses[f.key])}</td>
                    <td className="py-1.5 pr-2 text-right">{fmtNum(S.users[f.key])}</td>
                    <td className="py-1.5 text-right">
                      <Delta cur={S.uses[f.key]} prev={P.uses[f.key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </Section>
  );
}

export function Engagement({ c }: { c: Ctx }) {
  const { analytics, S, P, compare } = c;
  const fs = analytics.features;
  const cmp = (cur: number, prev: number) => (compare ? { cur, prev } : {});
  return (
    <Section n={3} title="Implicare și retenție">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="DAU (medie)" value={fmtNum(S.dau)} {...cmp(S.dau, P.dau)} />
        <Stat label="WAU" value={fmtNum(S.wau)} {...cmp(S.wau, P.wau)} />
        <Stat label="MAU" value={fmtNum(S.mau)} {...cmp(S.mau, P.mau)} />
        <Stat label="Utilizatori care revin" value={fmtPct(S.returning)} hint={`${S.sessionsPerUser.toFixed(2)} sesiuni / utilizator`} {...cmp(S.returning, P.returning)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="DAU / WAU / MAU">
          <LineChart
            label="Utilizatori activi zilnic, săptămânal și lunar"
            labels={c.bks.map((b) => b.label)}
            series={[
              { key: "dau", label: "DAU", color: "var(--series-1)", values: c.bks.map((b) => avg(b.days, (d) => d.dau)) },
              { key: "wau", label: "WAU", color: "var(--series-2)", values: c.bks.map((b) => b.days.at(-1)?.wau ?? 0) },
              { key: "mau", label: "MAU", color: "var(--series-3)", values: c.bks.map((b) => b.days.at(-1)?.mau ?? 0) },
            ]}
          />
        </ChartCard>
        <ChartCard title="Implicare: timp mediu pe sesiune">
          <LineChart label="Timp mediu pe sesiune" area format={fmtTime} labels={c.bks.map((b) => b.label)} series={[{ key: "t", label: "Timp / sesiune", color: "var(--series-1)", values: c.bks.map((b) => avg(b.days, (d) => d.avg_session_s)) }]} />
        </ChartCard>
        <ChartCard title="Retenție pe cohorte (săptămânal)" note="Fiecare rând: utilizatorii noi dintr-o săptămână și ce procent revine în săptămânile următoare.">
          <Cohorts cohorts={analytics.cohorts} />
        </ChartCard>
        <ChartCard title="Retenție și timp pe funcție">
          <table className="w-full text-sm tabular-nums">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Funcție</th>
                <th className="py-1 text-right font-normal">Retenție 7 zile</th>
                <th className="py-1 text-right font-normal">Timp mediu</th>
              </tr>
            </thead>
            <tbody>
              {fs.map((f) => (
                <tr key={f.key} className="border-t">
                  <td className="py-1.5">{f.label}</td>
                  <td className="py-1.5 text-right font-semibold">{fmtPct(f.retention)}</td>
                  <td className="py-1.5 text-right">{fmtTime(f.avg_time_s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartCard>
      </div>
    </Section>
  );
}

// Sequential: one hue, opacity grows with retention; the number is always printed, never color alone.
function Cohorts({ cohorts }: { cohorts: Analytics["cohorts"] }) {
  const weeks = Math.max(...cohorts.map((c) => c.retention.length));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0.5 text-xs tabular-nums">
        <thead className="text-muted-foreground">
          <tr>
            <th className="px-1 text-left font-normal">Cohortă</th>
            {Array.from({ length: weeks }, (_, k) => (
              <th key={k} className="px-1 font-normal">
                S{k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.week}>
              <td className="whitespace-nowrap px-1 text-muted-foreground">
                {fmtDate(c.week)} · {c.size}
              </td>
              {Array.from({ length: weeks }, (_, k) => {
                const v = c.retention[k];
                return (
                  <td
                    key={k}
                    className={`rounded px-1 py-1.5 text-center ${v !== undefined && v > 0.5 ? "font-semibold text-white" : ""}`}
                    style={v === undefined ? undefined : { background: `color-mix(in oklab, var(--series-1) ${Math.round(12 + v * 88)}%, transparent)` }}
                  >
                    {v === undefined ? "" : fmtPct(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
