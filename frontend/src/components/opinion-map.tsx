"use client";

import * as d3 from "d3";
import { useEffect, useRef } from "react";
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
            .call((e) => e.transition(t).attr("r", 8 * scale)),
        (update) =>
          update.call((u) =>
            u
              .transition(t)
              .attr("cx", (d) => x(d.x))
              .attr("cy", (d) => y(d.y))
              .attr("r", 8 * scale)
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
      .attr("font-size", 18 * scale)
      .attr("stroke-width", 4 * scale)
      .transition(t)
      // keep long camp names inside the map edges
      .attr("x", function (d) {
        const half = this.getComputedTextLength() / 2 + 4;
        return Math.min(Math.max(d.cx, half), W - half);
      })
      .attr("y", (d) => Math.max(d.cy - 18 * scale, 20 * scale));

    // "you" marker: the backend's latest position for this participant wins over the initial one
    const mine = me && (points.find((p) => p.participant_id === me.participant_id) ?? me);
    const marker = svg
      .select<SVGGElement>("g.me")
      .selectAll<SVGGElement, Point>("g")
      .data(mine ? [mine] : [], (d) => d.participant_id)
      .join((enter) => {
        const g = enter.append("g").attr("transform", (d) => `translate(${x(d.x)},${y(d.y)})`);
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
    marker.transition(t).attr("transform", (d) => `translate(${x(d.x)},${y(d.y)})`);
  }, [clusters, me, scale]);

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Harta opiniilor: ${clusters.points.length} participanți în ${clusters.camps.length} tabere`}
      className="h-auto w-full"
    >
      <g className="points" />
      <g className="labels font-semibold [paint-order:stroke] [&_text]:stroke-background" />
      <g className="me [paint-order:stroke] [&_text]:stroke-background [&_text]:stroke-[6px]" />
    </svg>
  );
}
