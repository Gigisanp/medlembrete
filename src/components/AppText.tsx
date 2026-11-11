import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { FontRole } from '@/theme/tokens';

type Props = TextProps & {
  size?: FontRole;
  muted?: boolean;
  bold?: boolean;
};

/**
 * Texto padrão do app. Sempre usa os tamanhos do tema (mínimo de 20 px)
 * e respeita também o tamanho de fonte do sistema do celular.
 */
export function AppText({ size = 'body', muted, bold, style, ...rest }: Props) {
  const { colors, font } = useTheme();
  const isHeading = size === 'heading' || size === 'title' || size === 'display';

  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={2}
      {...rest}
      style={[
        styles.base,
        {
          color: muted ? colors.textMuted : colors.text,
          fontSize: font[size],
          lineHeight: Math.round(font[size] * 1.35),
          fontWeight: bold || isHeading ? '700' : '400',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 1,
  },
});
