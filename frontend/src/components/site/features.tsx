// Four principle cards (template "feature row"): bold title, two lines of text, one gradient shape at the bottom.
function Shape({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 200 110" className="mt-auto h-28 w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(72% 0.2 305)" />
          <stop offset="1" stopColor="oklch(42% 0.25 290)" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>{children}</g>
    </svg>
  );
}

const cards = [
  {
    title: "Puncte comune, nu majorități",
    text: "Căutăm ce acceptă fiecare tabără, oricât de mică, nu doar ce vrea cea mai mare.",
    shape: (
      <Shape id="f-common">
        <circle cx="78" cy="62" r="40" opacity="0.55" />
        <circle cx="122" cy="62" r="40" opacity="0.85" />
      </Shape>
    ),
  },
  {
    title: "AI-ul e mereu etichetat",
    text: "Tot ce scrie AI-ul e marcat „Generat de AI”. Deciziile rămân ale oamenilor.",
    shape: (
      <Shape id="f-label">
        <path d="M40 30 h90 l34 32 l-34 32 h-90 a10 10 0 0 1 -10 -10 v-44 a10 10 0 0 1 10 -10 z" />
        <circle cx="130" cy="62" r="8" fill="oklch(99% 0 0)" />
      </Shape>
    ),
  },
  {
    title: "Doar voturi reale",
    text: "Opiniile simulate apar separat, în altă culoare, și nu intră niciodată în procente.",
    shape: (
      <Shape id="f-real">
        <rect x="42" y="56" width="26" height="46" rx="6" />
        <rect x="80" y="30" width="26" height="72" rx="6" />
        <rect x="118" y="44" width="26" height="58" rx="6" />
        <rect x="156" y="70" width="26" height="32" rx="6" opacity="0.25" />
      </Shape>
    ),
  },
  {
    title: "Fără date personale",
    text: "Nu cerem nume, telefon sau email. Mesajele cu date personale sunt filtrate.",
    shape: (
      <Shape id="f-private">
        <rect x="56" y="48" width="88" height="56" rx="12" />
        <path d="M76 48 v-12 a24 24 0 0 1 48 0 v12" fill="none" stroke="url(#f-private)" strokeWidth="10" />
      </Shape>
    ),
  },
];

export function Features() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 lg:py-28">
      <ul data-stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.title} className="glass tile flex min-h-80 flex-col gap-3 rounded-2xl p-6">
            <h3 className="text-xl leading-tight font-bold tracking-[-0.02em] text-balance">{c.title}</h3>
            <p className="text-ink-3">{c.text}</p>
            {c.shape}
          </li>
        ))}
      </ul>
    </section>
  );
}
