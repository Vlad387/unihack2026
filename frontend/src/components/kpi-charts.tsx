"use client";

import { max, scaleBand, scaleLinear } from "d3";
import { useState } from "react";

const VW = 640;
const VH = 240;
const M = { top: 16, right: 16, bottom: 28, left: 36 };

function Tooltip({ left, top, value, label }: { left: number; top: number; value: string; label: string }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg border bg-popover px-3 py-2 text-sm shadow-lg"
      style={{ left: `${(left / VW) * 100}%`, top: `${(top / VH) * 100}%` }}
    >
      <p className="font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

// Single series over time: area + 2px line, crosshair snaps to the nearest minute.
export function ParticipationChart({ data }: { data: { minute: number; participants: number }[] }) {
  const [i, setI] = useState<number | null>(null);
  const x = scaleLinear()
    .domain([0, Math.max(1, data.length - 1)])
    .range([M.left, VW - M.right]);
  const y = scaleLinear()
    .domain([0, max(data, (d) => d.participants) ?? 1])
    .nice()
    .range([VH - M.bottom, M.top]);
  const line = data.map((d, k) => `${k ? "L" : "M"}${x(k)},${y(d.participants)}`).join("");
  const area = `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const px = (e.nativeEvent.offsetX / e.currentTarget.clientWidth) * VW;
    setI(Math.min(data.length - 1, Math.max(0, Math.round(x.invert(px)))));
  }

  const hovered = i === null ? null : data[i];
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label="Participanți în timp"
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setI(null)}
      >
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={M.left} x2={VW - M.right} y1={y(t)} y2={y(t)} className="stroke-border" />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[13px]">
              {t}
            </text>
          </g>
        ))}
        {x.ticks(6).map((t) => (
          <text key={t} x={x(t)} y={VH - 8} textAnchor="middle" className="fill-muted-foreground text-[13px]">
            {t} min
          </text>
        ))}
        <path d={area} style={{ fill: "var(--series-1)" }} fillOpacity={0.12} />
        <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" style={{ stroke: "var(--series-1)" }} />
        {hovered && i !== null && (
          <>
            <line x1={x(i)} x2={x(i)} y1={M.top} y2={VH - M.bottom} className="stroke-muted-foreground" strokeDasharray="3 3" />
            <circle cx={x(i)} cy={y(hovered.participants)} r={5} className="stroke-card" strokeWidth={2} style={{ fill: "var(--series-1)" }} />
          </>
        )}
      </svg>
      {hovered && i !== null && (
        <Tooltip left={x(i)} top={y(hovered.participants)} value={`${hovered.participants} participanți`} label={`minutul ${hovered.minute}`} />
      )}
    </div>
  );
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  display: string;
  color: string;
}

// Vertical bars with 4px rounded tops, optional dashed reference line (e.g. the pass threshold).
export function BarChart({ data, maxValue, reference }: { data: BarDatum[]; maxValue: number; reference?: { value: number; label: string } }) {
  const [hover, setHover] = useState<BarDatum | null>(null);
  const x = scaleBand()
    .domain(data.map((d) => d.key))
    .range([M.left, VW - M.right])
    .padding(0.35);
  const y = scaleLinear().domain([0, maxValue]).range([VH - M.bottom, M.top]);
  const r = Math.min(4, x.bandwidth() / 2);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VW} ${VH}`} className="h-auto w-full" role="img" aria-label={data.map((d) => `${d.label}: ${d.display}`).join(", ")}>
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={M.left} x2={VW - M.right} y1={y(t)} y2={y(t)} className="stroke-border" />
            <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[13px]">
              {t}
            </text>
          </g>
        ))}
        {data.map((d) => {
          const bx = x(d.key) ?? 0;
          const top = y(d.value);
          const h = Math.max(0, y(0) - top);
          const w = x.bandwidth();
          const path = h > r ? `M${bx},${y(0)}V${top + r}Q${bx},${top} ${bx + r},${top}H${bx + w - r}Q${bx + w},${top} ${bx + w},${top + r}V${y(0)}Z` : "";
          return (
            <g
              key={d.key}
              tabIndex={0}
              className="outline-none"
              onPointerEnter={() => setHover(d)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(d)}
              onBlur={() => setHover(null)}
            >
              {/* full-height hit area: easier to hover than the painted bar */}
              <rect x={bx} y={M.top} width={w} height={VH - M.top - M.bottom} fill="transparent" />
              <path d={path} style={{ fill: d.color }} className={hover?.key === d.key ? "brightness-110" : ""} />
              <text x={bx + w / 2} y={top - 6} textAnchor="middle" className="fill-foreground text-[14px] font-semibold">
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
            <text x={VW - M.right} y={y(reference.value) - 6} textAnchor="end" className="fill-foreground text-[13px] font-medium">
              {reference.label}
            </text>
          </g>
        )}
      </svg>
      {hover && <Tooltip left={(x(hover.key) ?? 0) + x.bandwidth() / 2} top={y(hover.value)} value={hover.display} label={hover.label} />}
    </div>
  );
}
