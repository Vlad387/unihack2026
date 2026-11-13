"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";
import type { Camp, ClusterResult, Point } from "@/lib/types";

const W = 800;
const H = 560;
const PAD = 48;
const UNASSIGNED = "#a1a1aa";

// Same camp order → same color everywhere (map, legend, screen 3).
export function campColor(camps: Camp[]): (id: string | null) => string {
  const scale = d3.scaleOrdinal<string, string>(d3.schemeTableau10).domain(camps.map((c) => c.id));
  return (id) => (id ? scale(id) : UNASSIGNED);
}

function domain(values: number[]): [number, number] {
  const [lo, hi] = d3.extent(values);
  return lo === undefined || hi === undefined || lo === hi ? [-1, 1] : [lo, hi];
}

export function OpinionMap({ clusters }: { clusters: ClusterResult }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    const { camps, points } = clusters;
    const x = d3.scaleLinear().domain(domain(points.map((p) => p.x))).range([PAD, W - PAD]);
    const y = d3.scaleLinear().domain(domain(points.map((p) => p.y))).range([H - PAD, PAD]);
    const color = campColor(camps);
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
            .attr("cx", (d) => x(d.x))
            .attr("cy", (d) => y(d.y))
            .attr("r", 0)
            .attr("fill", (d) => color(d.camp_id))
            .attr("fill-opacity", 0.85)
            .call((e) => e.transition(t).attr("r", 8)),
        (update) =>
          update.call((u) =>
            u
              .transition(t)
              .attr("cx", (d) => x(d.x))
              .attr("cy", (d) => y(d.y))
              .attr("fill", (d) => color(d.camp_id)),
          ),
        (exit) => exit.call((e) => e.transition(t).attr("r", 0).remove()),
      );

    const labels = camps.map((c) => {
      const mine = points.filter((p) => p.camp_id === c.id);
      return { ...c, cx: d3.mean(mine, (p) => x(p.x)) ?? W / 2, cy: d3.min(mine, (p) => y(p.y)) ?? H / 2 };
    });

    svg
      .select<SVGGElement>("g.labels")
      .selectAll<SVGTextElement, (typeof labels)[number]>("text")
      .data(labels, (d) => d.id)
      .join("text")
      .text((d) => d.name)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => color(d.id))
      .transition(t)
      .attr("x", (d) => d.cx)
      .attr("y", (d) => d.cy - 18);
  }, [clusters]);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Harta opiniilor: ${clusters.points.length} participanți în ${clusters.camps.length} tabere`}
      className="h-auto w-full"
    >
      <g className="points" />
      <g className="labels text-lg font-semibold [paint-order:stroke] [&_text]:stroke-background [&_text]:stroke-[4px]" />
    </svg>
  );
}
