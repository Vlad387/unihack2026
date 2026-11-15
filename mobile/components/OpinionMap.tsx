// The opinion map: one dot per participant, colored by camp. Dots glide to their new place when the map changes
// (in the DEMO they gather from a scatter into camps), like the site's d3 map.
import { useEffect } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useAppContext } from '../context/AppContext';
import { campColors } from '../lib/colors';
import type { ClusterResult } from '../lib/types';
import { EASE_OUT } from '../motion';

const SIZE = 300;
const PAD = 16;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function Dot({ x, y, r, fill, ring }: { x: number; y: number; r: number; fill: string; ring: string | null }) {
  const cx = useSharedValue(x);
  const cy = useSharedValue(y);
  useEffect(() => {
    cx.value = withTiming(x, { duration: 1200, easing: EASE_OUT });
    cy.value = withTiming(y, { duration: 1200, easing: EASE_OUT });
  }, [x, y]);
  const props = useAnimatedProps(() => ({ cx: cx.value, cy: cy.value }));
  return <AnimatedCircle animatedProps={props} r={r} fill={fill} stroke={ring ?? 'none'} strokeWidth={3} opacity={ring ? 1 : 0.8} />;
}

export default function OpinionMap({ clusters, me }: { clusters: ClusterResult; me?: string }) {
  const { colors } = useAppContext();
  const palette = campColors(clusters.camps);
  const xs = clusters.points.map(p => p.x);
  const ys = clusters.points.map(p => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // scale the backend's x,y (any range) into the square
  const scale = (v: number, min: number, max: number) => PAD + ((v - min) / (max - min || 1)) * (SIZE - 2 * PAD);

  return (
    <Svg width="100%" height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} accessibilityLabel={`Harta opiniilor: ${clusters.points.length} participanți`}>
      {clusters.points.map(p => (
        <Dot
          key={p.participant_id}
          x={scale(p.x, minX, maxX)}
          y={scale(p.y, minY, maxY)}
          r={p.participant_id === me ? 9 : 5}
          fill={p.camp_id ? palette.get(p.camp_id) ?? colors.subtle : colors.subtle}
          ring={p.participant_id === me ? colors.text : null}
        />
      ))}
    </Svg>
  );
}
