export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

// Value leads (strong), series name follows; series keyed with a short line, not a box.
export function ChartTooltip({ left, top, title, rows }: { left: number; top: number; title?: string; rows: TooltipRow[] }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg"
      style={{ left: `${Math.min(Math.max(left * 100, 14), 86)}%`, top: `${Math.max(top * 100, 20)}%` }}
    >
      {title && <p className="mb-1 text-xs text-muted-foreground">{title}</p>}
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 whitespace-nowrap">
          {r.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: r.color }} aria-hidden />}
          <span className="font-semibold tabular-nums">{r.value}</span>
          <span className="text-xs text-muted-foreground">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

export function Legend({ items, shape = "line" }: { items: { label: string; color: string; dashed?: boolean }[]; shape?: "line" | "box" }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          {shape === "box" ? (
            <span className="size-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          ) : (
            <span
              className="w-4 border-t-2"
              style={{ borderColor: i.color, borderStyle: i.dashed ? "dashed" : "solid" }}
              aria-hidden
            />
          )}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
