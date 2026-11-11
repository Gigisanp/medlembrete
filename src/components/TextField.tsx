import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { BUTTON_HEIGHT, radius, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style'> & {
  /** Rótulo sempre visível acima do campo (não some ao digitar). */
  label: string;
  hint?: string;
  error?: string;
};

/**
 * Campo de texto: rótulo permanente, letra grande, limite visível (≥ 3:1),
 * destaque roxo quando ativo e erro logo abaixo, com "⚠" e texto (não só a cor).
 * O texto digitado é mantido quando há erro.
 */
export function TextField({ label, hint, error, multiline, onFocus, onBlur, ...rest }: Props) {
  const { colors, font } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.onLilac : colors.borderControl;

  return (
    <View style={styles.wrapper}>
      <AppText bold>{label}</AppText>
      {hint ? <AppText muted>{hint}</AppText> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.card,
            fontSize: font.body,
            borderColor,
            borderWidth: error || focused ? 3 : 2,
            minHeight: multiline ? BUTTON_HEIGHT * 2 : BUTTON_HEIGHT,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {error ? (
        <View style={[styles.error, { backgroundColor: colors.dangerSurface }]}>
          <AppText bold color="dangerText" accessibilityLiveRegion="polite">
            {`⚠ ${error}`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  error: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
