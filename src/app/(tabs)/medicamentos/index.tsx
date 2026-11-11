import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

/** Aba Remédios: lista do que foi cadastrado, com cadastro e edição. */
export default function MedicationsScreen() {
  const { medications } = useAppData();
  const { colors } = useTheme();

  return (
    <Screen>
      <AppText size="title">Seus medicamentos</AppText>
      <AppButton
        label="Cadastrar medicamento"
        variant="primary"
        onPress={() => router.push('/medicamentos/novo')}
      />

      {medications.length === 0 ? <AppText>Você ainda não tem medicamentos cadastrados.</AppText> : null}

      {medications.map((med) => (
        <View key={med.id} style={[styles.card, { borderColor: colors.border }]}>
          <AppText bold>{med.name}</AppText>
          <AppText>
            {med.times.length > 0
              ? `Horários: ${med.times.join(', ')}`
              : 'Sem horário cadastrado. Toque em Editar para adicionar.'}
          </AppText>
          {med.note ? <AppText muted>{`Observação: ${med.note}`}</AppText> : null}
          <AppButton
            label="Editar"
            accessibilityLabel={`Editar ${med.name}`}
            onPress={() => router.push({ pathname: '/medicamentos/[id]', params: { id: String(med.id) } })}
          />
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
