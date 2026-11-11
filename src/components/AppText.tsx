import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { ColorName, FontRole } from '@/theme/tokens';

type Props = TextProps & {
  size?: FontRole;
  muted?: boolean;
  bold?: boolean;
  /** Cor de um token (ex.: 'successText' dentro de um cartão verde). */
  color?: ColorName;
};

/**
 * Texto padrão do app. Usa os tamanhos do tema (mínimo de 20 px) e acompanha
 * a ampliação de fonte do sistema, sem limite: o texto quebra linha em vez de ser cortado.
 */
export function AppText({ size = 'body', muted, bold, color, style, ...rest }: Props) {
  const { colors, font } = useTheme();
  const isHeading = size === 'heading' || size === 'title' || size === 'display';

  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      {...rest}
      style={[
        styles.base,
        {
          color: color ? colors[color] : muted ? colors.textMuted : colors.text,
          fontSize: font[size],
          lineHeight: Math.round(font[size] * (isHeading ? 1.25 : 1.4)),
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
