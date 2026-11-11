import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

/**
 * Ajuda — "Esqueci um horário" (esqueleto).
 * Contatos de ajuda e o botão principal "Pedir ajuda" entram na etapa 5.
 */
export default function HelpScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <AppText size="title">Esqueci um horário</AppText>
      <AppText>Não tome dose extra por conta própria.</AppText>
      <AppText>Siga as instruções da sua receita.</AppText>
      <AppText>Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>

      <View style={[styles.emergency, { borderColor: colors.danger }]}>
        <AppText bold style={{ color: colors.danger }}>
          Em caso de emergência, ligue 192 (SAMU).
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emergency: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
