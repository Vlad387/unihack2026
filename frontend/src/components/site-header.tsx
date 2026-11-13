import { Menu } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";

export const siteLinks = [
  { href: "/", label: "Acasă" },
  { href: "/cum-functioneaza", label: "Cum funcționează" },
  { href: "/board", label: "Ecran live" },
  { href: "/organizer", label: "Organizatori" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Brand className="text-lg" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigare principală">
          {siteLinks.map((l) => (
            <Link key={l.href} href={l.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {l.label}
            </Link>
          ))}
          <Link href="/participa" className={buttonVariants({ size: "sm", className: "ml-2" })}>
            Participă
          </Link>
        </nav>

        {/* <details> gives a working mobile menu with zero client JS */}
        <details className="relative md:hidden">
          <summary className={buttonVariants({ variant: "ghost", size: "icon", className: "list-none" })} aria-label="Meniu">
            <Menu />
          </summary>
          <nav
            className="absolute right-0 mt-2 flex w-56 flex-col gap-1 rounded-xl border bg-card p-2 shadow-lg"
            aria-label="Navigare principală"
          >
            {siteLinks.map((l) => (
              <Link key={l.href} href={l.href} className={buttonVariants({ variant: "ghost", className: "justify-start" })}>
                {l.label}
              </Link>
            ))}
            <Link href="/participa" className={buttonVariants({ className: "mt-1" })}>
              Participă
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
