import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { outlineBtn, sectionTitle, textLink } from "@/components/site/styles";

const small = [
  {
    title: "Ce e un punct comun?",
    text: "O afirmație cu care e de acord majoritatea din fiecare tabără, nu doar majoritatea din total.",
  },
  {
    title: "Cine vede ce am răspuns?",
    text: "Nimeni nu îți vede numele, pentru că nu îl cerem. Pe hartă ești un punct; textul apare doar ca afirmație.",
  },
];

// Template "articles": one big card with a visual on the right, two small cards stacked next to it.
export function Learn() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-24 pb-16 sm:px-8 lg:pt-32">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <h2 data-reveal className={`max-w-2xl ${sectionTitle}`}>
          Află cum ajungem la compromis.
        </h2>
        <Link href="/cum-functioneaza" className={outlineBtn}>
          Vezi tot <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div data-stagger className="mt-12 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Link href="/cum-functioneaza" className="glass tile group grid gap-6 rounded-2xl p-6 sm:grid-cols-2 sm:p-8">
          <div className="flex flex-col gap-4">
            <h3 className="text-[clamp(1.6rem,1.2rem+1.2vw,2.2rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
              De la voci la un compromis votat: metodologia completă
            </h3>
            <p className="text-ink-3">
              Agenți AI care citesc răspunsurile, o hartă a opiniilor, puncte comune și runde de vot. Totul public, de la
              prompturi la cod.
            </p>
            <span className={`mt-auto ${textLink}`}>
              Citește <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </div>
          <ul className="flex flex-col justify-center gap-2 rounded-xl bg-gradient-to-br from-[var(--violet)] to-[var(--wash)] p-5" aria-hidden>
            {["Intake · Gemini", "Hartă · UMAP", "Tabere · HDBSCAN", "Puncte comune", "Mediator + Critic"].map((t, i) => (
              <li
                key={t}
                className={`flex items-center justify-between rounded-lg bg-[var(--carbon)] px-3 py-2 font-mono text-meta text-ink-2 shadow-sm ${i === 3 ? "scale-105 font-bold text-[var(--cyan)]" : ""}`}
              >
                {t}
                <span className="text-ink-4">{String(i + 1).padStart(2, "0")}</span>
              </li>
            ))}
          </ul>
        </Link>

        <div className="grid gap-4">
          {small.map((c) => (
            <Link key={c.title} href="/cum-functioneaza" className="glass tile group flex flex-col gap-3 rounded-2xl p-6">
              <h3 className="text-xl font-bold tracking-[-0.02em]">{c.title}</h3>
              <p className="text-sm text-ink-3">{c.text}</p>
              <span className={`mt-auto pt-2 ${textLink}`}>
                Explorează <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
