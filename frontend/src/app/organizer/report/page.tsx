import { PrintButton } from "@/components/print-button";
import { campColor } from "@/lib/colors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBridges, getClusters, getConsultation, getProposal, getSupport } from "@/lib/api";

const pct = (agree: number, total: number) => (total ? Math.round((agree / total) * 100) : 0);

export default async function ReportPage() {
  const [consultation, clusters, bridges, proposal, support] = await Promise.all([
    getConsultation(),
    getClusters(),
    getBridges(),
    getProposal(),
    getSupport(),
  ]);
  const color = campColor(clusters.camps);
  const last = support.at(-1);
  const finalPct = last ? pct(last.agree, last.total) : 0;
  const threshold = Math.round(consultation.threshold * 100);
  const passed = finalPct >= threshold;
  const campName = (id: string) => clusters.camps.find((c) => c.id === id)?.name ?? id;

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Raport final</p>
          <h1 className="text-2xl font-bold">{consultation.question}</h1>
          <p className="mt-1 text-muted-foreground">{consultation.context}</p>
        </div>
        <PrintButton />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Participanți", value: clusters.points.length },
          { label: "Tabere", value: clusters.camps.length },
          { label: "Runde", value: support.length },
          { label: `Sprijin final (prag ${threshold}%)`, value: `${finalPct}%` },
        ].map((s) => (
          <Card key={s.label} className="gap-1 py-4">
            <CardContent className="px-4">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p
        className={`rounded-lg p-4 font-semibold ${
          passed
            ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
            : "bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100"
        }`}
      >
        {passed
          ? `Propunerea a fost acceptată cu ${finalPct}% din voturile cetățenilor.`
          : `Propunerea nu a atins pragul de ${threshold}% (${finalPct}%).`}
      </p>

      {proposal && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Propunerea finală · runda {proposal.round}</CardTitle>
            <Badge variant="secondary" className="font-normal">
              Generat de AI
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p>{proposal.text}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {proposal.tradeoffs.map((t) => (
                <li key={t.camp_id}>
                  <strong style={{ color: color(t.camp_id) }}>{campName(t.camp_id)}:</strong> câștigă {t.gains.toLowerCase()};
                  cedează {t.gives_up.toLowerCase()}.
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tabere</CardTitle>
            <Badge variant="secondary" className="font-normal">
              Generat de AI
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {clusters.camps.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <span className="mt-1.5 size-3 shrink-0 rounded-full" style={{ background: color(c.id) }} />
                <div className="flex-1">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </div>
                <span className="tabular-nums">{c.size}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Puncte comune</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {bridges.map((b) => (
              <p key={b.id}>„{b.text}”</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sprijin pe runde</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1 font-normal">Runda</th>
                <th className="py-1 font-normal">Susțin</th>
                <th className="py-1 font-normal">Voturi</th>
                <th className="py-1 text-right font-normal">Sprijin</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {support.map((r) => (
                <tr key={r.round} className="border-t">
                  <td className="py-1">{r.round}</td>
                  <td className="py-1">{r.agree}</td>
                  <td className="py-1">{r.total}</td>
                  <td className="py-1 text-right font-semibold">{pct(r.agree, r.total)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            Procentele includ doar voturile cetățenilor reali. Opiniile simulate de AI nu sunt numărate.
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
