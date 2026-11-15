// Small building blocks in the site's style: eyebrow labels (mono, uppercase, accent), big tight headings,
// solid cards with a thin line, black (light) / cyan (dark) primary buttons and outlined secondary ones.
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../context/AppContext';
import { CLASSIC_TAB_BAR_HEIGHT } from './ClassicTabBar';
import { FONTS, GRADIENT } from '../theme';

// `header`: the screen has a navigation header above it, so it doesn't need the status-bar inset.
export function Screen({ children, onRefresh, refreshing = false, header = false }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; header?: boolean }) {
  const { colors } = useAppContext();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: header ? 16 : insets.top + 16, paddingBottom: insets.bottom + CLASSIC_TAB_BAR_HEIGHT + 32, paddingHorizontal: 20, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

// The site's 4px violet -> ice bar under the header.
export const GradientBar = () => (
  <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 4, borderRadius: 2, width: 56 }} />
);

export function Eyebrow({ children }: { children: ReactNode }) {
  const { colors } = useAppContext();
  return <Text style={[styles.eyebrow, { color: colors.accent }]}>{children}</Text>;
}

export function Title({ children, size = 34, style }: { children: ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const { colors } = useAppContext();
  return <Text style={[styles.title, { color: colors.text, fontSize: size, lineHeight: size * 1.05 }, style]}>{children}</Text>;
}

export function Body({ children, subtle, style }: { children: ReactNode; subtle?: boolean; style?: StyleProp<TextStyle> }) {
  const { colors } = useAppContext();
  return <Text style={[styles.body, { color: subtle ? colors.subtle : colors.text2 }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAppContext();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.line }, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'gradient';
  disabled?: boolean;
  loading?: boolean;
  color?: string; // solid fill override (vote buttons, CTA panel)
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, color, labelColor, style }: ButtonProps) {
  const { colors, haptic } = useAppContext();
  const textColor = labelColor ?? (variant === 'outline' ? colors.text : color || variant === 'gradient' ? '#ffffff' : colors.onPrimary);
  const content = loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>;
  return (
    <Pressable
      onPress={() => { haptic('select'); onPress(); }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' && { borderWidth: 1.5, borderColor: colors.text },
        variant === 'primary' && { backgroundColor: color ?? colors.primary },
        { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {variant === 'gradient' ? (
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />
      ) : null}
      {content}
    </Pressable>
  );
}

// The site labels everything written by AI.
export function AiBadge() {
  const { colors } = useAppContext();
  return <Text style={[styles.eyebrow, { color: colors.subtle, fontSize: 10 }]}>✦ Generat de AI</Text>;
}

const styles = StyleSheet.create({
  eyebrow: { fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { fontFamily: FONTS.extrabold, letterSpacing: -1.2 },
  body: { fontFamily: FONTS.regular, fontSize: 16, lineHeight: 23 },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 8 },
  button: { height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, overflow: 'hidden' },
  buttonText: { fontFamily: FONTS.semibold, fontSize: 16 },
});
