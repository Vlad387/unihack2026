import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { OpinionMap } from "@/components/opinion-map";
import { campColor } from "@/lib/colors";
import type { ClusterResult } from "@/lib/types";

export function Hero({ question, clusters }: { question: string; clusters: ClusterResult }) {
  const color = campColor(clusters.camps);

  return (
    <section className="relative isolate">
      <div className="mx-auto grid w-full max-w-7xl gap-14 px-4 pt-14 pb-20 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:pt-24 lg:pb-0">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <p data-hero-fade className="eyebrow flex items-center gap-2.5">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/70 motion-reduce:hidden" />
              <span className="size-2 rounded-full bg-primary" />
            </span>
            Live · consultare publică cu AI
          </p>

          <h1 className="font-display text-hero font-bold tracking-[-0.035em] text-balance">
            <span data-split className="block">
              Orașul tău.
            </span>
            <span data-split className="block">
              Vocea ta.
            </span>
            <span data-split className="block text-primary">
              Un compromis votat de toți.
            </span>
          </h1>

          <p data-hero-fade className="max-w-xl text-lead text-pretty text-ink-2">
            CityMind adună părerile oamenilor despre o problemă a orașului, găsește ce îi unește și propune un compromis
            pe care îl votează toată lumea, live.
          </p>

          <div data-hero-fade className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/participa"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_0_50px_-12px] shadow-primary transition-shadow hover:shadow-[0_0_70px_-8px] focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none"
            >
              Participă acum
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href="/cum-functioneaza"
              className="glass inline-flex h-14 items-center justify-center rounded-full px-8 font-semibold text-ink-2 transition-colors hover:border-primary/60 hover:text-foreground"
            >
              Cum funcționează
            </Link>
          </div>

          <p data-hero-fade className="font-mono text-meta tracking-[0.12em] text-ink-4 uppercase">
            Fără cont · voce sau text · sub un minut
          </p>
        </div>

        {/* broken grid: the live map sits lower than the headline and spills into the next section */}
        <div data-hero-fade className="relative z-10 lg:col-span-5 lg:mt-36 lg:-mb-40">
          <div data-speed="1" className="glass tile rounded-[2rem] p-4 shadow-[0_40px_120px_-40px] shadow-primary/40 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">Întrebarea consultării</p>
                <p className="mt-2 font-display text-title font-semibold text-balance">{question}</p>
              </div>
              <span className="shrink-0 rounded-full border border-primary/35 px-3 py-1 font-mono text-meta text-primary">
                {clusters.points.length} pers.
              </span>
            </div>
            <div className="mt-3">
              <OpinionMap clusters={clusters} />
            </div>
            {clusters.camps.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Tabere">
                {clusters.camps.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1 text-sm text-ink-2">
                    <span className="size-2 rounded-full" style={{ background: color(c.id) }} aria-hidden />
                    {c.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-3">Taberele apar pe măsură ce oamenii votează.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
