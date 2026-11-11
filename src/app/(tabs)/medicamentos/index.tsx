import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusBadge } from '@/components/StatusBadge';
import { useAppData } from '@/data/AppDataProvider';
import { spacing } from '@/theme/tokens';

/** Aba Remédios: lista do que foi cadastrado, com cadastro e edição. */
export default function MedicationsScreen() {
  const { medications } = useAppData();

  return (
    <Screen title="Remédios" settings inTabs>
      <AppButton
        label="Cadastrar medicamento"
        variant="primary"
        icon="add-circle-outline"
        onPress={() => router.push('/medicamentos/novo')}
      />

      {medications.length === 0 ? (
        <Card tone="lilac" title="Nenhum remédio cadastrado" icon="medkit-outline">
          <AppText>Toque em &quot;Cadastrar medicamento&quot; e digite o que a sua receita indicou.</AppText>
        </Card>
      ) : (
        <AppText muted>{medications.length === 1 ? '1 remédio cadastrado' : `${medications.length} remédios cadastrados`}</AppText>
      )}

      {medications.map((med) => (
        <Card key={med.id}>
          <AppText size="heading">{med.name}</AppText>
          {med.times.length > 0 ? (
            <View style={styles.times}>
              <AppText muted>Horários</AppText>
              <AppText bold>{med.times.join('  ·  ')}</AppText>
            </View>
          ) : (
            <StatusBadge tone="info" icon="information-circle-outline" label="Sem horário cadastrado. Toque em Editar para adicionar." />
          )}
          {med.note ? <AppText muted>{`Observação: ${med.note}`}</AppText> : null}
          <AppButton
            label="Editar"
            icon="create-outline"
            accessibilityLabel={`Editar ${med.name}`}
            onPress={() => router.push({ pathname: '/medicamentos/[id]', params: { id: String(med.id) } })}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  times: { gap: spacing.xs },
});
