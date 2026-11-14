import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";

const pipeline = [
  {
    who: "Agent AI · Intake",
    title: "Curățăm și împărțim răspunsurile",
    text: "Fiecare răspuns, scris sau vorbit, e transformat în afirmații scurte. Limbajul abuziv, datele personale și mesajele în afara subiectului sunt semnalate și ajung la moderare.",
  },
  {
    who: "Oameni",
    title: "Toată lumea votează afirmațiile",
    text: "Fiecare participant votează afirmațiile celorlalți: de acord, nu sunt de acord sau nu știu.",
  },
  {
    who: "Algoritm · Clustering",
    title: "Desenăm harta opiniilor",
    text: "Voturile și textele sunt transformate în vectori (embeddings), reduse la două dimensiuni cu UMAP și grupate în tabere cu HDBSCAN. Fiecare punct de pe hartă e un participant.",
  },
  {
    who: "Algoritm · Bridges",
    title: "Găsim punctele comune",
    text: "Căutăm afirmațiile cu acord mare în fiecare tabără, nu doar în total. Ele sunt baza oricărui compromis.",
  },
  {
    who: "Agent AI · Mediator + Critic",
    title: "Propunem un compromis",
    text: "Mediatorul scrie o propunere și ce câștigă și cedează fiecare tabără. Criticul verifică dacă e fidelă argumentelor reale, echilibrată, legală și posibilă.",
  },
  {
    who: "Oameni",
    title: "Votăm, în runde",
    text: "Dacă propunerea nu atinge pragul ales de organizator, mediatorul o rescrie ținând cont de critici, și votăm din nou.",
  },
];

const rules = [
  "Orice text generat de AI e etichetat „Generat de AI”.",
  "Opiniile simulate pentru grupuri absente sunt marcate „simulat”, au altă culoare și nu intră niciodată în procente.",
  "Nu cerem cont, nume, telefon sau email.",
  "Prompturile agenților și codul sunt publice, ca oricine să poată verifica metoda.",
];

const GRADIENT = "bg-[linear-gradient(135deg,oklch(58%_0.25_300),oklch(68%_0.15_235))]";
// accent -> blue: violet on the light theme, turquoise on dark, both readable as large text
const TEXT_GRADIENT = "bg-[linear-gradient(90deg,var(--cyan),oklch(55%_0.17_245))]";

export default function HowItWorksPage() {
  return (
    <>
      {/* one band behind the hero AND the steps, so the violet -> ice gradient runs down to about step 4 */}
      <div className="band-top -mt-[4.25rem] pt-[4.25rem]">
        <PageHero
          band={false}
          eyebrow="Metodologie"
          title="Cum funcționează CityMind"
          text="De la sute de păreri la o propunere votată, în șase pași. AI-ul face munca grea de citit și sortat. Oamenii decid."
        />
        <div className="mx-auto w-full max-w-3xl px-4 pb-16">
          <ol className="relative flex flex-col gap-6 border-l-2 border-[var(--cyan-line)] pl-8">
            {pipeline.map((step, i) => (
              <li key={step.title} className="relative">
                <span
                  className={`absolute -left-[2.85rem] flex size-9 items-center justify-center rounded-full text-sm font-bold text-white shadow ${GRADIENT}`}
                >
                  {i + 1}
                </span>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{step.who}</p>
                <h2 className={`mt-1 w-fit bg-clip-text text-xl font-bold text-transparent ${TEXT_GRADIENT}`}>{step.title}</h2>
                <p className="mt-1 text-ink-2">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-16">
        <section className="flex flex-col gap-4 rounded-2xl border border-[var(--cyan-line)] bg-[linear-gradient(135deg,color-mix(in_oklch,var(--violet)_20%,var(--carbon)),color-mix(in_oklch,var(--wash)_75%,var(--carbon)))] p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight">Regulile noastre</h2>
          <ul className="flex flex-col gap-3">
            {rules.map((r) => (
              <li key={r} className="flex gap-3 text-ink-2">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--cyan)]" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/participa" className={buttonVariants({ size: "lg", className: "h-12 px-6 text-base" })}>
            Participă acum
          </Link>
          <a
            href="https://github.com/Vlad387/unihack2026"
            className={buttonVariants({ variant: "outline", size: "lg", className: "h-12 px-6 text-base" })}
          >
            Vezi codul pe GitHub
          </a>
        </div>
      </div>
    </>
  );
}
