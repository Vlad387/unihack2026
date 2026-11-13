"use client";

import { scaleBand, scaleLinear } from "d3";
import { useState } from "react";
import { ChartTooltip } from "@/components/charts/chart-tooltip";

const VW = 640;
const VH = 240;
const M = { top: 22, right: 12, bottom: 28, left: 44 };

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  display: string;
  color: string;
  dim?: boolean;
}

// Path for a bar with 4px rounded data-end, square at the baseline.
function bar(x: number, y: number, w: number, h: number, horizontal: boolean) {
  const r = Math.min(4, (horizontal ? h : w) / 2, horizontal ? w : h);
  if (r <= 0) return "";
  return horizontal
    ? `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`
    : `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function BarChart({
  data,
  maxValue,
  reference,
  label,
}: {
  data: BarDatum[];
  maxValue: number;
  reference?: { value: number; label: string };
  label: string;
}) {
  const [hover, setHover] = useState<BarDatum | null>(null);
  const x = scaleBand()
    .domain(data.map((d) => d.key))
    .range([M.left, VW - M.right])
    .padding(0.3);
  const y = scaleLinear().domain([0, maxValue || 1]).nice().range([VH - M.bottom, M.top]);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="h-auto w-full" role="img" aria-label={label}>
        {y.ticks(4).map((t) => (
          <line key={t} x1={M.left} x2={VW - M.right} y1={y(t)} y2={y(t)} className="stroke-border" />
        ))}
        {data.map((d) => {
          const bx = x(d.key) ?? 0;
          const w = x.bandwidth();
          return (
            <g
              key={d.key}
              tabIndex={0}
              className="outline-none"
              opacity={d.dim ? 0.35 : 1}
              onPointerEnter={() => setHover(d)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(d)}
              onBlur={() => setHover(null)}
            >
              <rect x={bx} y={M.top} width={w} height={VH - M.top - M.bottom} fill="transparent" />
              <path d={bar(bx, y(d.value), w, y(0) - y(d.value), false)} style={{ fill: d.color }} />
              <text x={bx + w / 2} y={y(d.value) - 6} textAnchor="middle" className="fill-foreground text-[14px] font-semibold">
                {d.display}
              </text>
              <text x={bx + w / 2} y={VH - 8} textAnchor="middle" className="fill-muted-foreground text-[13px]">
                {d.label}
              </text>
            </g>
          );
        })}
        {reference && (
          <g>
            <line x1={M.left} x2={VW - M.right} y1={y(reference.value)} y2={y(reference.value)} className="stroke-foreground" strokeDasharray="5 4" />
            <text x={M.left + 4} y={y(reference.value) - 6} className="fill-foreground text-[13px] font-medium">
              {reference.label}
            </text>
          </g>
        )}
      </svg>
      {hover && <ChartTooltip left={((x(hover.key) ?? 0) + x.bandwidth() / 2) / VW} top={y(hover.value) / VH} rows={[{ label: hover.label, value: hover.display, color: hover.color }]} />}
    </div>
  );
}

// Horizontal bars in HTML: long labels wrap naturally, which SVG text can't do.
export function HBarChart({ data, maxValue }: { data: BarDatum[]; maxValue: number }) {
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.key} className="flex flex-col gap-1" style={{ opacity: d.dim ? 0.35 : 1 }}>
          <div className="flex justify-between gap-2 text-sm">
            <span>{d.label}</span>
            <span className="font-semibold tabular-nums">{d.display}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-r-[4px]" style={{ width: `${(d.value / (maxValue || 1)) * 100}%`, background: d.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function FunnelChart({ steps, color }: { steps: { label: string; value: number }[]; color: string }) {
  const first = steps[0]?.value || 1;
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((s, k) => {
        const prev = k ? steps[k - 1].value : s.value;
        return (
          <li key={s.label} className="flex flex-col gap-1">
            <div className="flex justify-between gap-2 text-sm">
              <span>
                {k + 1}. {s.label}
              </span>
              <span className="tabular-nums">
                <strong>{s.value.toLocaleString("ro-RO")}</strong>
                <span className="ml-2 text-xs text-muted-foreground">
                  {Math.round((s.value / first) * 100)}% din total{k > 0 && ` · ${Math.round((s.value / (prev || 1)) * 100)}% din pasul anterior`}
                </span>
              </span>
            </div>
            <div className="flex h-7 justify-center rounded-md bg-muted/60">
              <div className="h-full rounded-[4px]" style={{ width: `${(s.value / first) * 100}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
