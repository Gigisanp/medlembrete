import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { BUTTON_HEIGHT, MIN_TOUCH_SIZE, radius, spacing } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  /** Rótulo sempre visível. Não existe botão só com ícone. */
  label: string;
  variant?: Variant;
  /** Para opções selecionáveis: mostra "✓" no texto, sem depender só da cor. */
  selected?: boolean;
};

/**
 * Botão padrão: altura de 60 px (mínimo exigido é 44 px), largura total,
 * rótulo visível e contraste de pelo menos 4,5:1.
 * Use no máximo um botão "primary" por tela.
 */
export function AppButton({ label, variant = 'secondary', selected, disabled, ...rest }: Props) {
  const { colors, font } = useTheme();

  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.background, pressed: colors.secondaryPressed, fg: colors.primary, border: colors.primary },
    danger: { bg: colors.danger, pressed: colors.danger, fg: colors.onDanger, border: colors.danger },
  }[variant];

  const text = selected ? `✓ ${label}` : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderColor: palette.border,
          borderWidth: selected ? 4 : 2,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text
        maxFontSizeMultiplier={2}
        style={[styles.label, { color: palette.fg, fontSize: font.label }]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: BUTTON_HEIGHT,
    minWidth: MIN_TOUCH_SIZE,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
});
