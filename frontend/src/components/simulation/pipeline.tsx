import { Check, Loader2 } from "lucide-react";
import { STAGES, type StageStatus } from "@/lib/simulation";

const LABEL: Record<StageStatus, string> = { waiting: "În așteptare", processing: "În lucru", done: "Gata" };

// The 9 pipeline stages; status is shown as icon + word, never color alone.
export function Pipeline({ statuses }: { statuses: StageStatus[] }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3">
      {STAGES.map((s, i) => {
        const st = statuses[i];
        return (
          <li
            key={s.title}
            aria-current={st === "processing" ? "step" : undefined}
            className={`flex items-start gap-3 rounded-xl border p-3 transition-colors duration-500 ${
              st === "processing"
                ? "border-[var(--cyan)] bg-[var(--cyan)]/10"
                : st === "done"
                  ? "border-emerald-600/40 bg-emerald-600/[0.06]"
                  : "border-foreground/10 opacity-70"
            }`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-bold ${
                st === "done" ? "bg-emerald-600 text-white" : st === "processing" ? "bg-[var(--cyan)] text-white" : "bg-foreground/10"
              }`}
              aria-hidden
            >
              {st === "done" ? <Check className="size-4" /> : st === "processing" ? <Loader2 className="size-4 animate-spin" /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm leading-tight font-semibold">{s.title}</span>
              <span className="truncate font-mono text-[0.7rem] text-ink-3">{s.api}</span>
              <span className="mt-1 text-xs font-medium">{LABEL[st]}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
