import { PagePreview } from "@/components/page-preview";
import { citizenPages } from "@/components/site/citizen-journey";
import { PageHero } from "@/components/site/page-hero";

const groups = [
  {
    title: "Site public",
    text: "Ce vede oricine intră pe site.",
    device: "desktop" as const,
    pages: [
      { href: "/", title: "Acasă", text: "Prezentarea proiectului și harta opiniilor." },
      {
        href: "/cum-functioneaza",
        title: "Cum funcționează",
        text: "Metodologia: agenți AI, hartă, puncte comune, runde de vot.",
      },
    ],
  },
  {
    title: "Parcursul cetățeanului",
    text: "Pe telefon, după scanarea codului QR. Patru pași.",
    device: "phone" as const,
    pages: citizenPages,
  },
  {
    title: "Rundele",
    text: "Pe proiector, în timpul consultării. Treci cu mouse-ul peste puncte.",
    device: "desktop" as const,
    pages: [{ href: "/board", title: "Rundele", text: "Harta animată, punctele comune, sprijinul pe runde și codul QR." }],
  },
  {
    title: "Admin",
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
    <>
      <PageHero
        eyebrow="Admin Demo"
        title="Toate paginile CityMind, într-un singur loc"
        text="Fiecare previzualizare e pagina reală, live: poți da clic, vota și trece peste hartă direct aici, sau o deschizi pe tot ecranul."
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-16">
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
    </>
  );
}
