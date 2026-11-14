import { Menu } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { NavLink } from "@/components/nav-link";
import { ThemeToggle } from "@/components/theme-toggle";

export const siteLinks = [
  { href: "/", label: "Acasă" },
  { href: "/cum-functioneaza", label: "Cum funcționează" },
  { href: "/board", label: "Rundele" },
  { href: "/simulare", label: "Simulare" },
  { href: "/organizer", label: "Admin" },
  { href: "/demo", label: "Admin Demo" },
];

const link = "rounded-lg px-3 py-2 text-sm whitespace-nowrap font-medium text-ink-2 transition-colors hover:bg-foreground/5 hover:text-foreground";
const cta =
  "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="glass relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-full pr-2 pl-5">
        <Brand className="text-lg" />

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigare principală">
            {siteLinks.map((l) => (
              <NavLink key={l.href} href={l.href} label={l.label} className={link} />
            ))}
            <Link href="/participa" className={`${cta} ml-2`}>
              Participă
            </Link>
          </nav>
          <ThemeToggle className="lg:order-first" />

          {/* <details> gives a working mobile menu with zero client JS */}
          <details className="group lg:hidden">
            <summary
              className="grid size-10 list-none place-items-center rounded-full text-ink-2 hover:bg-foreground/5 [&::-webkit-details-marker]:hidden"
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
                <NavLink key={l.href} href={l.href} label={l.label} className={`${link} py-3 text-base`} />
              ))}
              <Link href="/participa" className={`${cta} mt-1 h-12 text-base`}>
                Participă
              </Link>
            </nav>
          </details>
        </div>

        {/* scroll progress, driven natively by animation-timeline: scroll() */}
        <span className="scroll-progress absolute inset-x-6 -bottom-px h-[3px] rounded-full bg-[linear-gradient(90deg,oklch(58%_0.25_300),oklch(68%_0.15_235))]" aria-hidden />
      </div>
    </header>
  );
}
