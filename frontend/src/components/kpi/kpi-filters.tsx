"use client";

import type { Period } from "@/lib/kpi";
import type { Analytics, FeatureKey } from "@/lib/types";

export type Range = "7" | "30" | "90" | "custom";

export interface Filters {
  range: Range;
  from: string;
  to: string;
  feature: "all" | FeatureKey;
  period: Period;
  compare: boolean;
  segment: string;
}

const seg = "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
const on = "bg-card text-foreground shadow-sm";
const off = "text-muted-foreground hover:text-foreground";
const select = "h-9 rounded-md border bg-card px-2 text-sm";

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { v: T; l: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} className={`${seg} ${value === o.v ? on : off}`} onClick={() => onChange(o.v)}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// One row above everything it filters.
export function KpiFilters({ f, set, analytics }: { f: Filters; set: (p: Partial<Filters>) => void; analytics: Analytics }) {
  const first = analytics.days[0]?.date;
  const last = analytics.days.at(-1)?.date;
  return (
    <div className="z-30 -mx-4 flex md:sticky md:top-0 flex-wrap items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur print:static">
      <Segmented
        label="Interval"
        value={f.range}
        onChange={(range) => set({ range })}
        options={[
          { v: "7", l: "7 zile" },
          { v: "30", l: "30 zile" },
          { v: "90", l: "90 zile" },
          { v: "custom", l: "Personalizat" },
        ]}
      />
      {f.range === "custom" && (
        <div className="flex items-center gap-1 text-sm">
          <input type="date" aria-label="De la" className={select} min={first} max={f.to} value={f.from} onChange={(e) => set({ from: e.target.value })} />
          <span className="text-muted-foreground">–</span>
          <input type="date" aria-label="Până la" className={select} min={f.from} max={last} value={f.to} onChange={(e) => set({ to: e.target.value })} />
        </div>
      )}
      <Segmented
        label="Perioadă"
        value={f.period}
        onChange={(period) => set({ period })}
        options={[
          { v: "day", l: "Zilnic" },
          { v: "week", l: "Săptămânal" },
          { v: "month", l: "Lunar" },
        ]}
      />
      <select aria-label="Funcție" className={select} value={f.feature} onChange={(e) => set({ feature: e.target.value as Filters["feature"] })}>
        <option value="all">Toate funcțiile</option>
        {analytics.features.map((x) => (
          <option key={x.key} value={x.key}>
            {x.label}
          </option>
        ))}
      </select>
      <select aria-label="Segment" className={select} value={f.segment} onChange={(e) => set({ segment: e.target.value })}>
        {analytics.segments.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" checked={f.compare} onChange={(e) => set({ compare: e.target.checked })} />
        Compară cu perioada anterioară
      </label>
    </div>
  );
}
