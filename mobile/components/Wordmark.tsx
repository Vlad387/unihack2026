// The site's custom geometric "citymind" lettering (frontend/src/components/wordmark.tsx), same glyph paths.
// Every glyph is built from 40-unit blocks and 50/10-unit arcs on a 100-unit x-height.
import Svg, { Circle, G, Path } from 'react-native-svg';

type Glyph = { w: number; d: string; dot?: boolean };

const n = 'M0 140V90A50 50 0 0 1 100 90V140H60V90A10 10 0 0 0 40 90V140Z';
const GLYPHS: Record<string, Glyph> = {
  c: { w: 96, d: 'M50 40H96V78H50A12 12 0 0 0 50 102H96V140H50A50 50 0 0 1 50 40Z' },
  i: { w: 40, d: 'M0 40H40V140H0Z', dot: true },
  t: { w: 76, d: 'M0 6H40V40H76V78H40V102H68V140H0Z' },
  y: { w: 100, d: 'M0 40H40V90A10 10 0 0 0 60 90V40H100V180H28V146H60V138.99A50 50 0 0 1 0 90Z' },
  m: { w: 160, d: `${n} M60 140V90A50 50 0 0 1 160 90V140H120V90A10 10 0 0 0 100 90V140Z` },
  n: { w: 100, d: n },
  d: { w: 100, d: 'M60 0H100V140H60V138.99A50 50 0 1 1 60 41.01Z M50 80A10 10 0 0 0 50 100A10 10 0 0 0 50 80Z' },
};

const GAP = 5;
let x = 0;
const PLACED = [...'citymind'].map(ch => {
  const at = { x, g: GLYPHS[ch] };
  x += GLYPHS[ch].w + GAP;
  return at;
});
const WIDTH = x - GAP;

export default function Wordmark({ width, color }: { width: number; color: string }) {
  return (
    <Svg width={width} height={(width * 180) / WIDTH} viewBox={`0 0 ${WIDTH} 180`} accessibilityLabel="citymind">
      {PLACED.map(({ x: at, g }, i) => (
        <G key={i} transform={`translate(${at} 0)`}>
          <Path d={g.d} fill={color} />
          {g.dot ? <Circle cx={20} cy={18} r={18} fill={color} /> : null}
        </G>
      ))}
    </Svg>
  );
}
