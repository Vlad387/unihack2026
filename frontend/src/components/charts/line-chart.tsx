"use client";

import { max, scaleLinear } from "d3";
import { useState } from "react";
import { ChartTooltip, Legend } from "@/components/charts/chart-tooltip";

const VW = 640;
const VH = 240;
const M = { top: 12, right: 12, bottom: 28, left: 48 };

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

interface Props {
  labels: string[];
  series: Series[];
  format?: (v: number) => string;
  area?: boolean;
  yMax?: number;
  label: string;
}

// One y-axis, 2px lines, crosshair that snaps to the nearest x and lists every series.
export function LineChart({ labels, series, format = (v) => String(Math.round(v)), area = false, yMax, label }: Props) {
  const [i, setI] = useState<number | null>(null);
  const n = labels.length;
  const x = scaleLinear()
    .domain([0, Math.max(1, n - 1)])
    .range([M.left, VW - M.right]);
  const top = yMax ?? max(series.flatMap((s) => s.values)) ?? 1;
  const y = scaleLinear().domain([0, top || 1]).nice().range([VH - M.bottom, M.top]);
  const path = (vs: number[]) => vs.map((v, k) => `${k ? "L" : "M"}${x(k)},${y(v)}`).join("");
  const tickEvery = Math.max(1, Math.ceil(n / 6));

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const px = (e.nativeEvent.offsetX / e.currentTarget.clientWidth) * VW;
    setI(Math.min(n - 1, Math.max(0, Math.round(x.invert(px)))));
  }

  return (
    <div>
      {series.length > 1 && <Legend items={series} />}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          className="h-auto w-full touch-pan-y"
          role="img"
          aria-label={label}
          onPointerMove={move}
          onPointerDown={move}
          onPointerLeave={() => setI(null)}
        >
          {y.ticks(4).map((t) => (
            <g key={t}>
              <line x1={M.left} x2={VW - M.right} y1={y(t)} y2={y(t)} className="stroke-border" />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[13px]">
                {format(t)}
              </text>
            </g>
          ))}
          {labels.map((l, k) =>
            k % tickEvery === 0 || k === n - 1 ? (
              <text
                key={k}
                x={x(k)}
                y={VH - 8}
                // edge labels anchor inward so they never get clipped
                textAnchor={k === 0 ? "start" : k === n - 1 ? "end" : "middle"}
                className="fill-muted-foreground text-[13px]"
              >
                {l}
              </text>
            ) : null,
          )}
          {series.map((s) => (
            <g key={s.key}>
              {area && !s.dashed && (
                <path
                  d={`${path(s.values)}L${x(s.values.length - 1)},${y(0)}L${x(0)},${y(0)}Z`}
                  style={{ fill: s.color }}
                  fillOpacity={series.length > 1 ? 0.08 : 0.14}
                />
              )}
              <path
                d={path(s.values)}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeDasharray={s.dashed ? "5 4" : undefined}
                style={{ stroke: s.color }}
              />
            </g>
          ))}
          {i !== null && (
            <>
              <line x1={x(i)} x2={x(i)} y1={M.top} y2={VH - M.bottom} className="stroke-muted-foreground" strokeDasharray="3 3" />
              {series.map((s) => (
                <circle key={s.key} cx={x(i)} cy={y(s.values[i] ?? 0)} r={4.5} strokeWidth={2} className="stroke-card" style={{ fill: s.color }} />
              ))}
            </>
          )}
        </svg>
        {i !== null && (
          <ChartTooltip
            left={x(i) / VW}
            top={y(max(series, (s) => s.values[i] ?? 0) ?? 0) / VH}
            title={labels[i]}
            rows={series.map((s) => ({ label: s.label, value: format(s.values[i] ?? 0), color: s.color }))}
          />
        )}
      </div>
    </div>
  );
}
