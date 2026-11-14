import Link from "next/link";
import { Brand } from "@/components/brand";
import { siteLinks } from "@/components/site-header";

export function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-16 pb-10 sm:px-8 md:grid-cols-12">
        <div className="flex flex-col gap-3 md:col-span-5">
          <Brand className="text-lg" />
          <p className="max-w-sm text-sm text-ink-3">
            Consultare publică cu AI: oamenii spun ce cred, AI-ul găsește punctele comune, toți votează compromisul.
          </p>
        </div>
        <nav className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:col-span-4" aria-label="Linkuri subsol">
          {[...siteLinks, { href: "/participa", label: "Participă" }].map((l) => (
            <Link key={l.href} href={l.href} className="w-fit text-ink-3 transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-2 font-mono text-meta tracking-[0.08em] text-ink-4 uppercase md:col-span-3">
          <p>Proiect UniHack 2026</p>
          <a href="https://github.com/Vlad387/unihack2026" className="w-fit transition-colors hover:text-primary">
            Cod și metodologie pe GitHub ↗
          </a>
        </div>
      </div>
      <p
        aria-hidden
        className="pointer-events-none translate-y-[22%] px-4 font-display text-[clamp(4.5rem,21vw,19rem)] leading-[0.8] font-bold tracking-[-0.05em] whitespace-nowrap text-transparent select-none [-webkit-text-stroke:1px_var(--cyan-line)] sm:px-8"
      >
        CityMind
      </p>
    </footer>
  );
}
