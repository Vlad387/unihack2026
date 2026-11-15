import { Easing, FadeIn, FadeOut, LinearTransition, withTiming } from 'react-native-reanimated';

// Toate animațiile aplicației: discrete, fără „bounce” vizibil, în stilul iOS.
export const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);

export const SPRING = {
  // Fără oscilații — pentru deschideri, închideri, mutări.
  gentle: { duration: 400, dampingRatio: 1 },
  // Un strop de viață, aproape imperceptibil — pentru confirmări (bifă).
  soft: { duration: 420, dampingRatio: 0.85 },
  // Apăsare pe buton/pătrat.
  press: { duration: 200, dampingRatio: 1 },
};

export const TIMING = {
  fast: { duration: 180, easing: EASE_OUT },
  base: { duration: 260, easing: EASE_OUT },
  slow: { duration: 420, easing: EASE_OUT },
};

export const fadeIn = FadeIn.duration(260).easing(EASE_OUT);
// Builderele Reanimated se modifică pe loc (`.delay()` schimbă obiectul), deci pentru întârzieri
// creăm mereu unul nou, ca să nu afectăm `fadeIn` folosit în restul aplicației.
export const fadeInAfter = (ms: number) => FadeIn.duration(260).easing(EASE_OUT).delay(ms);
export const fadeOut = FadeOut.duration(160);
export const layoutTransition = LinearTransition.duration(280).easing(EASE_OUT);

// Intrare foarte subtilă: apare din 97% cu fade (în loc de zoom/elastic).
export const softEnter = () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.97 }] },
    animations: {
      opacity: withTiming(1, { duration: 280, easing: EASE_OUT }),
      transform: [{ scale: withTiming(1, { duration: 340, easing: EASE_OUT }) }],
    },
  };
};
