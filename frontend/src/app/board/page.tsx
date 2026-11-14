import Link from "next/link";
import { LiveBoard } from "@/components/live-board";
import { siteLinks } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import { getBridges, getClusters, getProposal, getQuestion, getSupport } from "@/lib/api";

export default async function BoardPage() {
  const [question, clusters, bridges, proposal, support] = await Promise.all([
    getQuestion(),
    getClusters(),
    getBridges(),
    getProposal(),
    getSupport(),
  ]);

  return (
    <main className="dark flex flex-1 flex-col bg-background px-4 py-6 text-foreground lg:px-8">
      {/* small and right-aligned: on the projector the map stays the focus, but nobody is stuck on this page */}
      <nav aria-label="Navigare principală" className="mb-4 flex flex-wrap items-center justify-end gap-1 print:hidden">
        {siteLinks.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={l.href === "/board" ? "page" : undefined}
            className={buttonVariants({ variant: l.href === "/board" ? "secondary" : "ghost", size: "sm" })}
          >
            {l.label}
          </Link>
        ))}
        <Link href="/participa" className={buttonVariants({ size: "sm", className: "ml-1" })}>
          Participă
        </Link>
      </nav>
      <LiveBoard question={question} initial={{ clusters, bridges, proposal, support }} />
    </main>
  );
}
