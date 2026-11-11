import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { BUTTON_HEIGHT, MIN_TOUCH_SIZE, radius, spacing, type ColorName } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger';
type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = Omit<PressableProps, 'children' | 'style'> & {
  /** Rótulo sempre visível. Não existe botão só com ícone. */
  label: string;
  variant?: Variant;
  /** Ícone opcional, sempre junto do rótulo. */
  icon?: IconName;
  /** Para opções selecionáveis: mostra "✓" no texto, sem depender só da cor. */
  selected?: boolean;
  /** Durante o salvamento: mostra este texto e bloqueia novos toques. */
  loadingLabel?: string;
  loading?: boolean;
};

type Palette = { bg: ColorName; pressed: ColorName; fg: ColorName; border: ColorName };

const PALETTES: Record<Variant, Palette> = {
  // Lilás claro com texto roxo escuro; a borda roxa garante que o botão seja visto como botão.
  primary: { bg: 'lilacSelected', pressed: 'lilacPressed', fg: 'onLilac', border: 'onLilac' },
  secondary: { bg: 'card', pressed: 'lilacSurface', fg: 'onLilac', border: 'borderControl' },
  danger: { bg: 'dangerSurface', pressed: 'dangerSurface', fg: 'dangerText', border: 'danger' },
};

/**
 * Botão padrão: altura mínima de 60 px (o exigido é 44), largura total, rótulo visível
 * e contraste de pelo menos 4,5:1. O texto quebra linha com fonte grande; o botão cresce.
 * Use no máximo um botão "primary" por tela.
 */
export function AppButton({
  label,
  variant = 'secondary',
  icon,
  selected,
  disabled,
  loading,
  loadingLabel,
  ...rest
}: Props) {
  const { colors, font } = useTheme();
  const isDisabled = Boolean(disabled || loading);
  const palette = PALETTES[variant];
  const fg = isDisabled ? colors.disabledText : colors[palette.fg];
  const text = loading && loadingLabel ? loadingLabel : selected ? `✓ ${label}` : label;
  const iconName: IconName | undefined = selected ? 'checkmark-circle' : icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, selected, busy: Boolean(loading) }}
      disabled={isDisabled}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled
            ? colors.disabledSurface
            : selected
              ? colors.lilacSelected
              : pressed
                ? colors[palette.pressed]
                : colors[palette.bg],
          borderColor: isDisabled ? colors.disabledSurface : selected ? colors.onLilac : colors[palette.border],
          borderWidth: selected || variant === 'primary' ? 3 : 2,
          transform: [{ scale: pressed && !isDisabled ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.content}>
        {iconName ? (
          <Ionicons name={iconName} size={Math.round(font.label * 1.2)} color={fg} accessibilityElementsHidden />
        ) : null}
        <Text style={[styles.label, { color: fg, fontSize: font.label, lineHeight: Math.round(font.label * 1.3) }]}>
          {text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: BUTTON_HEIGHT,
    minWidth: MIN_TOUCH_SIZE,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
});
