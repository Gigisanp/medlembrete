import { router } from 'expo-router';

import { MedicationForm } from '@/components/MedicationForm';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';

export default function NewMedicationScreen() {
  const { saveMedication } = useAppData();
  return (
    <Screen>
      <MedicationForm
        submitLabel="Salvar medicamento"
        onSubmit={async (input) => {
          await saveMedication(input);
          // Vai para a lista da aba, mesmo quando o cadastro foi aberto pela tela Hoje.
          router.dismissTo('/medicamentos');
        }}
      />
    </Screen>
  );
}
