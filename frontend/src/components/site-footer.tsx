import Link from "next/link";
import { Brand } from "@/components/brand";
import { siteLinks } from "@/components/site-header";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="flex max-w-sm flex-col gap-2">
          <Brand />
          <p className="text-sm text-muted-foreground">
            Consultare publică cu AI: oamenii spun ce cred, AI-ul găsește punctele comune, toți votează compromisul.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm" aria-label="Linkuri subsol">
          {[...siteLinks, { href: "/participa", label: "Participă" }].map((l) => (
            <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>Proiect UniHack 2026</p>
          <a href="https://github.com/Vlad387/unihack2026" className="hover:text-foreground">
            Cod și metodologie pe GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
