// Bingus, the help chat's floating button (frontend/src/components/chat-widget.tsx): the mascot's head floats
// above the tab bar with a "Chatbot" label, and says hello once per launch. Tapping it opens app/chat.tsx.
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useAppContext } from '../context/AppContext';
import { CLASSIC_TAB_BAR_HEIGHT } from './ClassicTabBar';
import { EASE_OUT } from '../motion';
import { FONTS, GRADIENT } from '../theme';

// greeted once per launch, not on every remount
let greeted = false;

export default function ChatButton() {
  const { colors, haptic } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [hello, setHello] = useState(false);
  const float = useSharedValue(0);

  useEffect(() => {
    // idle bob, like the site's bingus-float; Reanimated holds it still when the phone asks for less motion
    float.value = withRepeat(withSequence(withTiming(-6, { duration: 1700, easing: EASE_OUT }), withTiming(0, { duration: 1700, easing: EASE_OUT })), -1);
    if (greeted) return;
    // marked only when it really shows
    const show = setTimeout(() => { greeted = true; setHello(true); }, 800);
    const hide = setTimeout(() => setHello(false), 10800);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.value }] }));
  const bottom = insets.bottom + CLASSIC_TAB_BAR_HEIGHT + 16;

  const open = () => {
    haptic('select');
    setHello(false);
    router.push({ pathname: '/chat', params: { from: pathname } });
  };

  return (
    <>
      {hello ? (
        <Animated.View entering={FadeInDown.duration(400).easing(EASE_OUT)} exiting={FadeOut.duration(200)} style={[styles.hello, { bottom: bottom + 18, backgroundColor: colors.isDark ? colors.card : '#0f0f16' }]}>
          <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Bine ai venit! Deschide chatul cu Bingus">
            <Text style={styles.helloTitle}>Bine ai venit! Sunt Bingus 👋</Text>
            <Text style={styles.helloText}>Sunt chatbotul CityMind. Scrie-mi orice întrebare și te ajut să participi.</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Deschide chatul cu Bingus, asistentul AI"
        style={({ pressed }) => [styles.button, { bottom, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <Animated.View style={floatStyle}>
          <Image source={require('../assets/bingus.png')} style={styles.head} accessibilityIgnoresInvertColors />
        </Animated.View>
        <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.label}>
          <Text style={styles.labelText}>CHATBOT</Text>
        </LinearGradient>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: { position: 'absolute', right: 14, width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  head: { width: 68, height: 58 },
  label: { position: 'absolute', top: -8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  labelText: { color: '#ffffff', fontFamily: FONTS.bold, fontSize: 9.5, letterSpacing: 1 },
  hello: { position: 'absolute', right: 94, maxWidth: 240, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 11, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  helloTitle: { color: '#ffffff', fontFamily: FONTS.semibold, fontSize: 14 },
  helloText: { color: 'rgba(255,255,255,0.78)', fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
});
