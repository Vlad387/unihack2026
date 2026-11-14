import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

const builtWith = ["Gemini", "Next.js", "FastAPI", "PostgreSQL", "pgvector", "UMAP", "HDBSCAN"];

// Template hero: the page starts in a violet -> ice band that runs up behind the sticky header, with a
// full-width wordmark, a centered headline and two buttons, then the "built with" strip.
export function Hero() {
  return (
    <section className="band-top -mt-[4.25rem] pt-[4.25rem]">
      <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-8 lg:pt-14">
        {/* custom geometric lettering, full container width */}
        <div data-hero-fade>
          <Wordmark className="block h-auto w-full text-[var(--wordmark)]" />
        </div>

        <div className="mx-auto mt-16 flex max-w-4xl flex-col items-center gap-7 pb-20 text-center lg:mt-24 lg:pb-28">
          <h1 className="font-display text-[clamp(2.5rem,1.3rem+4vw,5rem)] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance">
            <span data-split className="block">
              Orașul tău. Vocea ta.
            </span>
            <span data-split className="block">
              Un compromis votat de toți.
            </span>
          </h1>
          <p data-hero-fade className="max-w-xl text-lead text-pretty text-ink-2">
            CityMind adună părerile oamenilor despre o problemă a orașului, găsește ce îi unește și propune un compromis pe
            care îl votează toată lumea, live.
          </p>
          <div data-hero-fade className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/participa"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              Participă acum
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              href="/cum-functioneaza"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-foreground/80 px-6 font-semibold transition-colors hover:bg-foreground/5"
            >
              Cum funcționează
            </Link>
          </div>
          <p data-hero-fade className="font-mono text-meta tracking-[0.12em] text-ink-3 uppercase">
            Fără cont · voce sau text · sub un minut
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 pb-16 sm:px-8">
        <span className="font-mono text-meta tracking-[0.12em] text-ink-3 uppercase">Construit cu</span>
        {builtWith.map((t) => (
          <span key={t} className="text-lg font-bold tracking-tight text-ink-3">
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
