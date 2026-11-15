// CityMind colors, converted from frontend/src/app/globals.css (`html.light .brand` and `.brand`).
// Solid surfaces only: no glass, no blur.

export type ThemeColors = {
  isDark: boolean;
  background: string; // page
  card: string; // card + tab bar surface
  text: string;
  text2: string; // body copy
  subtle: string; // labels, captions
  faint: string; // smallest text still AA (meta, counters)
  line: string; // borders, separators
  accent: string; // eyebrows, active tab, links
  primary: string; // main button
  onPrimary: string;
  destructive: string;
  agree: string;
  disagree: string;
  // site's .band-top: violet -> wash -> page, behind the top of every screen
  band: readonly [string, string, string, string];
  // the site's full .band-top behind the home hero (stops at 0 / 38% / 72% / 100%) and the wordmark on it
  heroBand: readonly [string, string, string, string];
  wordmark: string;
  // site's .cta-panel
  cta: readonly [string, string];
  shadow: string;
};

// Light is the site's default: ice page, near-black ink, black buttons, violet accent.
export const light: ThemeColors = {
  isDark: false,
  background: '#d9fbfe',
  card: '#f9feff',
  text: '#0f0f16',
  text2: 'rgba(15,15,22,0.88)',
  subtle: 'rgba(15,15,22,0.72)',
  faint: 'rgba(15,15,22,0.62)',
  line: 'rgba(15,15,22,0.08)',
  accent: '#7920dc',
  primary: '#0f0f16',
  onPrimary: '#fcfdff',
  destructive: '#d4183d',
  agree: '#059669',
  disagree: '#e11d48',
  // the midpoint keeps accent eyebrows at 4.9:1 where text starts
  band: ['#9a38f6', '#c8dafa', '#a3eff6', '#d9fbfe'],
  heroBand: ['#9a38f6', '#53afff', '#a3eff6', '#d9fbfe'],
  wordmark: '#b5f6f9',
  cta: ['#5303ba', '#962eed'],
  shadow: '#5303ba',
};

// Dark = the site's "Midnight": navy page, white ink, cyan accent.
export const dark: ThemeColors = {
  isDark: true,
  background: '#001f3f',
  card: '#192735',
  text: '#ffffff',
  text2: 'rgba(255,255,255,0.85)',
  subtle: 'rgba(255,255,255,0.65)',
  faint: 'rgba(255,255,255,0.5)',
  line: 'rgba(0,209,178,0.2)',
  accent: '#00d1b2',
  primary: '#00d1b2',
  onPrimary: '#001f3f',
  destructive: '#ff6b6b',
  agree: '#10b981',
  disagree: '#f43f5e',
  band: ['#32257c', '#192663', '#00274b', '#001f3f'],
  heroBand: ['#32257c', '#152965', '#00274b', '#001f3f'],
  wordmark: '#26d8be',
  cta: ['#1b3a5c', '#0a1f38'],
  shadow: '#000000',
};

// The site's accent gradient (logo tile, chat button, numbers, bars): oklch(58% 0.25 300) -> oklch(68% 0.15 235).
export const GRADIENT = ['#9540f4', '#00a5e7'] as const;

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
