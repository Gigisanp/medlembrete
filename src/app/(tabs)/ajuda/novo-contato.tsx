import { router } from 'expo-router';

import { ContactForm } from '@/components/ContactForm';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';

export default function NewContactScreen() {
  const { saveContact } = useAppData();
  return (
    <Screen title="Novo contato de ajuda" back>
      <ContactForm
        submitLabel="Salvar contato"
        onSave={(input) => saveContact(input)}
        onSaved={() => router.dismissTo('/ajuda')}
      />
    </Screen>
  );
}
