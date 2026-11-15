// Setări: theme (the site's light default, dark "Midnight" opt-in, or follow the phone) and about.
import { Linking, StyleSheet, Text } from 'react-native';
import Constants from 'expo-constants';
import SegmentedControl from '../components/SegmentedControl';
import { Body, Card, Eyebrow, Screen } from '../components/ui';
import { useAppContext } from '../context/AppContext';
import type { ThemePreference } from '../context/AppContext';
import { FONTS, alpha } from '../theme';

const SITE = 'https://citymind-iota.vercel.app';

export default function Settings() {
  const { colors, themePreference, setThemePreference, haptic } = useAppContext();
  const select = (value: ThemePreference) => {
    haptic('select');
    setThemePreference(value);
  };

  return (
    <Screen header>

      <Eyebrow>Aspect</Eyebrow>
      <Card>
        <SegmentedControl
          options={[
            { value: 'light', label: 'Luminos' },
            { value: 'dark', label: 'Midnight' },
            { value: 'system', label: 'Sistem' },
          ]}
          value={themePreference}
          onChange={select}
          trackColor={alpha(colors.isDark ? '#ffffff' : '#0f0f16', 0.07)}
          activeColor={colors.isDark ? colors.background : '#ffffff'}
          textColor={colors.subtle}
          activeTextColor={colors.text}
        />
      </Card>

      <Eyebrow>Despre</Eyebrow>
      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>CityMind {Constants.expoConfig?.version}</Text>
        <Body subtle>
          De la sute de păreri la o propunere votată. AI-ul face munca grea de citit și sortat. Oamenii decid. Nu cerem cont, nume,
          telefon sau email.
        </Body>
        <Text style={[styles.link, { color: colors.accent }]} onPress={() => Linking.openURL(`${SITE}/cum-functioneaza`)} accessibilityRole="link">
          Cum funcționează →
        </Text>
        <Text style={[styles.link, { color: colors.accent }]} onPress={() => Linking.openURL(SITE)} accessibilityRole="link">
          Deschide site-ul →
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { fontFamily: FONTS.bold, fontSize: 18 },
  link: { fontFamily: FONTS.semibold, fontSize: 16, paddingVertical: 6 },
});
