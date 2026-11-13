import { KpiDashboard } from "@/components/kpi-dashboard";
import { getBridges, getClusters, getConsultation, getKpis, getProposal, getSupport } from "@/lib/api";

export default async function KpiPage() {
  const [kpis, consultation, clusters, bridges, proposal, support] = await Promise.all([
    getKpis(),
    getConsultation(),
    getClusters(),
    getBridges(),
    getProposal(),
    getSupport(),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">KPI</h1>
        <p className="text-muted-foreground">{consultation.question}</p>
      </header>
      <KpiDashboard kpis={kpis} threshold={consultation.threshold} initial={{ clusters, bridges, proposal, support }} />
    </section>
  );
}
