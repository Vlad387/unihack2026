// The app's building blocks, in the site's style: the violet -> ice band at the top of every screen, gradient
// text for the words and numbers that matter, mono uppercase eyebrows, tight display type, soft elevated cards,
// black (light) / cyan (dark) primary buttons with an arrow, and a short staggered entrance.
import { Children } from 'react';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewProps, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import MaskedViewClass from '@react-native-masked-view/masked-view';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppContext } from '../context/AppContext';
import { CLASSIC_TAB_BAR_HEIGHT } from './ClassicTabBar';
import { EASE_OUT } from '../motion';
import { FONTS, GRADIENT } from '../theme';

// shortcut: masked-view 0.3.2 ships mixin-style class types that RN 0.88's types reject; drop the cast when it updates.
const MaskedView = MaskedViewClass as unknown as ComponentType<ViewProps & { maskElement: ReactElement }>;

const BAND = 340;
const HERO_BAND = 720;
// the band reaches this far above the top, so pulling the page down shows violet, not a seam
const OVERSCROLL = 400;

// `header`: the screen has a navigation header above it, so it gets neither the status-bar inset nor the band.
// `hero`: the home page's tall band, like the site's hero (violet behind the wordmark, ice under the buttons).
export function Screen({ children, onRefresh, refreshing = false, header = false, hero = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; header?: boolean; hero?: boolean }) {
  const { colors } = useAppContext();
  const insets = useSafeAreaInsets();
  const height = OVERSCROLL + insets.top + (hero ? HERO_BAND : BAND);
  // violet only behind the status bar, so eyebrows and titles land on the light wash and stay readable
  const statusEnd = (OVERSCROLL + insets.top) / height;
  const at = (share: number) => statusEnd + (1 - statusEnd) * share;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: header ? 16 : insets.top + 20, paddingBottom: insets.bottom + CLASSIC_TAB_BAR_HEIGHT + 40, paddingHorizontal: 20, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {header ? (
        <StatusBar style={colors.isDark ? 'light' : 'dark'} />
      ) : (
        <>
          <StatusBar style="light" />
          <LinearGradient
            pointerEvents="none"
            colors={hero ? colors.heroBand : colors.band}
            locations={hero ? [statusEnd, at(0.38), at(0.72), 1] : [0, statusEnd, at(0.45), 1]}
            style={{ position: 'absolute', top: -OVERSCROLL, left: 0, right: 0, height }}
          />
        </>
      )}
      {/* each block rises in, 60 ms after the previous one; Reanimated skips it when the phone asks for less motion.
          toArray keys follow each child's place in the JSX, so blocks that appear later (polling) don't replay the others */}
      {Children.toArray(children).map((child, i) => (
        <Animated.View key={(child as ReactElement).key ?? i} entering={FadeInDown.duration(600).delay(Math.min(i, 8) * 60).easing(EASE_OUT)} style={{ gap: 16 }}>
          {child}
        </Animated.View>
      ))}
    </ScrollView>
  );
}

// The site's .text-gradient: violet -> blue through the letters.
export function GradientText({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <MaskedView maskElement={<Text style={style}>{children}</Text>}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* invisible copy gives the gradient the text's exact size */}
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

// The site's 4px violet -> blue bar.
export const GradientBar = () => (
  <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 4, borderRadius: 2, width: 56 }} />
);

export function Eyebrow({ children, color }: { children: ReactNode; color?: string }) {
  const { colors } = useAppContext();
  return <Text style={[styles.eyebrow, { color: color ?? colors.accent }]}>{children}</Text>;
}

// Display type: extra-bold, tight leading, tracking tightens as size grows (like the site's -0.04em).
export const titleStyle = (size: number): TextStyle => ({ fontFamily: FONTS.extrabold, fontSize: size, lineHeight: Math.round(size * 1.02), letterSpacing: -size * 0.035 });

export function Title({ children, size = 34, gradient, style }: { children: ReactNode; size?: number; gradient?: boolean; style?: StyleProp<TextStyle> }) {
  const { colors } = useAppContext();
  if (gradient) return <GradientText style={[titleStyle(size), style]}>{children}</GradientText>;
  return <Text style={[titleStyle(size), { color: colors.text }, style]} accessibilityRole="header">{children}</Text>;
}

export function Body({ children, subtle, style }: { children: ReactNode; subtle?: boolean; style?: StyleProp<TextStyle> }) {
  const { colors } = useAppContext();
  return <Text style={[styles.body, { color: subtle ? colors.subtle : colors.text2 }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAppContext();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.line, shadowColor: colors.shadow, shadowOpacity: colors.isDark ? 0.3 : 0.07 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'gradient';
  disabled?: boolean;
  loading?: boolean;
  color?: string; // solid fill override (vote buttons, CTA panel)
  labelColor?: string;
  arrow?: boolean; // the site's "→" on calls to action
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, color, labelColor, arrow, style }: ButtonProps) {
  const { colors, haptic } = useAppContext();
  const textColor = labelColor ?? (variant === 'outline' ? colors.text : color || variant === 'gradient' ? '#ffffff' : colors.onPrimary);
  return (
    <Pressable
      onPress={() => { haptic('select'); onPress(); }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.text },
        variant === 'primary' && { backgroundColor: color ?? colors.primary },
        { opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {variant === 'gradient' ? (
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>
          {title}
          {arrow ? '  →' : ''}
        </Text>
      )}
    </Pressable>
  );
}

// The site labels everything written by AI.
export function AiBadge() {
  const { colors } = useAppContext();
  return (
    <View style={[styles.badge, { borderColor: colors.line }]}>
      <Text style={[styles.badgeText, { color: colors.accent }]}>✦ Generat de AI</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONTS.mono, fontSize: 11.5, letterSpacing: 1.7, textTransform: 'uppercase' },
  body: { fontFamily: FONTS.regular, fontSize: 17, lineHeight: 25, letterSpacing: -0.15 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 10, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  button: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, overflow: 'hidden' },
  buttonText: { fontFamily: FONTS.semibold, fontSize: 16, letterSpacing: -0.1 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: FONTS.mono, fontSize: 10.5, letterSpacing: 0.8 },
});
