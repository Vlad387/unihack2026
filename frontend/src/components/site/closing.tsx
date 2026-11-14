import { ArrowRight } from "lucide-react";
import Link from "next/link";

const words = "Nu căutăm cine e majoritatea. Căutăm ce ne unește pe toți.".split(" ");
const band = ["Fără cont", "Voce sau text", "Hartă live", "Puncte comune", "Compromis votat", "AI etichetat", "Zero date personale"];

// Full-bleed band between the steps and the bento, so the page never repeats the same rhythm twice.
export function Marquee() {
  const row = band.map((w) => (
    <span key={w} className="flex items-center gap-10 pr-10">
      {w}
      <span className="size-1.5 rounded-full bg-primary" />
    </span>
  ));
  return (
    <div className="marquee overflow-hidden border-y border-line bg-foreground/[0.02] py-5 font-display text-title font-semibold text-ink-3">
      <div className="marquee-track">
        {row}
        <span aria-hidden className="flex">
          {row}
        </span>
      </div>
    </div>
  );
}

// Each word lights up as it crosses the viewport (CSS scroll-driven animation, no JS).
export function Statement() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-28 sm:px-8 lg:py-44">
      <div className="grid gap-8 lg:grid-cols-12">
        <p className="eyebrow lg:col-span-3 lg:pt-5">Principiul nostru</p>
        <p className="kinetic font-display text-display font-bold tracking-[-0.03em] lg:col-span-9">
          {words.map((w, i) => (
            <span key={i}>{w} </span>
          ))}
        </p>
      </div>
      <p data-reveal className="mt-12 ml-auto max-w-sm text-ink-3 lg:mr-[10%]">
        Un punct comun trebuie să convingă fiecare tabără, oricât de mică. Așa ajung compromisurile să fie votate de toți,
        nu impuse.
      </p>
    </section>
  );
}

// Closing call-to-action as one rounded panel (gradient inside the panel only, see .cta-panel).
export function Closing() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8 lg:pb-32">
      <div className="cta-panel relative isolate flex flex-col items-start gap-8 overflow-hidden rounded-[2.5rem] px-6 py-16 sm:px-12 lg:py-24">
        <PanelDots />
        <p className="eyebrow">Pentru primării și organizatori</p>
        <h2 data-reveal className="max-w-4xl font-display text-display font-bold tracking-[-0.03em] text-balance">
          Organizezi o consultare? <span className="text-primary">Pune întrebarea.</span> Restul e live.
        </h2>
        <p data-reveal className="max-w-xl text-lead text-ink-2">
          Afișezi codul QR, urmărești harta opiniilor pe proiector și primești raportul final la sfârșit.
        </p>
        <div data-reveal className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/organizer"
           
            className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-primary px-8 font-semibold text-primary-foreground shadow-[0_0_50px_-12px] shadow-primary transition-shadow hover:shadow-[0_0_70px_-8px] focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-none"
          >
            Creează o consultare
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/board"
            className="glass inline-flex h-14 items-center justify-center rounded-full px-8 font-semibold text-ink-2 transition-colors hover:border-primary/60 hover:text-foreground"
          >
            Deschide ecranul live
          </Link>
        </div>
      </div>
    </section>
  );
}

// A loose "opinion map" of dots on the right side of the panel: decoration only.
function PanelDots() {
  const dots = Array.from({ length: 34 }, (_, i) => {
    const a = i * 2.39996;
    const r = 18 * Math.sqrt(i + 1);
    return [200 + r * Math.cos(a), 170 + r * Math.sin(a), i % 4 === 0 ? 7 : 4.5] as const;
  });
  return (
    <svg viewBox="0 0 400 340" className="pointer-events-none absolute -right-16 bottom-0 -z-10 hidden w-[34rem] opacity-70 lg:block" aria-hidden>
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--cyan)" opacity={0.25 + (i % 5) * 0.12} />
      ))}
    </svg>
  );
}
