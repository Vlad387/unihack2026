import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

export default function HowItWorksPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-14">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Metodologie</p>
        <h1 className="text-4xl font-bold tracking-tight">Cum funcționează CityMind</h1>
        <p className="text-lg text-muted-foreground">
          De la sute de păreri la o propunere votată, în șase pași. AI-ul face munca grea de citit și sortat. Oamenii decid.
        </p>
      </header>

      <ol className="relative flex flex-col gap-6 border-l-2 border-border pl-8">
        {pipeline.map((step, i) => (
          <li key={step.title} className="relative">
            <span className="absolute -left-[2.85rem] flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{step.who}</p>
            <h2 className="mt-1 text-xl font-semibold">{step.title}</h2>
            <p className="mt-1 text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Regulile pe care nu le încălcăm</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
            {rules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

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
  );
}
