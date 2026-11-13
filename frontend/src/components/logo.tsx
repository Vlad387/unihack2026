// Mark: three opinion dots joined by a bridge, the core idea of CityMind. shortcut: placeholder until the team has a real logo.
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path d="M9 20 L16 11 L23 20" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-primary-foreground/60" />
      <path d="M9 20 H23" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-brand-amber" />
      <circle cx="9" cy="20" r="3.2" className="fill-primary-foreground" />
      <circle cx="23" cy="20" r="3.2" className="fill-primary-foreground" />
      <circle cx="16" cy="11" r="3.2" className="fill-brand-amber" />
    </svg>
  );
}
