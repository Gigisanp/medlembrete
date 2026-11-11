import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ContactForm } from '@/components/ContactForm';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

export default function EditContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contacts, saveContact, removeContact } = useAppData();
  const { colors } = useTheme();
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);

  const contact = contacts.find((c) => String(c.id) === id);

  if (!contact) {
    return (
      <Screen title="Editar contato" back>
        <Card tone="info" title={removing ? 'Contato removido' : 'Contato não encontrado'} icon="information-circle-outline" />
        <AppButton label="Voltar para Ajuda" variant="primary" onPress={() => router.dismissTo('/ajuda')} />
      </Screen>
    );
  }

  return (
    <Screen title="Editar contato" back>
      <ContactForm
        initial={contact}
        submitLabel="Salvar alterações"
        allowLeave={removing}
        onSave={(input) => saveContact(input, contact.id)}
        onSaved={() => router.dismissTo('/ajuda')}
      />

      {confirmingRemoval ? (
        <View style={[styles.confirm, { backgroundColor: colors.dangerSurface, borderColor: colors.danger }]}>
          <AppText bold color="dangerText">{`Remover "${contact.name}" dos contatos de ajuda?`}</AppText>
          {removeError ? (
            <AppText bold color="dangerText" accessibilityLiveRegion="polite">
              ⚠ Não foi possível remover. Tente de novo.
            </AppText>
          ) : null}
          <AppButton
            label="Sim, remover contato"
            variant="danger"
            icon="trash-outline"
            loading={removing}
            loadingLabel="Removendo…"
            onPress={async () => {
              setRemoving(true);
              setRemoveError(false);
              try {
                await removeContact(contact.id);
                router.dismissTo('/ajuda');
              } catch {
                setRemoving(false);
                setRemoveError(true);
              }
            }}
          />
          <AppButton label="Não, manter" onPress={() => setConfirmingRemoval(false)} disabled={removing} />
        </View>
      ) : (
        <AppButton label="Remover contato" variant="danger" icon="trash-outline" onPress={() => setConfirmingRemoval(true)} />
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
