import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { change } from "@/lib/kpi";
import type { FeatureInfo, FeatureKey } from "@/lib/types";

// Fixed feature order → fixed color, so a filter never repaints a feature.
export const featureColor = (features: FeatureInfo[], key: FeatureKey) =>
  `var(--series-${features.findIndex((f) => f.key === key) + 1})`;

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const fmtNum = (v: number) => Math.round(v).toLocaleString("ro-RO");

// Arrow + sign + word, so the trend never relies on color alone.
export function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const d = change(cur, prev);
  if (d === null) return null;
  const up = d > 0.001;
  const down = d < -0.001;
  const good = invert ? down : up;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up || down ? (good ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400") : "text-muted-foreground"}`}>
      <Icon className="size-3.5" aria-hidden />
      {d > 0 ? "+" : ""}
      {(d * 100).toFixed(1)}% <span className="sr-only">față de perioada anterioară</span>
    </span>
  );
}

export function Stat({ label, value, hint, cur, prev, invert }: { label: string; value: string; hint?: string; cur?: number; prev?: number; invert?: boolean }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="flex flex-col gap-0.5 px-4">
        <p className="text-2xl font-bold tracking-tight tabular-nums md:text-3xl">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          {cur !== undefined && prev !== undefined && <Delta cur={cur} prev={prev} invert={invert} />}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartCard({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
        {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-baseline gap-2 text-xl font-bold tracking-tight">
        <span className="text-sm font-semibold text-primary tabular-nums">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
