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
    <div className="marquee overflow-hidden border-y border-line bg-white/[0.02] py-5 font-display text-title font-semibold text-ink-3">
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

export function Closing() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-8 px-4 py-28 sm:px-8 lg:py-40">
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
            className="glass inline-flex h-14 items-center justify-center rounded-full px-8 font-semibold text-ink-2 transition-colors hover:border-primary/60 hover:text-white"
          >
            Deschide ecranul live
          </Link>
        </div>
      </div>
    </section>
  );
}
