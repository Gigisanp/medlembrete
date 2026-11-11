import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing, toneColors, type Tone } from '@/theme/tokens';

import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Etiqueta de estado: ícone + texto + cor (nunca só a cor). */
export function StatusBadge({ tone, icon, label }: { tone: Tone; icon: IconName; label: string }) {
  const { colors, font } = useTheme();
  const t = toneColors[tone];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors[tone === 'neutral' ? 'lilacSurface' : t.surface],
        },
      ]}
    >
      <Ionicons name={icon} size={Math.round(font.body * 1.1)} color={colors[t.icon]} accessibilityElementsHidden />
      <AppText bold color={tone === 'neutral' ? 'textMuted' : t.text} style={styles.text}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  text: { flexShrink: 1 },
});
