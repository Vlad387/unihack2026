import { StyleSheet, View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, InterTight_400Regular, InterTight_500Medium, InterTight_600SemiBold, InterTight_700Bold, InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { AppProvider, useAppContext } from '../context/AppContext';
import LaunchScreen from '../components/LaunchScreen';
import ChatButton from '../components/ChatButton';

function RootLayoutNav({ fontsReady }: { fontsReady: boolean }) {
  const { isDark, colors, themeLoaded } = useAppContext();
  const pathname = usePathname();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* screens use Inter Tight: render them only once the fonts are in, under the launch screen */}
      {fontsReady ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: true,
              title: 'Setări',
              headerBackTitle: 'Înapoi',
              headerTintColor: colors.accent,
              headerStyle: { backgroundColor: colors.background },
              headerTitleStyle: { color: colors.text, fontFamily: 'InterTight_700Bold' },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="chat" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.background } }} />
        </Stack>
      ) : null}
      {/* Bingus floats over the tabs, not over the chat itself or Setări */}
      {fontsReady && pathname !== '/chat' && pathname !== '/settings' ? <ChatButton /> : null}
      <LaunchScreen colors={colors} ready={themeLoaded && fontsReady} />
    </View>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
    JetBrainsMono_500Medium,
  });
  // a font that fails to load falls back to the system font instead of blocking the app
  if (fontError) console.warn('Fonts failed to load', fontError);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <RootLayoutNav fontsReady={loaded || !!fontError} />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
