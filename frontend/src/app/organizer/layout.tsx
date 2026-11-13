import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";

const links = [
  { href: "/organizer", label: "Consultare" },
  { href: "/organizer/moderation", label: "Moderare" },
  { href: "/organizer/kpi", label: "KPI" },
  { href: "/organizer/report", label: "Raport" },
  { href: "/board", label: "Ecran live" },
];

export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">
      <nav className="flex flex-wrap items-center gap-1 border-b pb-3 print:hidden">
        <span className="mr-3 flex items-center gap-2">
          <Brand />
          <span className="text-sm text-muted-foreground">Organizator</span>
        </span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
