// Suspense fallback for every page: pages that read live API data (map, board, KPI) stream in behind it,
// which cacheComponents requires instead of blocking the whole route.
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-8" role="status" aria-live="polite">
      <span className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="size-2.5 animate-pulse rounded-full bg-primary" aria-hidden /> Se încarcă…
      </span>
    </div>
  );
}
