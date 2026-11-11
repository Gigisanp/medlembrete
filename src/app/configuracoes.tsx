import { router } from 'expo-router';
import { useState } from 'react';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { REPEAT_COUNT, REPEAT_OPTIONS } from '@/domain/doses';
import { scheduleTestNotification, TEST_FIRST_SECONDS } from '@/notifications/service';
import { useTheme } from '@/theme/ThemeProvider';
import { FONT_SIZE_OPTIONS, fontSizeLabels } from '@/theme/tokens';

/** Ajustes: aberto pelo botão "Ajustes" no cabeçalho das telas principais (Hoje, Remédios, Histórico e Ajuda). */
export default function SettingsScreen() {
  const { fontSize, setFontSize } = useTheme();
  const { settings, setRepeatMinutes, permission, eraseAll } = useAppData();
  const [testScheduled, setTestScheduled] = useState(false);
  const [testError, setTestError] = useState(false);
  const [confirmingErase, setConfirmingErase] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseError, setEraseError] = useState(false);

  async function erase() {
    setErasing(true);
    setEraseError(false);
    try {
      await eraseAll();
    } catch {
      // Não mostra sucesso: os dados continuam no celular.
      setErasing(false);
      setEraseError(true);
      return;
    }
    // Volta ao primeiro acesso, sem tela anterior.
    if (router.canDismiss()) router.dismissAll();
    router.replace({ pathname: '/questionario', params: { apagado: '1' } });
  }

  return (
    <Screen title="Ajustes" back>
      <Card title="Tamanho da letra" icon="text-outline">
        <AppText muted>Escolha o tamanho mais confortável para ler.</AppText>
        {FONT_SIZE_OPTIONS.map((option) => (
          <AppButton
            key={option}
            label={fontSizeLabels[option]}
            selected={fontSize === option}
            onPress={() => setFontSize(option)}
          />
        ))}
        <AppText>Exemplo de texto com o tamanho escolhido.</AppText>
      </Card>

      <Card title="Repetir o aviso" icon="alarm-outline">
        <AppText muted>{`Se você não confirmar, o aviso repete até ${REPEAT_COUNT} vezes. Escolha o intervalo:`}</AppText>
        {REPEAT_OPTIONS.map((minutes) => (
          <AppButton
            key={minutes}
            label={`A cada ${minutes} minutos`}
            selected={settings.repeatMinutes === minutes}
            onPress={() => setRepeatMinutes(minutes)}
          />
        ))}
      </Card>

      <Card title="Testar aviso" icon="notifications-outline">
        <AppText muted>{`Receba um aviso de teste em ${TEST_FIRST_SECONDS} segundos. Ele não registra nada.`}</AppText>
        <AppButton
          label="Testar aviso"
          icon="play-circle-outline"
          onPress={async () => {
            if (permission.state !== 'granted') {
              router.push('/permissao');
              return;
            }
            setTestError(false);
            try {
              await scheduleTestNotification();
              setTestScheduled(true);
            } catch {
              setTestError(true);
            }
          }}
        />
        {testScheduled ? (
          <AppText bold color="successText" accessibilityLiveRegion="polite">
            {`Aviso de teste marcado. Bloqueie a tela ou saia do app e aguarde ${TEST_FIRST_SECONDS} segundos.`}
          </AppText>
        ) : null}
        {testError ? (
          <AppText bold color="dangerText" accessibilityLiveRegion="polite">
            ⚠ Não foi possível marcar o aviso de teste. Tente de novo.
          </AppText>
        ) : null}
      </Card>

      <Card title="Questionário inicial" icon="list-outline">
        <AppText muted>Os medicamentos já cadastrados continuam salvos.</AppText>
        <AppButton label="Refazer questionário" icon="refresh-outline" onPress={() => router.push('/questionario')} />
      </Card>

      <Card tone="danger" title="Apagar tudo" icon="trash-outline">
        <AppText color="dangerText">
          Apaga deste celular os remédios, horários, registros, contatos de ajuda e ajustes. Os avisos também são
          cancelados.
        </AppText>
        {confirmingErase ? (
          <>
            <AppText bold color="dangerText">
              Tem certeza? Não dá para desfazer.
            </AppText>
            {eraseError ? (
              <AppText bold color="dangerText" accessibilityLiveRegion="polite">
                ⚠ Não foi possível apagar. Os seus dados continuam no celular. Tente de novo.
              </AppText>
            ) : null}
            <AppButton
              label="Sim, apagar tudo"
              variant="danger"
              icon="trash"
              loading={erasing}
              loadingLabel="Apagando…"
              onPress={erase}
            />
            <AppButton
              label="Não, manter meus dados"
              disabled={erasing}
              onPress={() => {
                setConfirmingErase(false);
                setEraseError(false);
              }}
            />
          </>
        ) : (
          <AppButton label="Apagar tudo" variant="danger" icon="trash-outline" onPress={() => setConfirmingErase(true)} />
        )}
      </Card>
    </Screen>
  );
}
