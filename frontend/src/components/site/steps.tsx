import { MapVisual, MicVisual, ProposalVisual, VoteVisual } from "@/components/site/step-visuals";

const steps = [
  {
    id: "pas-1",
    title: "Spune-ți părerea",
    text: "Scanezi codul QR și răspunzi cu vocea sau în scris. Fără cont, în mai puțin de un minut.",
    Visual: MicVisual,
  },
  {
    id: "pas-2",
    title: "Votează ideile celorlalți",
    text: "De acord, nu sunt de acord sau nu știu. Fiecare vot contează la fel.",
    Visual: VoteVisual,
  },
  {
    id: "pas-3",
    title: "Vezi unde te afli",
    text: "Harta opiniilor arată taberele care se formează și locul tău printre ele.",
    Visual: MapVisual,
  },
  {
    id: "pas-4",
    title: "Votează compromisul",
    text: "AI-ul propune o soluție pornind de la punctele comune. Dacă nu trece pragul, o rescrie.",
    Visual: ProposalVisual,
  },
];

// Storytelling: on desktop the index stays pinned (CSS sticky, so it also works without JS) while the
// step cards scroll past; GSAP lights up the current step and fills the progress line.
export function Steps() {
  return (
    <section
      id="cum-participi"
      data-steps
      className="mx-auto grid w-full max-w-7xl gap-12 px-4 pt-24 pb-24 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:pt-64 lg:pb-40"
    >
      <div className="lg:col-span-5">
        <div className="flex flex-col gap-8 lg:sticky lg:top-32">
          <p className="eyebrow">Cum participi</p>
          <h2 className="font-display text-display font-bold tracking-[-0.03em]">
            Patru pași,
            <br />
            <span className="text-ink-3">cinci minute.</span>
          </h2>
          <ol className="relative hidden flex-col border-l border-line lg:flex">
            <span data-steps-bar className="absolute top-0 -left-px h-full w-px origin-top bg-primary" aria-hidden />
            {steps.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  data-step-link={s.id}
                  data-active={i === 0 ? "" : undefined}
                  className="group flex items-baseline gap-4 py-3 pl-6 text-ink-4 transition-colors duration-500 hover:text-white data-[active]:text-white"
                >
                  <span className="font-mono text-meta text-primary/60 transition-colors group-data-[active]:text-primary">
                    0{i + 1}
                  </span>
                  <span className="font-display text-title font-semibold">{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:col-span-7 lg:gap-[16vh]">
        {steps.map(({ id, title, text, Visual }, i) => (
          <article
            key={id}
            id={id}
            data-step={id}
            data-reveal
            className="glass tile relative scroll-mt-28 overflow-hidden rounded-[2rem] p-6 sm:p-10"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 -right-3 font-display text-[clamp(7rem,18vw,14rem)] leading-none font-bold text-transparent [-webkit-text-stroke:1px_var(--cyan-line)]"
            >
              0{i + 1}
            </span>
            <p className="eyebrow">Pasul {i + 1} din 4</p>
            <h3 className="mt-3 font-display text-title font-bold">{title}</h3>
            <p className="mt-3 max-w-md text-ink-3">{text}</p>
            <div className="mt-8" aria-hidden>
              <Visual />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
