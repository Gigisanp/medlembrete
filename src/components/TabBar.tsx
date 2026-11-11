import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { MIN_TOUCH_SIZE, radius, spacing } from '@/theme/tokens';

/**
 * Texto das abas: 20 px (CLAUDE.md), ampliado pelo sistema sem limite e sem redução automática.
 * Com quatro abas, os nomes cabem numa linha nas telas comuns. Se não couberem
 * (tela estreita ou fonte muito ampliada), a barra passa para duas linhas (2 + 2)
 * e o nome pode quebrar linha. Nunca é cortado nem diminuído.
 */
export const TAB_LABEL_SIZE = 20;
export const TAB_ICON_SIZE = 28;

/** Esconde a barra enquanto o teclado está aberto no Android, para não cobrir o formulário. */
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/**
 * Barra de abas inferior. Cada aba tem ícone e texto visíveis.
 * A aba ativa se diferencia por quatro sinais, não só pela cor:
 * fundo lilás atrás do ícone, ícone preenchido, texto em negrito e cor roxa.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const keyboardOpen = useKeyboardOpen();

  // Detecta se as abas quebraram de linha; nesse caso, organiza em 2 + 2.
  const layoutKey = `${width}-${fontScale}`;
  const [wrapped, setWrapped] = useState<{ key: string; value: boolean }>({ key: '', value: false });
  const twoRows = wrapped.key === layoutKey && wrapped.value;
  const itemTops = new Map<number, number>();

  if (keyboardOpen) return null;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.borderSoft,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          paddingLeft: Math.max(insets.left, spacing.xs),
          paddingRight: Math.max(insets.right, spacing.xs),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const color = focused ? colors.onLilac : colors.textMuted;

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
            onLayout={(e) => {
              if (twoRows) return;
              itemTops.set(index, e.nativeEvent.layout.y);
              if (itemTops.size === state.routes.length) {
                const tops = [...itemTops.values()];
                const isWrapped = Math.max(...tops) - Math.min(...tops) > 1;
                if (isWrapped) setWrapped({ key: layoutKey, value: true });
              }
            }}
            style={({ pressed }) => [
              styles.item,
              twoRows ? styles.itemTwoRows : null,
              { backgroundColor: pressed ? colors.lilacSurface : 'transparent' },
            ]}
          >
            <View style={[styles.iconPill, { backgroundColor: focused ? colors.lilacSelected : 'transparent' }]}>
              {options.tabBarIcon?.({ focused, color, size: TAB_ICON_SIZE })}
            </View>
            <Text style={[styles.label, { color, fontWeight: focused ? '800' : '500' }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    paddingTop: spacing.xs,
  },
  item: {
    // A largura acompanha o tamanho do texto ("Histórico" precisa de mais espaço que "Hoje").
    flexGrow: 1,
    flexBasis: 'auto',
    minWidth: MIN_TOUCH_SIZE,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    gap: 2,
  },
  itemTwoRows: {
    flexBasis: '50%',
    maxWidth: '50%',
  },
  iconPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: TAB_LABEL_SIZE,
    lineHeight: Math.round(TAB_LABEL_SIZE * 1.25),
    textAlign: 'center',
  },
});
