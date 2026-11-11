import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { cardShadow, radius, spacing, toneColors, type Tone } from '@/theme/tokens';

import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = ViewProps & {
  tone?: Tone;
  /** Título curto do cartão, com ícone ao lado (o estado nunca depende só da cor). */
  title?: string;
  icon?: IconName;
  children?: ReactNode;
};

/**
 * Cartão: fundo branco (ou de um tom semântico), cantos arredondados e sombra discreta.
 * Sem bordas grossas; a borda é só decorativa.
 */
export function Card({ tone = 'neutral', title, icon, children, style, ...rest }: Props) {
  const { colors, font } = useTheme();
  const t = toneColors[tone];
  return (
    <View
      {...rest}
      style={[
        styles.card,
        tone === 'neutral' ? cardShadow : null,
        { backgroundColor: colors[t.surface], borderColor: tone === 'neutral' ? colors.borderSoft : colors[t.surface] },
        style,
      ]}
    >
      {title ? (
        <View style={styles.titleRow}>
          {icon ? (
            <Ionicons name={icon} size={Math.round(font.heading * 1.1)} color={colors[t.icon]} accessibilityElementsHidden />
          ) : null}
          <AppText size="heading" color={t.text} style={styles.title}>
            {title}
          </AppText>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: { flex: 1 },
});
