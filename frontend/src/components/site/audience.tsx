import { ArrowRight } from "lucide-react";
import Link from "next/link";

// Small abstract glyphs (our own, drawn in the accent) so each audience card has a visual anchor.
function Rings() {
  return (
    <svg viewBox="0 0 120 120" className="size-28" aria-hidden>
      {[46, 32, 18].map((r, i) => (
        <circle key={r} cx="60" cy="60" r={r} fill="none" stroke="var(--cyan)" strokeWidth="2" opacity={0.3 + i * 0.3} />
      ))}
      <circle cx="60" cy="60" r="7" fill="var(--cyan)" />
    </svg>
  );
}

function Grid() {
  const on = [0, 1, 2, 4, 6, 7, 8, 10, 12, 13, 15, 16, 18, 19, 20, 22, 23, 24];
  return (
    <svg viewBox="0 0 120 120" className="size-28" aria-hidden>
      {Array.from({ length: 25 }, (_, i) => (
        <rect
          key={i}
          x={12 + (i % 5) * 20}
          y={12 + Math.floor(i / 5) * 20}
          width="16"
          height="16"
          rx="4"
          fill="var(--cyan)"
          opacity={on.includes(i) ? 0.9 : 0.15}
        />
      ))}
    </svg>
  );
}

function Cluster() {
  const dots = [
    [30, 40], [42, 30], [38, 52], [24, 58], [50, 46], [80, 70], [92, 62], [86, 84], [72, 86], [98, 80], [60, 22],
  ];
  return (
    <svg viewBox="0 0 120 120" className="size-28" aria-hidden>
      <path d="M38 46 C 60 50, 66 70, 86 74" fill="none" stroke="var(--cyan)" strokeDasharray="3 5" strokeWidth="2" opacity="0.6" />
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 6 : 4.5} fill="var(--cyan)" opacity={i < 5 ? 0.95 : 0.55} />
      ))}
    </svg>
  );
}

const cards = [
  {
    eyebrow: "Cetățeni",
    title: "Spui ce crezi în mai puțin de un minut.",
    text: "Scanezi codul QR, vorbești sau scrii, apoi votezi ideile celorlalți. Fără cont.",
    href: "/participa",
    cta: "Participă",
    Visual: Rings,
  },
  {
    eyebrow: "Primării și organizatori",
    title: "Pui întrebarea. Restul e live.",
    text: "Creezi consultarea, afișezi QR-ul și generezi compromisul când harta e gata.",
    href: "/organizer",
    cta: "Creează o consultare",
    Visual: Grid,
  },
  {
    eyebrow: "Public și presă",
    title: "Vezi cum se formează taberele.",
    text: "Ecranul mare arată harta opiniilor, punctele comune și sprijinul pe runde.",
    href: "/board",
    cta: "Deschide ecranul live",
    Visual: Cluster,
  },
];

export function Audience() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-28 sm:px-8 lg:pb-40">
      <h2 data-reveal className="max-w-3xl font-display text-display font-bold tracking-[-0.03em] text-balance">
        Construit pentru fiecare voce din oraș.
      </h2>
      <div data-stagger className="mt-12 grid gap-4 md:grid-cols-3">
        {cards.map(({ eyebrow, title, text, href, cta, Visual }) => (
          <Link key={href} href={href} className="glass tile group flex flex-col gap-4 rounded-[1.75rem] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <p className="eyebrow">{eyebrow}</p>
              <Visual />
            </div>
            <h3 className="font-display text-title font-bold text-balance">{title}</h3>
            <p className="text-ink-3">{text}</p>
            <span className="mt-auto inline-flex w-fit items-center gap-2 border-b border-current pt-4 pb-0.5 text-sm font-semibold text-ink-2 transition-colors group-hover:text-primary">
              {cta}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
