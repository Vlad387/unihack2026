import { CheckCircle2, XCircle } from "lucide-react";
import type { Verdict } from "@/lib/types";

const checks: { key: keyof Omit<Verdict, "notes">; label: string }[] = [
  { key: "faithful", label: "Fidelă argumentelor reale" },
  { key: "balanced", label: "Echilibrată între tabere" },
  { key: "feasible", label: "Legală și realizabilă" },
];

// The critic agent's check of a proposal. Always labeled as AI; icon + word, never color alone.
export function VerdictView({ verdict }: { verdict: Verdict }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verificare automată (AI)</p>
      <ul className="flex flex-col gap-1">
        {checks.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-2">
            {verdict[key] ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <XCircle className="size-4 shrink-0 text-rose-600" aria-hidden />
            )}
            <span>
              {label}: <strong>{verdict[key] ? "da" : "nu"}</strong>
            </span>
          </li>
        ))}
      </ul>
      {verdict.notes && <p className="text-muted-foreground">{verdict.notes}</p>}
    </div>
  );
}
