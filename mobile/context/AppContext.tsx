import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { dark, light } from '../theme';
import type { ThemeColors } from '../theme';

export type HapticKind = 'select' | 'success' | 'warning';
export type ThemePreference = 'light' | 'dark' | 'system';

type AppContextValue = {
  colors: ThemeColors;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (value: ThemePreference) => void;
  themeLoaded: boolean;
  haptic: (kind: HapticKind) => void;
};

const THEME_KEY = 'citymind:theme';
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  // Light is the site's default; dark ("Midnight") is opt-in.
  const [themePreference, setPreference] = useState<ThemePreference>('light');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setPreference(saved);
      })
      .catch(e => console.warn('Could not load the theme', e))
      .finally(() => setThemeLoaded(true));
  }, []);

  const setThemePreference = (value: ThemePreference) => {
    setPreference(value);
    AsyncStorage.setItem(THEME_KEY, value).catch(e => console.warn('Could not save the theme', e));
  };

  const isDark = themePreference === 'dark' || (themePreference === 'system' && system === 'dark');

  const haptic = (kind: HapticKind) => {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else Haptics.selectionAsync();
  };

  return (
    <AppContext.Provider value={{ colors: isDark ? dark : light, isDark, themePreference, setThemePreference, themeLoaded, haptic }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider');
  return value;
}
