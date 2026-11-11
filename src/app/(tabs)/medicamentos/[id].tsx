import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
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
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);

  const medication = medications.find((m) => String(m.id) === id);

  if (!medication) {
    return (
      <Screen title="Editar medicamento" back>
        <Card tone="info" title={removing ? 'Medicamento removido' : 'Medicamento não encontrado'} icon="information-circle-outline" />
        <AppButton label="Voltar para Remédios" variant="primary" onPress={() => router.dismissTo('/medicamentos')} />
      </Screen>
    );
  }

  return (
    <Screen title="Editar medicamento" back>
      <MedicationForm
        initial={medication}
        submitLabel="Salvar alterações"
        allowLeave={removing}
        onSave={(input) => saveMedication(input, medication.id)}
        onSaved={() => router.dismissTo('/medicamentos')}
      />

      {confirmingRemoval ? (
        <View style={[styles.confirm, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
          <AppText bold color="dangerText">{`Remover "${medication.name}" e todos os horários dele?`}</AppText>
          <AppText color="dangerText">Os avisos deste remédio também param.</AppText>
          {removeError ? (
            <AppText bold color="dangerText" accessibilityLiveRegion="polite">
              ⚠ Não foi possível remover. Tente de novo.
            </AppText>
          ) : null}
          <AppButton
            label="Sim, remover"
            variant="danger"
            icon="trash-outline"
            loading={removing}
            loadingLabel="Removendo…"
            onPress={async () => {
              setRemoving(true);
              setRemoveError(false);
              try {
                await removeMedication(medication.id);
                router.dismissTo('/medicamentos');
              } catch {
                setRemoving(false);
                setRemoveError(true);
              }
            }}
          />
          <AppButton label="Não, manter" onPress={() => setConfirmingRemoval(false)} disabled={removing} />
        </View>
      ) : (
        <AppButton label="Remover medicamento" variant="danger" icon="trash-outline" onPress={() => setConfirmingRemoval(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  confirm: {
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
