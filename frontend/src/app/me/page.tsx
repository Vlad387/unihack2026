import { Brand } from "@/components/brand";
import { WhereYouAre } from "@/components/where-you-are";
import { getBridges, getClusters, getSupport } from "@/lib/api";

export default async function MePage() {
  const [clusters, bridges, support] = await Promise.all([getClusters(), getBridges(), getSupport()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1 text-center">
        <Brand className="mx-auto mb-2 text-lg" />
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Pasul 3 din 4 · Harta opiniilor</p>
        <h1 className="text-2xl font-bold">Unde te afli</h1>
      </header>
      <WhereYouAre initial={{ clusters, bridges, proposal: null, support }} />
    </main>
  );
}
