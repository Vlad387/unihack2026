// Mark: three opinion dots joined by a bridge, the core idea of CityMind. shortcut: placeholder until the team has a real logo.
// Tile = the hero band's violet fading to sky blue, same in both themes; marks in white + the wordmark's ice.
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        {/* same id on every logo is fine: the definitions are identical */}
        <linearGradient id="logo-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(58% 0.25 300)" />
          <stop offset="1" stopColor="oklch(68% 0.15 235)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-tile)" />
      <path d="M9 20 L16 11 L23 20" fill="none" strokeWidth="2" strokeLinecap="round" stroke="white" strokeOpacity="0.55" />
      <path d="M9 20 H23" fill="none" strokeWidth="2" strokeLinecap="round" stroke="white" />
      <circle cx="9" cy="20" r="3.2" fill="white" />
      <circle cx="23" cy="20" r="3.2" fill="white" />
      <circle cx="16" cy="11" r="3.2" fill="oklch(93% 0.065 200)" />
    </svg>
  );
}
