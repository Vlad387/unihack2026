import { useEffect, useState } from 'react';
import { Image, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { EASE_OUT } from '../motion';
import { FONTS } from '../theme';
import type { ThemeColors } from '../theme';

type Props = {
  colors: ThemeColors;
  // Tema s-a încărcat: animația poate porni.
  ready: boolean;
};

// Cât timp rămâne numele pe ecran înainte să se estompeze spre aplicație.
const HOLD_MS = 1250;
const FADE_OUT_MS = 450;
// Dacă tema nu s-a încărcat până atunci, pornim oricum, ca aplicația să nu rămână pe ecranul de pornire.
const MAX_WAIT_MS = 2500;

// Ecranul nativ rămâne până se încarcă tema, ca ecranul nostru să apară direct în culoarea ei.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 200, fade: true });

/**
 * Ecran de pornire în culoarea temei alese: iconița, numele aplicației și un motto,
 * care apar pe rând, discret, apoi totul se estompează spre pagina principală.
 */
export default function LaunchScreen({ colors, ready }: Props) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const start = ready || timedOut;
  const symbol = useSharedValue(0);
  const title = useSharedValue(0);
  const tagline = useSharedValue(0);
  const overlay = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!start) return;
    SplashScreen.hideAsync().catch(() => {});
    const timing = { duration: 520, easing: EASE_OUT };
    symbol.value = withTiming(1, timing);
    title.value = withDelay(140, withTiming(1, timing));
    tagline.value = withDelay(300, withTiming(1, timing));
    overlay.value = withDelay(HOLD_MS, withTiming(0, { duration: FADE_OUT_MS, easing: EASE_OUT }));
    // Cu timere, nu cu callback-ul animației: ecranul trebuie să dispară chiar dacă animația e întreruptă,
    // altfel un strat invizibil ar bloca atingerile.
    const fadeTimer = setTimeout(() => setFading(true), HOLD_MS);
    const hideTimer = setTimeout(() => setVisible(false), HOLD_MS + FADE_OUT_MS + 50);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [start]);

  const rise = (progress: SharedValue<number>) => {
    'worklet';
    return {
      opacity: progress.value,
      transform: [{ translateY: (1 - progress.value) * 8 }],
    };
  };
  const symbolStyle = useAnimatedStyle(() => ({
    opacity: symbol.value,
    transform: [{ scale: 0.94 + symbol.value * 0.06 }],
  }));
  const titleStyle = useAnimatedStyle(() => rise(title));
  const taglineStyle = useAnimatedStyle(() => rise(tagline));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlay.value }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + (1 - overlay.value) * 0.03 }] }));

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents={fading ? 'none' : 'auto'}
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: colors.background }, overlayStyle]}
      accessibilityLabel="CityMind"
    >
      <Animated.View style={[styles.content, contentStyle]}>
        <Animated.View style={symbolStyle}>
          {/* Bingus, the CityMind cat */}
          <Image source={require('../assets/icon.png')} style={styles.logo} />
        </Animated.View>
        <Animated.View style={titleStyle}>
          <Text style={[styles.title, { color: colors.text }]}>citymind</Text>
        </Animated.View>
        <Animated.View style={taglineStyle}>
          <Text style={[styles.tagline, { color: colors.accent }]}>ORAȘUL TĂU. VOCEA TA.</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 40, marginTop: -40 },
  logo: { width: 96, height: 96, borderRadius: 24 },
  title: { fontSize: 40, fontFamily: FONTS.extrabold, letterSpacing: -1.4, lineHeight: 44, textAlign: 'center', marginTop: 22 },
  tagline: { fontSize: 12, fontFamily: FONTS.mono, letterSpacing: 1.8, marginTop: 14 },
});
