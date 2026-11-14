import { OpinionMap } from "@/components/opinion-map";
import { sectionTitle } from "@/components/site/styles";
import { campColor } from "@/lib/colors";
import type { ClusterResult, SupportRound } from "@/lib/types";

// Template "ratings list", filled with the live consultation: title + live map on the left,
// big values in thin-ruled rows on the right.
export function LiveNow({
  question,
  clusters,
  bridges,
  support,
}: {
  question: string;
  clusters: ClusterResult;
  bridges: number;
  support: SupportRound[];
}) {
  const color = campColor(clusters.camps);
  const last = support.at(-1);
  const rows = [
    { value: clusters.points.length, label: "participanți pe harta live" },
    { value: clusters.camps.length, label: clusters.camps.length === 1 ? "tabără de opinie" : "tabere de opinie" },
    { value: bridges, label: "puncte comune găsite" },
    last && last.total > 0
      ? { value: `${Math.round((last.agree / last.total) * 100)}%`, label: `sprijin în runda ${last.round} (doar voturi reale)` }
      : { value: "–", label: "sprijin: încă nu s-a votat o propunere" },
  ];

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-28 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:pb-36">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="eyebrow">Live acum</p>
          <h2 data-reveal className={sectionTitle}>
            {question}
          </h2>
        </div>
        <div data-speed="0.6" className="glass rounded-2xl p-4">
          <OpinionMap clusters={clusters} />
          {clusters.camps.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tabere">
              {clusters.camps.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-sm text-ink-2">
                  <span className="size-2 rounded-full" style={{ background: color(c.id) }} aria-hidden />
                  {c.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <dl data-stagger className="flex flex-col self-center">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[minmax(6rem,auto)_1fr] items-baseline gap-6 border-t border-foreground/15 py-6 last:border-b">
            <dd className="font-display text-[clamp(2.2rem,1.5rem+1.8vw,3.2rem)] leading-none font-extrabold tracking-[-0.05em]">
              {typeof r.value === "number" ? <span data-count={r.value}>{r.value}</span> : r.value}
            </dd>
            <dt className="text-ink-3">{r.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
