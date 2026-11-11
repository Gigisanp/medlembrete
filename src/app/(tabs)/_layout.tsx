import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Ícone preenchido na aba ativa e só o contorno nas outras. */
function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    const name = focused ? active : inactive;
    return (
      <Ionicons name={name} color={color as string} size={size} accessibilityElementsHidden testID={`icone-${name}`} />
    );
  }
  return TabIcon;
}

/** Cinco abas na parte de baixo, nesta ordem: Hoje, Remédios, Histórico, Ajuda e Ajustes (CLAUDE.md). */
export default function TabsLayout() {
  const { colors, font } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontSize: font.heading, fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Hoje', tabBarIcon: tabIcon('today', 'today-outline') }}
      />
      <Tabs.Screen
        name="medicamentos"
        options={{
          title: 'Remédios',
          // A aba tem a própria pilha (lista, cadastro e edição), com o cabeçalho dela.
          headerShown: false,
          tabBarIcon: tabIcon('medkit', 'medkit-outline'),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{ title: 'Histórico', tabBarIcon: tabIcon('time', 'time-outline') }}
      />
      <Tabs.Screen
        name="ajuda"
        options={{ title: 'Ajuda', tabBarIcon: tabIcon('help-circle', 'help-circle-outline') }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{ title: 'Ajustes', tabBarIcon: tabIcon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}
