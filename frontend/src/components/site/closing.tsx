import { ArrowRight, Handshake, MapPin, Mic, QrCode, Sparkles, Vote } from "lucide-react";
import Link from "next/link";

const words = "Nu căutăm cine e majoritatea. Căutăm ce ne unește pe toți.".split(" ");

// Small gradient app-style tiles floating around the statement (decoration, desktop only).
const tiles = [
  { Icon: Mic, cls: "left-[6%] top-[8%] -rotate-6" },
  { Icon: QrCode, cls: "left-[18%] bottom-[6%] rotate-3" },
  { Icon: Vote, cls: "right-[8%] top-[4%] rotate-6" },
  { Icon: MapPin, cls: "right-[20%] bottom-[2%] -rotate-3" },
  { Icon: Sparkles, cls: "left-[44%] -top-[6%] rotate-2" },
  { Icon: Handshake, cls: "right-[3%] bottom-[34%] -rotate-6" },
];

// Big centered statement; each word lights up as it crosses the viewport (CSS scroll-driven, no JS).
export function Statement() {
  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 py-28 sm:px-8 lg:py-40">
      {tiles.map(({ Icon, cls }) => (
        <span
          key={cls}
          aria-hidden
          data-speed="1"
          className={`absolute hidden size-14 place-items-center rounded-2xl bg-gradient-to-br from-[oklch(72%_0.2_305)] to-[oklch(45%_0.25_290)] text-white shadow-xl shadow-[oklch(45%_0.25_290/0.3)] lg:grid ${cls}`}
        >
          <Icon className="size-6" />
        </span>
      ))}
      <p className="kinetic mx-auto max-w-5xl text-center font-display text-[clamp(2.4rem,1.2rem+4.4vw,5.5rem)] leading-[1] font-extrabold tracking-[-0.045em] text-balance">
        {words.map((w, i) => (
          <span key={i}>{w} </span>
        ))}
      </p>
      <p data-reveal className="mx-auto mt-10 max-w-md text-center text-lead text-ink-3">
        Un punct comun trebuie să convingă fiecare tabără, oricât de mică. Așa ajung compromisurile să fie votate de toți,
        nu impuse.
      </p>
    </section>
  );
}

// Closing call-to-action: the purple panel (light text via .on-dark), white button + outlined button.
export function Closing() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-8 pb-24 sm:px-8 lg:pb-32">
      <div className="cta-panel on-dark relative isolate flex flex-col items-start gap-8 overflow-hidden rounded-3xl px-6 py-16 sm:px-14 lg:py-24">
        <PanelDots />
        <h2 data-reveal className="max-w-2xl font-display text-[clamp(2.2rem,1.2rem+3.4vw,4.4rem)] leading-[1] font-extrabold tracking-[-0.04em] text-balance">
          Organizezi o consultare? Pune întrebarea. Restul e live.
        </h2>
        <p data-reveal className="max-w-lg text-lead text-ink-2">
          Afișezi codul QR, urmărești harta opiniilor pe proiector și primești raportul final la sfârșit.
        </p>
        <div data-reveal className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Link
            href="/organizer"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            Creează o consultare
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link
            href="/board"
            className="inline-flex h-12 items-center justify-center rounded-lg border border-foreground/80 px-6 font-semibold transition-colors hover:bg-foreground/10"
          >
            Vezi rundele
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
    <svg viewBox="0 0 400 340" className="pointer-events-none absolute -right-16 bottom-0 -z-10 hidden w-[34rem] opacity-60 lg:block" aria-hidden>
      {dots.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--cyan)" opacity={0.3 + (i % 5) * 0.12} />
      ))}
    </svg>
  );
}
