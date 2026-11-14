import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { campColor } from "@/lib/colors";
import type { ClusterResult } from "@/lib/types";

const tile = "glass tile flex flex-col gap-4 rounded-[1.75rem] p-6 sm:p-8";
const h3 = "font-display text-title font-bold";

export function Bento({ clusters, bridges }: { clusters: ClusterResult; bridges: number }) {
  const color = campColor(clusters.camps);
  const max = Math.max(1, ...clusters.camps.map((c) => c.size));

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-28 sm:px-8 lg:pb-44">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <p className="eyebrow">Principii</p>
          <h2 className="font-display text-display font-bold tracking-[-0.03em] text-balance">AI care ajută, nu care decide.</h2>
        </div>
        <p className="text-lead text-ink-3 lg:col-span-4 lg:col-start-9">
          Patru reguli pe care nu le negociem, plus datele live ale consultării de acum.
        </p>
      </div>

      <div data-stagger className="bento mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <article className={`${tile} sm:col-span-2 lg:col-span-4 lg:row-span-2`}>
          <div className="grid h-full gap-8 @2xl:grid-cols-2">
            <div className="flex flex-col gap-3">
              <p className="eyebrow">Live · tabere</p>
              <h3 className={h3}>Puncte comune, nu majorități</h3>
              <p className="text-ink-3">
                Căutăm afirmațiile cu care sunt de acord toate taberele, nu doar cea mai mare. Ele sunt baza oricărui
                compromis.
              </p>
              <p className="mt-auto font-mono text-meta tracking-[0.1em] text-ink-2 uppercase">
                {bridges > 0 ? `${bridges} puncte comune găsite` : "Le căutăm live, pe măsură ce votați"}
              </p>
            </div>
            <ul className="flex flex-col justify-center gap-4">
              {clusters.camps.map((c) => (
                <li key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-ink-2">{c.name}</span>
                    <span className="font-mono text-meta text-ink-3">{c.size}</span>
                  </div>
                  <div className="h-2 rounded-full bg-foreground/[0.06]">
                    <div className="h-full rounded-full" style={{ width: `${(c.size / max) * 100}%`, background: color(c.id) }} />
                  </div>
                </li>
              ))}
              {clusters.camps.length === 0 && <li className="text-ink-3">Taberele apar după primele voturi.</li>}
            </ul>
          </div>
        </article>

        <Link href="/board" className={`${tile} justify-between lg:col-span-2`}>
          <p className="eyebrow flex items-center justify-between">
            Participanți <ArrowUpRight className="size-4" aria-hidden />
          </p>
          <p className="font-display text-display font-bold tracking-[-0.04em]">
            <span data-count={clusters.points.length}>{clusters.points.length}</span>
          </p>
          <p className="text-sm text-ink-3">pe harta live. Deschide ecranul mare.</p>
        </Link>

        <article className={`${tile} lg:col-span-2`}>
          <span className="w-fit rounded-full border border-primary/40 px-2.5 py-0.5 font-mono text-meta text-primary">
            Generat de AI
          </span>
          <h3 className={h3}>AI-ul e mereu etichetat</h3>
          <p className="text-sm text-ink-3">Tot ce scrie AI-ul e marcat. Deciziile rămân ale oamenilor.</p>
        </article>

        <article className={`${tile} lg:col-span-3`}>
          <h3 className={h3}>Doar voturi reale</h3>
          <div className="flex flex-col gap-3 font-mono text-meta text-ink-3" aria-hidden>
            <div className="flex items-center gap-3">
              <span className="h-2 flex-1 rounded-full bg-primary" />
              <span className="w-28 text-right">voturi reale</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="h-2 flex-1 rounded-full border border-dashed border-foreground/40" />
              <span className="w-28 text-right">simulat · 0%</span>
            </div>
          </div>
          <p className="text-sm text-ink-3">Opiniile simulate apar separat, în altă culoare, și nu intră niciodată în procente.</p>
        </article>

        <article className={`${tile} lg:col-span-3`}>
          <h3 className={h3}>Fără date personale</h3>
          <p className="font-mono text-sm leading-relaxed text-ink-3" aria-hidden>
            „Mă numesc <span className="inline-block h-[1em] w-16 rounded bg-foreground/15 align-middle" /> și stau pe strada{" "}
            <span className="inline-block h-[1em] w-20 rounded bg-foreground/15 align-middle" />…”
          </p>
          <p className="text-sm text-ink-3">Nu cerem nume, telefon sau email. Mesajele cu date personale sunt filtrate.</p>
        </article>

        <Link
          href="/cum-functioneaza"
         
          className={`${tile} group sm:col-span-2 lg:col-span-6`}
        >
          <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-center @3xl:justify-between">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Metodologie publică</p>
              <h3 className={h3}>Cum ajungem de la voci la un compromis</h3>
            </div>
            <ul className="flex flex-wrap gap-2 font-mono text-meta text-ink-2">
              {["Gemini", "UMAP", "HDBSCAN", "pgvector", "Mediator + Critic"].map((t) => (
                <li key={t} className="rounded-full border border-input px-3 py-1.5">
                  {t}
                </li>
              ))}
              <li className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-primary-foreground">
                Citește <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </li>
            </ul>
          </div>
        </Link>
      </div>
    </section>
  );
}
