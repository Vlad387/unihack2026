import { ProposalVote } from "@/components/proposal-vote";
import { getBridges, getClusters, getProposal, getQuestion, getSupport } from "@/lib/api";

export default async function ProposalPage() {
  const [question, clusters, bridges, proposal, support] = await Promise.all([
    getQuestion(),
    getClusters(),
    getBridges(),
    getProposal(),
    getSupport(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1 text-center">
        <p className="text-sm font-medium text-muted-foreground">Compromisul propus</p>
        <h1 className="text-lg font-semibold">{question}</h1>
      </header>
      <ProposalVote initial={{ clusters, bridges, proposal, support }} />
    </main>
  );
}
