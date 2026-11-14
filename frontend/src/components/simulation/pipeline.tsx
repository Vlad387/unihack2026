import { Check, Loader2 } from "lucide-react";
import { STAGES, type StageStatus } from "@/lib/simulation";

const LABEL: Record<StageStatus, string> = { waiting: "În așteptare", processing: "În lucru", done: "Gata" };

// The 9 pipeline stages as a vertical timeline. The current stage is highlighted and carries the explanation;
// status is always icon + word (screen readers, color-blind viewers), never color alone.
export function Pipeline({ statuses, note }: { statuses: StageStatus[]; note: string }) {
  const done = statuses.filter((s) => s === "done").length;
  return (
    <section className="rounded-2xl border border-foreground/10 bg-[var(--glass)] p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-ink-3 uppercase">Procesul</h3>
        <span className="font-mono text-meta text-ink-3 tabular-nums">
          {done} / {STAGES.length} pași
        </span>
      </div>
      <ol className="flex flex-col">
        {STAGES.map((s, i) => {
          const st = statuses[i];
          const last = i === STAGES.length - 1;
          return (
            <li key={s.title} aria-current={st === "processing" ? "step" : undefined} className="grid grid-cols-[auto_1fr] gap-x-3">
              <div className="flex flex-col items-center">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold transition-colors duration-500 ${
                    st === "done" ? "bg-emerald-600 text-white" : st === "processing" ? "bg-[var(--cyan)] text-white" : "bg-foreground/10 text-ink-3"
                  }`}
                  aria-hidden
                >
                  {st === "done" ? <Check className="size-3.5" /> : st === "processing" ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                </span>
                {!last && <span className={`w-0.5 flex-1 ${st === "done" ? "bg-emerald-600/50" : "bg-foreground/10"}`} aria-hidden />}
              </div>
              <div className={`pb-4 ${st === "waiting" ? "opacity-55" : ""}`}>
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm leading-6">
                  <span className={st === "processing" ? "font-semibold" : "font-medium"}>{s.title}</span>
                  <span className="sr-only">{LABEL[st]}</span>
                </p>
                {st === "processing" && (
                  <div className="mt-1 rounded-lg bg-[var(--cyan)]/10 p-2.5 text-sm" aria-live="polite">
                    <p>{note}</p>
                    <p className="mt-1 font-mono text-[0.7rem] text-ink-3">{s.api}</p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {statuses.every((st) => st === "done") && (
        <p className="rounded-lg bg-emerald-600/10 p-2.5 text-sm font-medium" aria-live="polite">
          {note}
        </p>
      )}
    </section>
  );
}
