import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import { Tabs } from 'expo-router/js-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import ClassicTabBar from '../../components/ClassicTabBar';
import type { ClassicTabBarProps } from '../../components/ClassicTabBar';
import { useAppContext } from '../../context/AppContext';

// Same setup as Better safe than sorry: iOS 26+ gets the native tab bar; older iPhones and Android get our
// ClassicTabBar (solid, with the sliding pill under the current tab).
const HAS_LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

// `tabBarSymbol` is ours (the icon in ClassicTabBar), not an expo-router option.
type TabOptions = ComponentProps<typeof Tabs.Screen>['options'];

const TABS = [
  { name: 'index', title: 'Acasă', sf: 'house', md: 'home' },
  { name: 'participa', title: 'Participă', sf: 'mic', md: 'mic' },
  { name: 'vote', title: 'Votează', sf: 'hand.thumbsup', md: 'thumb_up' },
  { name: 'board', title: 'Rundele', sf: 'person.3', md: 'groups' },
  { name: 'simulare', title: 'Simulare', sf: 'play.circle', md: 'play_circle' },
] as const;

export default function TabsLayout() {
  const { colors, haptic } = useAppContext();

  if (!HAS_LIQUID_GLASS) {
    return (
      <Tabs
        tabBar={props => <ClassicTabBar {...(props as unknown as ClassicTabBarProps)} colors={colors} haptic={haptic} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      >
        {TABS.map(tab => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title, tabBarSymbol: `${tab.sf}.fill` } as TabOptions} />
        ))}
      </Tabs>
    );
  }

  return (
    <NativeTabs tintColor={colors.accent}>
      {TABS.map(tab => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Icon sf={{ default: tab.sf, selected: `${tab.sf}.fill` }} md={tab.md} />
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
