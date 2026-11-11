import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { CONTENT_MAX_WIDTH, MIN_TOUCH_SIZE, radius, spacing } from '@/theme/tokens';

import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  title: string;
  /** Mostra "Voltar" (ícone + texto). */
  back?: boolean;
  /** Mostra o botão "Ajustes" (ícone + texto) que abre a tela de ajustes. */
  settings?: boolean;
  /** Espaço do topo (área segura), quando o cabeçalho fica no topo da tela. */
  topInset?: number;
};

function HeaderButton({ label, icon, onPress, hint }: { label: string; icon: IconName; onPress: () => void; hint?: string }) {
  const { colors, font } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.headerButton,
        { backgroundColor: pressed ? colors.lilacSelected : colors.lilacSurface },
      ]}
    >
      <Ionicons name={icon} size={Math.round(font.label * 1.2)} color={colors.onLilac} accessibilityElementsHidden />
      <Text style={[styles.headerButtonText, { color: colors.onLilac, fontSize: font.label }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Cabeçalho próprio do app: título que quebra linha (nunca é cortado),
 * "Voltar" com texto e "Ajustes" com texto. Com fonte grande, os botões descem para outra linha.
 */
export function AppHeader({ title, back, settings, topInset = 0 }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrapper, { paddingTop: topInset + spacing.sm, backgroundColor: colors.background, borderBottomColor: colors.borderSoft }]}>
      <View style={styles.inner}>
        {back || settings ? (
          <View style={styles.actions}>
            {back ? (
              <HeaderButton label="Voltar" icon="chevron-back" onPress={() => router.back()} hint="Volta para a tela anterior" />
            ) : (
              <View />
            )}
            {settings ? (
              <HeaderButton
                label="Ajustes"
                icon="settings-outline"
                onPress={() => router.push('/configuracoes')}
                hint="Tamanho da letra, avisos e outras opções"
              />
            ) : null}
          </View>
        ) : null}
        <AppText size="title" style={styles.title}>
          {title}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  inner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_SIZE + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  headerButtonText: {
    fontWeight: '700',
    flexShrink: 1,
  },
  title: {},
});
