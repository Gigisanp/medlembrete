import { router } from 'expo-router';
import { useState } from 'react';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { useAppData } from '@/data/AppDataProvider';
import { openSystemSettings } from '@/notifications/service';

function goHome() {
  if (router.canDismiss()) router.dismissAll();
  else router.replace('/');
}

/**
 * Explica em texto grande por que o app precisa de notificações, antes de o sistema perguntar.
 * Aparece uma vez depois do questionário e pode ser aberta de novo pela tela Hoje.
 */
export default function PermissionScreen() {
  const { permission, requestNotificationPermission, markNotificationsAsked } = useAppData();
  const [asking, setAsking] = useState(false);

  if (permission.state === 'granted') {
    return (
      <Screen>
        <AppText size="title">✓ Avisos ligados</AppText>
        <AppText>O MedLembrete vai avisar com som na hora de cada remédio, mesmo com o app fechado.</AppText>
        <AppButton
          label="Continuar"
          variant="primary"
          onPress={async () => {
            await markNotificationsAsked();
            goHome();
          }}
        />
      </Screen>
    );
  }

  if (permission.state === 'denied' && !permission.canAskAgain) {
    return (
      <Screen>
        <AppText size="title">Os avisos estão bloqueados</AppText>
        <AppText>Sem os avisos, o app não consegue lembrar você na hora dos remédios.</AppText>
        <AppText>
          Para ligar: toque em "Abrir ajustes do celular", entre em "Notificações" e ative os avisos.
        </AppText>
        <AppButton label="Abrir ajustes do celular" variant="primary" onPress={() => openSystemSettings()} />
        <AppButton
          label="Agora não"
          onPress={async () => {
            await markNotificationsAsked();
            goHome();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText size="title">Avisos na hora do remédio</AppText>
      <AppText>
        Para lembrar você na hora de cada remédio, o MedLembrete precisa enviar avisos com som, mesmo com o
        app fechado.
      </AppText>
      <AppText>Os avisos são criados no próprio celular. Nada é enviado pela internet.</AppText>
      <AppText bold>Na próxima mensagem, o celular vai perguntar se você permite. Toque em "Permitir".</AppText>
      <AppButton
        label="Permitir avisos"
        variant="primary"
        disabled={asking}
        onPress={async () => {
          setAsking(true);
          const result = await requestNotificationPermission();
          setAsking(false);
          if (result.state === 'granted') {
            await markNotificationsAsked();
            goHome();
          }
        }}
      />
      <AppButton
        label="Agora não"
        onPress={async () => {
          await markNotificationsAsked();
          goHome();
        }}
      />
    </Screen>
  );
}
