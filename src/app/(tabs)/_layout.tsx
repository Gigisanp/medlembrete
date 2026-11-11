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

/**
 * Quatro abas, ligadas às tarefas do dia a dia: Hoje, Remédios, Histórico e Ajuda.
 * Ajustes (tamanho da letra, avisos) fica no botão "Ajustes" do cabeçalho dessas telas.
 * Os cabeçalhos são do próprio app (componente Screen).
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoje', tabBarIcon: tabIcon('today', 'today-outline') }} />
      <Tabs.Screen
        name="medicamentos"
        options={{ title: 'Remédios', tabBarIcon: tabIcon('medkit', 'medkit-outline') }}
      />
      <Tabs.Screen name="historico" options={{ title: 'Histórico', tabBarIcon: tabIcon('time', 'time-outline') }} />
      <Tabs.Screen
        name="ajuda"
        options={{ title: 'Ajuda', tabBarIcon: tabIcon('help-circle', 'help-circle-outline') }}
      />
    </Tabs>
  );
}
