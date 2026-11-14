import { Mic } from "lucide-react";

// Illustrations only (aria-hidden by the caller): they show what each screen looks like, they are not controls.
const panel = "rounded-2xl border border-input bg-white/[0.04] p-5";

export function MicVisual() {
  const bars = [6, 14, 22, 10, 28, 18, 32, 12, 24, 8, 20, 14, 26, 10, 16, 6];
  return (
    <div className="flex flex-col gap-5 @md:flex-row @md:items-center">
      <div className="relative grid size-20 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_60px_-10px] shadow-primary">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25 motion-reduce:hidden" />
        <Mic className="relative size-8" />
      </div>
      <div className={`${panel} flex-1`}>
        <div className="flex h-8 items-center gap-1">
          {bars.map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-primary/70" style={{ height: h }} />
          ))}
          <span className="ml-3 font-mono text-meta text-ink-4">0:12</span>
        </div>
        <p className="mt-3 text-ink-3">„Aș vrea mai multă liniște după miezul nopții, dar și…”</p>
      </div>
    </div>
  );
}

export function VoteVisual() {
  return (
    <div className={panel}>
      <p className="text-lg font-medium text-ink-2">„Terasele să se închidă la 23:00 în zilele lucrătoare.”</p>
      <div className="mt-5 grid gap-2 text-center text-sm font-semibold @sm:grid-cols-3">
        <span className="rounded-xl bg-primary px-3 py-2.5 text-primary-foreground">De acord</span>
        <span className="rounded-xl border border-input px-3 py-2.5 text-ink-2">Nu sunt de acord</span>
        <span className="rounded-xl border border-input px-3 py-2.5 text-ink-2">Nu știu</span>
      </div>
    </div>
  );
}

// three deterministic clusters, so server and client draw the same dots
const centers: [number, number, string][] = [
  [70, 70, "var(--series-1)"],
  [210, 60, "var(--series-3)"],
  [150, 150, "var(--series-7)"],
];
const dots = centers.flatMap(([cx, cy, fill], k) =>
  Array.from({ length: 11 }, (_, i) => {
    const a = i * 2.4 + k;
    const r = 6 + ((i * 7) % 26);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.8, fill };
  }),
);

export function MapVisual() {
  return (
    <div className={panel}>
      <svg viewBox="0 0 280 200" className="h-auto w-full">
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r="5" style={{ fill: d.fill }} opacity="0.9" />
        ))}
        <circle cx="160" cy="138" r="11" fill="none" stroke="var(--cyan)" strokeWidth="2" />
        <circle cx="160" cy="138" r="5" fill="var(--signal)" />
        <text x="176" y="128" fill="var(--signal)" fontSize="13" fontWeight="700">
          Tu
        </text>
      </svg>
    </div>
  );
}

export function ProposalVisual() {
  return (
    <div className={panel}>
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Propunerea · runda 2</span>
        <span className="rounded-full border border-primary/40 px-2.5 py-0.5 font-mono text-meta text-primary">Generat de AI</span>
      </div>
      <p className="mt-3 text-ink-2">
        Terase închise la 23:00, interiorul deschis până la 02:00 în weekend pentru localurile izolate fonic, autobuze de
        noapte.
      </p>
      <div className="mt-5 flex justify-between font-mono text-meta text-ink-3">
        <span>Sprijin 72%</span>
        <span>Prag 60%</span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-white/10">
        <div className="h-full w-[72%] rounded-full bg-primary" />
        <span className="absolute -top-1 left-[60%] h-4 w-px bg-white" />
      </div>
    </div>
  );
}
