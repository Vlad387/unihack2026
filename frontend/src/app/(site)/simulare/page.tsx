import { SimulationDashboard } from "@/components/simulation/dashboard";
import { PageHero } from "@/components/site/page-hero";
import { getBridges, getClusters, getProposal, getQuestion, getSupport } from "@/lib/api";

// Live data on purpose: LIVE mode starts from the real backend state, then follows the WebSocket.
export const instant = false;

export default async function SimulationPage() {
  const [question, clusters, bridges, proposal, support] = await Promise.all([
    getQuestion(),
    getClusters(),
    getBridges(),
    getProposal(),
    getSupport(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Simulare"
        title="De la păreri împrăștiate la un compromis votat"
        text="Toți cei 9 pași ai unei consultări, pe o singură pagină. DEMO rulează pe date fictive în browser; LIVE arată datele reale de pe server."
      />
      <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8">
        <SimulationDashboard question={question} initial={{ clusters, bridges, proposal, support }} />
      </div>
    </>
  );
}
