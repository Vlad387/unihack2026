import { Menu } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const siteLinks = [
  { href: "/", label: "Acasă" },
  { href: "/cum-functioneaza", label: "Cum funcționează" },
  { href: "/board", label: "Ecran live" },
  { href: "/organizer", label: "Organizatori" },
  { href: "/demo", label: "Demo" },
];

const link = "rounded-full px-3.5 py-2 text-sm text-ink-3 transition-colors hover:bg-white/5 hover:text-white";
const cta =
  "inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-shadow hover:shadow-[0_0_30px_-6px] hover:shadow-primary";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-full pr-2 pl-5">
        <Brand className="text-lg" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigare principală">
          {siteLinks.map((l) => (
            <Link key={l.href} href={l.href} className={link}>
              {l.label}
            </Link>
          ))}
          <Link href="/participa" data-magnetic className={`${cta} ml-2`}>
            Participă
          </Link>
        </nav>

        {/* <details> gives a working mobile menu with zero client JS */}
        <details className="group md:hidden">
          <summary
            className="grid size-10 list-none place-items-center rounded-full text-ink-2 hover:bg-white/5 [&::-webkit-details-marker]:hidden"
            aria-label="Meniu"
          >
            <Menu className="size-5" />
          </summary>
          <nav
            // anchored to <details> (Chrome makes it the containing block), so width is explicit
            className="glass absolute top-[calc(100%+0.75rem)] right-0 flex w-[min(20rem,calc(100vw-1.5rem))] flex-col gap-1 rounded-3xl bg-[color-mix(in_oklch,var(--carbon)_92%,var(--midnight))] p-3"
            aria-label="Navigare principală"
          >
            {siteLinks.map((l) => (
              <Link key={l.href} href={l.href} className={`${link} py-3 text-base`}>
                {l.label}
              </Link>
            ))}
            <Link href="/participa" className={`${cta} mt-1 h-12 text-base`}>
              Participă
            </Link>
          </nav>
        </details>

        {/* scroll progress, driven natively by animation-timeline: scroll() */}
        <span className="scroll-progress absolute inset-x-8 bottom-0 h-px bg-primary" aria-hidden />
      </div>
    </header>
  );
}
