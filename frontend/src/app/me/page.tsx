import { WhereYouAre } from "@/components/where-you-are";
import { getBridges, getClusters, getSupport } from "@/lib/api";

export default async function MePage() {
  const [clusters, bridges, support] = await Promise.all([getClusters(), getBridges(), getSupport()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1 text-center">
        <p className="text-sm font-medium text-muted-foreground">Harta opiniilor</p>
        <h1 className="text-2xl font-bold">Unde te afli</h1>
      </header>
      <WhereYouAre initial={{ clusters, bridges, proposal: null, support }} />
    </main>
  );
}
