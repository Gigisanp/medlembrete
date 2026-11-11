import { router } from 'expo-router';
import { useState } from 'react';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { REPEAT_COUNT, REPEAT_OPTIONS } from '@/domain/doses';
import { scheduleTestNotification, TEST_FIRST_SECONDS } from '@/notifications/service';
import { useTheme } from '@/theme/ThemeProvider';
import { FONT_SIZE_OPTIONS, fontSizeLabels } from '@/theme/tokens';

export default function SettingsScreen() {
  const { fontSize, setFontSize } = useTheme();
  const { settings, setRepeatMinutes, permission } = useAppData();
  const [testScheduled, setTestScheduled] = useState(false);

  return (
    <Screen>
      <AppText size="heading">Tamanho da letra</AppText>
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

      <AppText size="heading">Repetir o aviso</AppText>
      <AppText muted>
        {`Se você não confirmar, o aviso repete até ${REPEAT_COUNT} vezes. Escolha o intervalo:`}
      </AppText>
      {REPEAT_OPTIONS.map((minutes) => (
        <AppButton
          key={minutes}
          label={`A cada ${minutes} minutos`}
          selected={settings.repeatMinutes === minutes}
          onPress={() => setRepeatMinutes(minutes)}
        />
      ))}

      <AppText size="heading">Testar aviso</AppText>
      <AppText muted>
        {`Receba um aviso de teste em ${TEST_FIRST_SECONDS} segundos. Ele não registra nada.`}
      </AppText>
      <AppButton
        label="Testar aviso"
        onPress={async () => {
          if (permission.state !== 'granted') {
            router.push('/permissao');
            return;
          }
          await scheduleTestNotification();
          setTestScheduled(true);
        }}
      />
      {testScheduled ? (
        <AppText bold accessibilityLiveRegion="polite">
          {`Aviso de teste marcado. Bloqueie a tela ou saia do app e aguarde ${TEST_FIRST_SECONDS} segundos.`}
        </AppText>
      ) : null}

      <AppText size="heading">Questionário inicial</AppText>
      <AppText muted>Os medicamentos já cadastrados continuam salvos.</AppText>
      <AppButton label="Refazer questionário" onPress={() => router.push('/questionario')} />
    </Screen>
  );
}
