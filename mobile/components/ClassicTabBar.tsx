import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SymbolView } from './SymbolView';
import { alpha } from '../theme';
import { SPRING } from '../motion';
import type { ThemeColors } from '../theme';
import type { HapticKind } from '../context/AppContext';

// Ce primește bara de la tab-urile din expo-router, atât cât folosește.
type TabRoute = { key: string; name: string; params?: object };
type TabEvents = { emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean } | undefined };
export type ClassicTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: { title?: string; tabBarSymbol: string } }>;
  emitter?: TabEvents;
  navigateToTab?: (key: string) => void;
  navigation?: TabEvents & { navigate: (name: string, params?: object) => void };
  colors: ThemeColors;
  haptic?: (kind: HapticKind) => void;
  // Bulina cu număr de pe un tab, după numele rutei.
  badges?: Record<string, number>;
  reduceMotion?: boolean;
};

// Bara de jos pentru iPhone-urile fără Liquid Glass (sub iOS 26) și pentru Android: fundal plin din temă (nu se mai face
// transparentă, albă sau în culoarea temei ca bara sistemului), iar tabul ales are dedesubt un slider semitransparent
// care alunecă de la un tab la altul și se poate trage cu degetul, ca pe iOS 26.
// Pe iOS 26 rămâne bara nativă Liquid Glass (vezi app/(tabs)/_layout.js).

export const CLASSIC_TAB_BAR_HEIGHT = 58;
const PILL_INSET = 6;
const PILL_HEIGHT = 48;

// `emitter` / `navigateToTab`: ce primește bara de la tab-urile din expo-router (SDK 58); `navigation` doar pentru
// versiunile de react-navigation care îl dau în loc.
export default function ClassicTabBar({ state, descriptors, emitter, navigateToTab, navigation, colors, haptic, badges = {}, reduceMotion }: ClassicTabBarProps) {
  const events = emitter ?? navigation;
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [keyboardShown, setKeyboardShown] = useState(false);
  const count = state.routes.length;
  const tabWidth = width / count;
  const x = useSharedValue(0);
  const pressed = useSharedValue(0);

  // Sliderul ajunge sub tabul ales (cu un arc fin; fără animație la „Reduce mișcarea”).
  useEffect(() => {
    if (!tabWidth) return;
    const target = state.index * tabWidth + PILL_INSET;
    x.value = reduceMotion ? target : withSpring(target, SPRING.soft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, tabWidth, reduceMotion]);

  // Pe Android bara se ascunde cât e tastatura deschisă (ca înainte, cu `tabBarHideOnKeyboard`).
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardShown(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardShown(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const go = (index: number) => {
    const route = state.routes[index];
    if (!route) return;
    const focused = state.index === index;
    const event = events?.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event?.defaultPrevented) {
      haptic?.('select');
      if (navigateToTab) navigateToTab(route.key);
      else navigation?.navigate(route.name, route.params);
    }
  };

  // Tragi sliderul de-a lungul barei; unde îl lași, acolo se deschide tabul.
  const snapTo = (index: number) => {
    const target = Math.max(0, Math.min(count - 1, index));
    if (target === state.index) x.value = reduceMotion ? state.index * tabWidth + PILL_INSET : withSpring(state.index * tabWidth + PILL_INSET, SPRING.soft);
    else go(target);
  };
  const drag = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onBegin(() => { pressed.value = withSpring(1, SPRING.press); })
    .onUpdate(event => {
      if (!tabWidth) return;
      const next = event.x - tabWidth / 2 + PILL_INSET;
      x.value = Math.max(PILL_INSET, Math.min(width - tabWidth + PILL_INSET, next));
    })
    .onEnd(event => {
      if (!tabWidth) return;
      scheduleOnRN(snapTo, Math.floor(event.x / tabWidth));
    })
    .onFinalize(() => { pressed.value = withSpring(0, SPRING.press); });

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleY: 1 + pressed.value * 0.06 }, { scaleX: 1 + pressed.value * 0.04 }],
  }));

  if (keyboardShown) return null;

  return (
    <View
      style={[styles.bar, {
        backgroundColor: colors.card,
        borderTopColor: colors.line,
        paddingBottom: Math.max(insets.bottom, 8),
      }]}
    >
      <GestureDetector gesture={drag}>
        <View style={styles.row} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          {tabWidth ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.pill, {
                width: tabWidth - PILL_INSET * 2,
                backgroundColor: alpha(colors.accent, colors.isDark ? 0.16 : 0.14),
              }, pillStyle]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const color = focused ? colors.accent : colors.subtle;
            const badge = badges[route.name];
            return (
              <Pressable
                key={route.key}
                onPress={() => go(index)}
                onLongPress={() => events?.emit({ type: 'tabLongPress', target: route.key })}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.title}
              >
                <View>
                  <SymbolView name={options.tabBarSymbol} size={23} tintColor={color} />
                  {badge ? (
                    <View style={[styles.badge, { backgroundColor: colors.destructive, borderColor: colors.card }]}>
                      <Text style={styles.badgeText}>{badge > 9 ? '9+' : String(badge)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.label, { color }, focused && styles.labelFocused]} numberOfLines={1}>{options.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 5 },
  row: { flexDirection: 'row', height: CLASSIC_TAB_BAR_HEIGHT - 5 },
  pill: {
    position: 'absolute',
    left: 0,
    top: (CLASSIC_TAB_BAR_HEIGHT - 5 - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 10.5, fontFamily: 'InterTight_500Medium', letterSpacing: 0.1 },
  labelFocused: { fontFamily: 'InterTight_700Bold' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -11,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
