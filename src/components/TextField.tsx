import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { BUTTON_HEIGHT, radius, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style'> & {
  /** Rótulo sempre visível acima do campo. */
  label: string;
  hint?: string;
  error?: string;
};

/**
 * Campo de texto com rótulo visível, letra grande e mensagem de erro
 * com símbolo "⚠" (não depende só da cor vermelha).
 */
export function TextField({ label, hint, error, multiline, ...rest }: Props) {
  const { colors, font } = useTheme();
  return (
    <View style={styles.wrapper}>
      <AppText bold>{label}</AppText>
      {hint ? <AppText muted>{hint}</AppText> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor={colors.textMuted}
        maxFontSizeMultiplier={2}
        multiline={multiline}
        {...rest}
        style={[
          styles.input,
          {
            color: colors.text,
            fontSize: font.body,
            borderColor: error ? colors.danger : colors.border,
            borderWidth: error ? 3 : 2,
            minHeight: multiline ? BUTTON_HEIGHT * 2 : BUTTON_HEIGHT,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {error ? (
        <AppText bold style={{ color: colors.danger }} accessibilityLiveRegion="polite">
          {`⚠ ${error}`}
        </AppText>
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
    backgroundColor: '#FFFFFF',
  },
});
