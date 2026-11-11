import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_SIZE, spacing } from '@/theme/tokens';

/**
 * Texto das abas: 20 px (CLAUDE.md).
 * Medição (pior caso, aba ativa em negrito): 358 px no iPhone (SF Pro) e 352 px no Android (Roboto).
 * Cabe nas telas de 360 px ou mais. Em telas mais estreitas, desce até 18 px (TAB_LABEL_MIN_SIZE).
 * Não cresce com a letra grande do app nem com a do sistema, para as cinco abas caberem.
 */
export const TAB_LABEL_SIZE = 20;
export const TAB_LABEL_MIN_SIZE = 18;
export const TAB_ICON_SIZE = 28;

/**
 * Barra de abas inferior. Cada aba tem ícone e texto visíveis.
 * A aba ativa se diferencia por quatro sinais, não só pela cor:
 * cor, texto em negrito, ícone preenchido e uma faixa no topo.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const color = focused ? colors.primary : colors.textMuted;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            testID={`aba-${route.name}`}
            onPress={onPress}
            style={({ pressed }) => [
              styles.item,
              { backgroundColor: focused || pressed ? colors.surface : 'transparent' },
            ]}
          >
            <View style={[styles.indicator, { backgroundColor: focused ? colors.primary : 'transparent' }]} />
            {options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              // Só encolhe em telas com menos de 360 px, e nunca abaixo de 18 px.
              minimumFontScale={TAB_LABEL_MIN_SIZE / TAB_LABEL_SIZE}
              maxFontSizeMultiplier={1}
              style={[styles.label, { color, fontWeight: focused ? '800' : '500' }]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  item: {
    // A largura acompanha o tamanho do texto ("Histórico" precisa de mais espaço que "Hoje").
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minWidth: MIN_TOUCH_SIZE,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    paddingBottom: spacing.xs,
    gap: 2,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: spacing.xs,
    right: spacing.xs,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  label: {
    fontSize: TAB_LABEL_SIZE,
    textAlign: 'center',
  },
});
