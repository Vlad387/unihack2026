import { LiveBoard } from "@/components/live-board";
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
    <main className="flex flex-1 flex-col px-4 py-6 lg:px-8">
      <LiveBoard question={question} initial={{ clusters, bridges, proposal, support }} />
    </main>
  );
}
