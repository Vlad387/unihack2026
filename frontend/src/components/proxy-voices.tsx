import { Bot } from "lucide-react";
import type { ProxyOpinion } from "@/lib/types";

// Simulated voices of groups missing from the consultation (proxy agent). RULES.md section 3: always labeled
// simulated, visibly different from real camps (neutral dashed + hatched, never a camp color), text only, no numbers.
export function ProxyVoices({ proxies, compact = false }: { proxies?: ProxyOpinion[]; compact?: boolean }) {
  if (!proxies?.length) return null;

  return (
    <section className={`flex flex-col ${compact ? "gap-2" : "gap-3"}`} aria-label="Voci care lipsesc, simulate de AI">
      <div className="flex flex-col gap-1">
        <h2 className={compact ? "text-sm font-semibold" : "font-semibold"}>Voci care lipsesc</h2>
        {!compact && (
          <p className="text-sm text-muted-foreground">
            Grupuri care nu au participat, imaginate de AI ca mediatorul să nu le uite. Nu sunt voturi și nu intră în
            procente.
          </p>
        )}
      </div>
      <ul className="flex flex-col gap-2">
        {proxies.map((p) => (
          <li
            key={p.group}
            className={`rounded-lg border border-dashed border-foreground/35 bg-[repeating-linear-gradient(135deg,transparent_0_10px,color-mix(in_oklch,var(--foreground)_4%,transparent)_10px_20px)] ${compact ? "p-2.5 text-xs" : "p-3 text-sm"}`}
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold">{p.group}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-foreground/40 px-2 py-0.5 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                <Bot className="size-3" aria-hidden />
                Simulat de AI
              </span>
            </div>
            <p className="text-muted-foreground italic">„{p.text}”</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
