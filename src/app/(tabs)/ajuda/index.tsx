import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { formatPhone, telUrl, type HelpContact } from '@/domain/contact';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

/**
 * Ajuda — "Esqueci um horário" e "Pedir ajuda".
 * "Pedir ajuda" abre o discador com o telefone do contato (funciona sem internet).
 * O app não completa a ligação: o celular mostra a tela de chamada e a pessoa confirma.
 */
export default function HelpScreen() {
  const { contacts } = useAppData();
  const { colors } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const [dialError, setDialError] = useState(false);

  async function call(contact: HelpContact) {
    setDialError(false);
    try {
      await Linking.openURL(telUrl(contact.phone));
      setChoosing(false);
    } catch {
      setDialError(true);
    }
  }

  return (
    <Screen title="Ajuda" settings inTabs>
      {contacts.length === 0 ? (
        <Card tone="info" title="Pedir ajuda" icon="call-outline">
          <AppText color="infoText">
            Cadastre um familiar, cuidador ou equipe de saúde. Depois, o botão &quot;Pedir ajuda&quot; abre o discador com o
            telefone dessa pessoa.
          </AppText>
          <AppButton
            label="Cadastrar contato de ajuda"
            variant="primary"
            icon="person-add-outline"
            onPress={() => router.push('/ajuda/novo-contato')}
          />
        </Card>
      ) : (
        <Card tone="info" title="Pedir ajuda" icon="call-outline">
          {contacts.length === 1 ? (
            <AppText color="infoText">{`Liga para ${contacts[0].name}, ${formatPhone(contacts[0].phone)}.`}</AppText>
          ) : (
            <AppText color="infoText">{`Você tem ${contacts.length} contatos. Ao tocar, escolha para quem ligar.`}</AppText>
          )}
          <AppButton
            label="Pedir ajuda"
            variant="primary"
            icon="call"
            accessibilityHint={
              contacts.length === 1 ? `Abre o discador para ligar para ${contacts[0].name}` : 'Mostra os contatos para escolher'
            }
            onPress={() => (contacts.length === 1 ? call(contacts[0]) : setChoosing(true))}
          />
          {choosing ? (
            <View style={[styles.choose, { backgroundColor: colors.card }]}>
              <AppText bold>Para quem você quer ligar?</AppText>
              {contacts.map((c) => (
                <AppButton
                  key={c.id}
                  label={`Ligar para ${c.name}`}
                  icon="call-outline"
                  accessibilityHint={`Abre o discador com ${formatPhone(c.phone)}`}
                  onPress={() => call(c)}
                />
              ))}
              <AppButton label="Cancelar" onPress={() => setChoosing(false)} />
            </View>
          ) : null}
          <AppText color="infoText">O celular vai mostrar a tela de chamada. Confirme lá para ligar.</AppText>
          {dialError ? (
            <View style={[styles.error, { backgroundColor: colors.dangerSurface }]}>
              <AppText bold color="dangerText" accessibilityLiveRegion="polite">
                ⚠ Não foi possível abrir o discador neste aparelho.
              </AppText>
            </View>
          ) : null}
        </Card>
      )}

      <Card tone="danger" title="Emergência" icon="warning-outline">
        <AppText bold color="dangerText">
          Em caso de emergência, ligue 192 (SAMU).
        </AppText>
      </Card>

      <Card tone="lilac" title="Esqueci um horário" icon="help-circle-outline">
        <AppText>Não tome dose extra por conta própria.</AppText>
        <AppText>Siga as instruções da sua receita.</AppText>
        <AppText>Em caso de dúvida, fale com o seu médico ou farmacêutico.</AppText>
        <AppButton
          label="Ver os meus remédios e observações"
          icon="medkit-outline"
          accessibilityHint="Abre a aba Remédios, com as observações que você anotou da receita"
          onPress={() => router.navigate('/medicamentos')}
        />
      </Card>

      {contacts.length > 0 ? (
        <Card title="Contatos de ajuda" icon="people-outline">
          {contacts.map((c) => (
            <View key={c.id} style={[styles.contact, { borderColor: colors.borderSoft }]}>
              <AppText bold>{c.name}</AppText>
              <AppText>{formatPhone(c.phone)}</AppText>
              <AppButton
                label="Editar"
                icon="create-outline"
                accessibilityLabel={`Editar contato ${c.name}`}
                onPress={() => router.push({ pathname: '/ajuda/[id]', params: { id: String(c.id) } })}
              />
            </View>
          ))}
          <AppButton label="Adicionar contato" icon="person-add-outline" onPress={() => router.push('/ajuda/novo-contato')} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  choose: {
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  contact: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  error: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
