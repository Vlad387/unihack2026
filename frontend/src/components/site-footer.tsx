import Link from "next/link";
import { siteLinks } from "@/components/site-header";
import { Wordmark } from "@/components/wordmark";

const columns = [
  { title: "Platformă", links: siteLinks },
  {
    title: "Participă",
    links: [
      { href: "/participa", label: "Răspunde la întrebare" },
      { href: "/vote", label: "Votează afirmațiile" },
      { href: "/me", label: "Unde te afli" },
      { href: "/proposal", label: "Votează compromisul" },
    ],
  },
];

// Template footer: a dark rounded card sitting on the violet end of the page, wordmark top-left.
export function SiteFooter() {
  return (
    <footer className="footer-wrap mt-auto px-3 pt-3 pb-3 sm:px-5 sm:pb-5">
      <div className="footer-card on-dark mx-auto flex max-w-7xl flex-col gap-14 rounded-3xl px-6 pt-12 pb-8 sm:px-10">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="flex flex-col gap-4 md:col-span-5">
            <Link href="/" className="w-fit" aria-label="CityMind, acasă">
              <Wordmark className="h-16 w-auto sm:h-20" />
            </Link>
            <p className="max-w-sm text-sm text-ink-3">
              Consultare publică cu AI: oamenii spun ce cred, AI-ul găsește punctele comune, toți votează compromisul.
            </p>
          </div>
          {columns.map((c) => (
            <nav key={c.title} className="flex flex-col gap-2.5 text-sm md:col-span-3" aria-label={c.title}>
              <p className="font-semibold">{c.title}</p>
              {c.links.map((l) => (
                <Link key={l.href} href={l.href} className="w-fit text-ink-3 transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="flex flex-col gap-2 border-t border-[var(--cyan-line)] pt-6 text-xs text-ink-4 sm:flex-row sm:justify-between">
          <p>© 2026 CityMind · Proiect UniHack</p>
          <a href="https://github.com/Vlad387/unihack2026" className="w-fit transition-colors hover:text-foreground">
            Cod și metodologie pe GitHub ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
