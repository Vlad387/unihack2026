// Custom geometric "citymind" lettering: every glyph is built only from 40-unit blocks and 50/10-unit arcs on a
// 100-unit x-height (y 40..140, ascender from 0, one descender to 180), heavy and set almost flush like a logotype.
type Glyph = { w: number; d: string; dot?: boolean };

const n = "M0 140V90A50 50 0 0 1 100 90V140H60V90A10 10 0 0 0 40 90V140Z";
const GLYPHS: Record<string, Glyph> = {
  c: { w: 96, d: "M50 40H96V78H50A12 12 0 0 0 50 102H96V140H50A50 50 0 0 1 50 40Z" },
  i: { w: 40, d: "M0 40H40V140H0Z", dot: true },
  t: { w: 76, d: "M0 6H40V40H76V78H40V102H68V140H0Z" },
  // 138.99 / 41.01: where the r50 bowl meets the 40-unit stem edge (x = 60)
  y: { w: 100, d: "M0 40H40V90A10 10 0 0 0 60 90V40H100V180H28V146H60V138.99A50 50 0 0 1 0 90Z" },
  // m = two n arches sharing the middle stem
  m: { w: 160, d: `${n} M60 140V90A50 50 0 0 1 160 90V140H120V90A10 10 0 0 0 100 90V140Z` },
  n: { w: 100, d: n },
  d: { w: 100, d: "M60 0H100V140H60V138.99A50 50 0 1 1 60 41.01Z M50 80A10 10 0 0 0 50 100A10 10 0 0 0 50 80Z" },
};

const GAP = 5;

function layout(word: string) {
  let x = 0;
  const placed = [...word].map((ch, i) => {
    const g = GLYPHS[ch];
    const at = { i, x, g };
    x += g.w + GAP;
    return at;
  });
  return { placed, width: x - GAP };
}

const { placed, width } = layout("citymind");

// `accent` paints "mind" in the accent color (header logo); otherwise one color (currentColor).
export function Wordmark({ className = "", accent = false }: { className?: string; accent?: boolean }) {
  return (
    <svg viewBox={`0 0 ${width} 180`} className={className} fill="currentColor" aria-hidden>
      {placed.map(({ i, x, g }) => (
        <g key={i} transform={`translate(${x} 0)`} fill={accent && i >= 4 ? "var(--cyan)" : undefined}>
          <path d={g.d} />
          {g.dot && <circle cx="20" cy="18" r="18" />}
        </g>
      ))}
    </svg>
  );
}
