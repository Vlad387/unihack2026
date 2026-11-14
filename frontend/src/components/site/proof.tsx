import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { outlineBtn, sectionTitle } from "@/components/site/styles";

// Big-number cards. Benchmark numbers come from seed/PITCH_SLIDE.md and must stay labeled as synthetic.
const stats = [
  {
    value: "<10 ms",
    text: "ca harta și punctele comune să se recalculeze după un vot nou, la 50–60 de participanți.",
    note: "Date sintetice · un singur laptop",
  },
  {
    value: "20 s",
    text: "în jur de atât, de la răspunsul tău, cu vocea sau în scris, până la afirmațiile pe care le votează ceilalți.",
    note: "Măsurat în repetiția live",
  },
  {
    value: "0%",
    text: "din procentele de sprijin vin din opinii simulate sau din datele demo. Numără doar oamenii reali.",
    note: "Regulă, nu estimare",
  },
  {
    value: "0 lei",
    text: "costul AI pentru o consultare de demo, pe planul gratuit Gemini.",
    note: "Plan gratuit Gemini",
  },
];

export function Proof() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-28 sm:px-8 lg:pb-36">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 data-reveal className={sectionTitle}>
            Măsurat, nu promis.
          </h2>
          <p data-reveal className="text-ink-3">
            Cifrele de performanță vin din date sintetice (50 de participanți fictivi). Pe o consultare reală încă nu sunt
            dovedite.
          </p>
        </div>
        <Link href="/cum-functioneaza" className={outlineBtn}>
          Metodologia <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul data-stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <li key={s.value} className="glass tile flex min-h-80 flex-col gap-4 rounded-2xl p-6">
            <p className="text-lg leading-snug font-medium tracking-[-0.01em] text-ink-2">{s.text}</p>
            <p className="mt-auto font-display text-[clamp(2.6rem,1.6rem+2.4vw,4rem)] leading-none font-extrabold tracking-[-0.05em] whitespace-nowrap">
              {s.value}
            </p>
            <p className="font-mono text-meta tracking-[0.1em] text-ink-4 uppercase">{s.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
