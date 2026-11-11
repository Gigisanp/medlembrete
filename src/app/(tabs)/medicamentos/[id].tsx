import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { MedicationForm } from '@/components/MedicationForm';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

export default function EditMedicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { medications, saveMedication, removeMedication } = useAppData();
  const { colors } = useTheme();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const medication = medications.find((m) => String(m.id) === id);

  if (!medication) {
    return (
      <Screen>
        <AppText>Medicamento não encontrado.</AppText>
        <AppButton label="Voltar para Remédios" variant="primary" onPress={() => router.dismissTo('/medicamentos')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <MedicationForm
        initial={medication}
        submitLabel="Salvar alterações"
        onSubmit={async (input) => {
          await saveMedication(input, medication.id);
          router.dismissTo('/medicamentos');
        }}
      />

      {confirmingRemoval ? (
        <View style={[styles.confirm, { borderColor: colors.danger }]}>
          <AppText bold>{`Remover "${medication.name}" e todos os horários dele?`}</AppText>
          <AppButton
            label="Sim, remover"
            variant="danger"
            onPress={async () => {
              await removeMedication(medication.id);
              router.dismissTo('/medicamentos');
            }}
          />
          <AppButton label="Não, manter" onPress={() => setConfirmingRemoval(false)} />
        </View>
      ) : (
        <AppButton label="Remover medicamento" onPress={() => setConfirmingRemoval(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  confirm: {
    borderWidth: 3,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
});
