import { PagePreview } from "@/components/page-preview";

const groups = [
  {
    title: "Site public",
    text: "Ce vede oricine intră pe site.",
    device: "desktop" as const,
    pages: [
      { href: "/", title: "Acasă", text: "Prezentarea proiectului și harta opiniilor." },
      { href: "/cum-functioneaza", title: "Cum funcționează", text: "Metodologia: agenți AI, hartă, puncte comune, runde de vot." },
    ],
  },
  {
    title: "Parcursul cetățeanului",
    text: "Pe telefon, după scanarea codului QR. Patru pași.",
    device: "phone" as const,
    pages: [
      { href: "/participa", title: "1. Răspunde", text: "Cu vocea sau în scris." },
      { href: "/vote", title: "2. Votează afirmațiile", text: "De acord, nu sunt de acord, nu știu." },
      { href: "/me", title: "3. Unde te afli", text: "Locul tău pe harta opiniilor." },
      { href: "/proposal", title: "4. Votează compromisul", text: "Propunerea AI și ce câștigă fiecare tabără." },
    ],
  },
  {
    title: "Ecran live",
    text: "Pe proiector, în timpul consultării. Treci cu mouse-ul peste puncte.",
    device: "desktop" as const,
    pages: [{ href: "/board", title: "Ecran live", text: "Harta animată, punctele comune, sprijinul pe runde și codul QR." }],
  },
  {
    title: "Organizator",
    text: "Pentru cine creează și conduce consultarea.",
    device: "desktop" as const,
    pages: [
      { href: "/organizer", title: "Consultare nouă", text: "Întrebare, context, prag și cod QR." },
      { href: "/organizer/moderation", title: "Moderare", text: "Afirmații semnalate de AI." },
      { href: "/organizer/kpi", title: "KPI și performanță", text: "Toți indicatorii, cu filtre." },
      { href: "/organizer/report", title: "Raport final", text: "Rezultatul consultării, descărcabil ca PDF." },
    ],
  },
];

export default function DemoPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-14">
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Demo</p>
        <h1 className="text-4xl font-bold tracking-tight">Toate paginile CityMind, într-un singur loc</h1>
        <p className="text-lg text-muted-foreground">
          Fiecare previzualizare e pagina reală, live: poți da clic, vota și trece peste hartă direct aici, sau o deschizi pe tot
          ecranul.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.title} className="flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{g.title}</h2>
            <p className="text-muted-foreground">{g.text}</p>
          </div>
          <div className="flex flex-wrap gap-8">
            {g.pages.map((p) => (
              <PagePreview key={p.href} device={g.device} {...p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
