// CityMind colors, converted from frontend/src/app/globals.css (`html.light .brand` and `.brand`).
// Solid surfaces only: no glass, no blur.

export type ThemeColors = {
  isDark: boolean;
  background: string; // page
  card: string; // card + tab bar surface
  text: string;
  text2: string; // body copy
  subtle: string; // labels, captions
  line: string; // borders, separators
  accent: string; // eyebrows, active tab, links
  primary: string; // main button
  onPrimary: string;
  destructive: string;
  agree: string;
  disagree: string;
};

// Light is the site's default: ice page, near-black ink, black buttons, violet accent.
export const light: ThemeColors = {
  isDark: false,
  background: '#d9fbfe',
  card: '#f9feff',
  text: '#0f0f16',
  text2: 'rgba(15,15,22,0.88)',
  subtle: 'rgba(15,15,22,0.66)',
  line: 'rgba(15,15,22,0.1)',
  accent: '#7920dc',
  primary: '#0f0f16',
  onPrimary: '#fcfdff',
  destructive: '#d4183d',
  agree: '#059669',
  disagree: '#e11d48',
};

// Dark = the site's "Midnight": navy page, white ink, cyan accent.
export const dark: ThemeColors = {
  isDark: true,
  background: '#001f3f',
  card: '#192735',
  text: '#ffffff',
  text2: 'rgba(255,255,255,0.85)',
  subtle: 'rgba(255,255,255,0.65)',
  line: 'rgba(0,209,178,0.2)',
  accent: '#00d1b2',
  primary: '#00d1b2',
  onPrimary: '#001f3f',
  destructive: '#ff6b6b',
  agree: '#10b981',
  disagree: '#f43f5e',
};

// The site's accent gradient (logo tile, chat button, numbers, bars): oklch(58% 0.25 300) -> oklch(68% 0.15 235).
export const GRADIENT = ['#9540f4', '#00a5e7'] as const;
// Purple CTA panel / top band of the public pages.
export const VIOLET = '#9a38f6';

// Camp colors, same 8 slots as the site (--series-1..8).
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];

export const FONTS = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
  extrabold: 'InterTight_800ExtraBold',
  mono: 'JetBrainsMono_500Medium',
};

export const alpha = (hex: string, opacity: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
};
