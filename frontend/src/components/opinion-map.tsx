"use client";

import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";
import { campColor } from "@/lib/colors";
import type { ClusterResult, Point } from "@/lib/types";

const W = 800;
const H = 560;
const PAD = 48;

function domain(values: number[]): [number, number] {
  const [lo, hi] = d3.extent(values);
  return lo === undefined || hi === undefined || lo === hi ? [-1, 1] : [lo, hi];
}

interface Props {
  clusters: ClusterResult;
  me?: Point | null;
  // phones shrink the 800px viewBox ~2.3x, so dots and labels need scaling up
  scale?: number;
}

export function OpinionMap({ clusters, me = null, scale = 1 }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  // first paint draws everything in place: animations only for later changes, so slow phones never show an empty map
  const first = useRef(true);
  const [hover, setHover] = useState<{ point: Point; left: number; top: number } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    const { camps, points } = clusters;
    const x = d3.scaleLinear().domain(domain(points.map((p) => p.x))).range([PAD, W - PAD]);
    const y = d3.scaleLinear().domain(domain(points.map((p) => p.y))).range([H - PAD, PAD]);
    const color = campColor(camps);
    // Small data can put several people on the exact same spot (e.g. all at 0,0): fan them out in a ring so every dot shows.
    const pos = new Map<string, [number, number]>();
    const stacks = d3.group(points, (p) => `${p.x},${p.y}`);
    for (const stack of stacks.values()) {
      stack.forEach((p, i) => {
        const r = i === 0 ? 0 : 36 * scale * Math.ceil(i / 6);
        // start straight up and go clockwise, so the first neighbours stay clear of the "Tu" label below
        const a = -Math.PI / 2 + ((i - 1) * Math.PI) / 3;
        pos.set(p.participant_id, [x(p.x) + r * Math.cos(a), y(p.y) + r * Math.sin(a)]);
      });
    }
    const px = (p: Point) => pos.get(p.participant_id)?.[0] ?? x(p.x);
    const py = (p: Point) => pos.get(p.participant_id)?.[1] ?? y(p.y);
    // explicit transition object: d3 is marked side-effect-free, so selection.transition() alone gets tree-shaken
    const t = d3.transition().duration(800);

    svg
      .select<SVGGElement>("g.points")
      .selectAll<SVGCircleElement, Point>("circle")
      .data(points, (d) => d.participant_id)
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("cx", px)
            .attr("cy", py)
            .attr("r", first.current ? 8 * scale : 0)
            .attr("fill-opacity", 0.85)
            // wide transparent stroke = ~24px hit area, so small dots are easy to hover or tap
            .attr("stroke", "transparent")
            .attr("stroke-width", 10 * scale)
            .attr("tabindex", 0)
            .attr("class", "cursor-pointer outline-none transition-[filter] hover:brightness-125 focus:brightness-125")
            .call((e) => e.transition(t).attr("r", 8 * scale)),
        (update) =>
          update.call((u) =>
            u
              .transition(t)
              .attr("cx", px)
              .attr("cy", py)
              .attr("r", 8 * scale),
          ),
        (exit) => exit.call((e) => e.transition(t).attr("r", 0).remove()),
      )
      // CSS var colors can't be tweened, so they're set directly
      .style("fill", (d) => color(d.camp_id))
      .on("pointerenter focus click", (_, d) => setHover({ point: d, left: px(d) / W, top: py(d) / H }))
      .on("pointerleave", (e: PointerEvent) => e.pointerType === "mouse" && setHover(null))
      .on("blur", () => setHover(null));
    // tap on empty map closes the card on phones
    svg.on("click", (e: MouseEvent) => e.target === ref.current && setHover(null));

    const labels = camps.map((c) => {
      const mine = points.filter((p) => p.camp_id === c.id);
      return { ...c, cx: d3.mean(mine, px) ?? W / 2, cy: d3.min(mine, py) ?? H / 2 };
    });

    // keep long camp names inside the map edges
    function labelX(this: SVGTextElement, d: (typeof labels)[number]) {
      const half = this.getComputedTextLength() / 2 + 4;
      return Math.min(Math.max(d.cx, half), W - half);
    }
    const labelY = (d: (typeof labels)[number]) => Math.max(d.cy - 18 * scale, 20 * scale);

    svg
      .select<SVGGElement>("g.labels")
      .selectAll<SVGTextElement, (typeof labels)[number]>("text")
      .data(labels, (d) => d.id)
      .join((enter) =>
        enter
          .append("text")
          .text((d) => d.name)
          .attr("text-anchor", "middle")
          .attr("font-size", 18 * scale)
          .attr("x", labelX)
          .attr("y", labelY),
      )
      .text((d) => d.name)
      .attr("font-size", 18 * scale)
      .attr("stroke-width", 4 * scale)
      .transition(t)
      .attr("x", labelX)
      .attr("y", labelY);

    // "you" marker: the backend's latest position for this participant wins over the initial one
    const mine = me && (points.find((p) => p.participant_id === me.participant_id) ?? me);
    const marker = svg
      .select<SVGGElement>("g.me")
      .selectAll<SVGGElement, Point>("g")
      .data(mine ? [mine] : [], (d) => d.participant_id)
      .join((enter) => {
        const g = enter.append("g").attr("transform", (d) => `translate(${px(d)},${py(d)})`);
        g.append("circle").attr("fill", "none").attr("class", "stroke-foreground animate-pulse");
        g.append("text").text("Tu").attr("text-anchor", "middle").attr("class", "fill-foreground font-bold");
        return g;
      });
    marker
      .select("circle")
      .attr("r", 16 * scale)
      .attr("stroke-width", 3 * scale);
    marker
      .select("text")
      .attr("font-size", 16 * scale)
      .attr("dy", 34 * scale);
    marker.transition(t).attr("transform", (d) => `translate(${px(d)},${py(d)})`);
    first.current = false;
  }, [clusters, me, scale]);

  const camp = hover && clusters.camps.find((c) => c.id === hover.point.camp_id);
  const color = campColor(clusters.camps);

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Harta opiniilor: ${clusters.points.length} participanți în ${clusters.camps.length} tabere`}
        className="h-auto w-full"
      >
        <g className="points" />
        <g className="labels pointer-events-none fill-foreground font-semibold [paint-order:stroke] [&_text]:stroke-background" />
        <g className="me pointer-events-none [paint-order:stroke] [&_text]:stroke-background [&_text]:stroke-[6px]" />
      </svg>

      {hover && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-64 max-w-[80%] rounded-xl border bg-popover p-3 text-sm text-popover-foreground shadow-xl"
          style={{
            left: `${Math.min(Math.max(hover.left * 100, 18), 82)}%`,
            top: `${hover.top * 100}%`,
            // above the dot, or below it when the dot is near the top edge
            transform: `translate(-50%, ${hover.top < 0.4 ? "16px" : "calc(-100% - 16px)"})`,
          }}
        >
          <p className="font-medium leading-snug">
            {hover.point.text ? `„${hover.point.text}”` : "Răspunsul e încă procesat."}
          </p>
          {camp && (
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-0.5 w-3 rounded-full" style={{ background: color(camp.id) }} aria-hidden />
              {camp.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
