import { router } from 'expo-router';
import { useState } from 'react';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
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
      <Screen title="Avisos" back={router.canGoBack()}>
        <Card tone="success" title="✓ Avisos ligados" icon="notifications-outline">
          <AppText color="successText">O MedLembrete vai avisar com som na hora de cada remédio, mesmo com o app fechado.</AppText>
        </Card>
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
      <Screen title="Avisos" back={router.canGoBack()}>
        <Card tone="attention" title="Os avisos estão bloqueados" icon="notifications-off-outline">
          <AppText color="attentionText">Sem os avisos, o app não consegue lembrar você na hora dos remédios.</AppText>
          <AppText color="attentionText">
            Para ligar: toque em &quot;Abrir ajustes do celular&quot;, entre em &quot;Notificações&quot; e ative os avisos.
          </AppText>
        </Card>
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
    <Screen title="Avisos" back={router.canGoBack()}>
      <AppText size="title">Avisos na hora do remédio</AppText>
      <Card tone="lilac">
        <AppText>
          Para lembrar você na hora de cada remédio, o MedLembrete precisa enviar avisos com som, mesmo com o
          app fechado.
        </AppText>
        <AppText>Os avisos são criados no próprio celular. Nada é enviado pela internet.</AppText>
      </Card>
      <AppText bold>Na próxima mensagem, o celular vai perguntar se você permite. Toque em &quot;Permitir&quot;.</AppText>
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
