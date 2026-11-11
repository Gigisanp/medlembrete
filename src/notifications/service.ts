import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { PlannedNotification } from '@/domain/doses';

/**
 * Avisos locais: agendados e mostrados pelo próprio celular, sem internet e sem servidor.
 * Chegam mesmo com o app fechado.
 */

export const CHANNEL_ID = 'lembretes';
export const CATEGORY_ID = 'dose';
/** Aviso com mais de um remédio: o botão diz "Tomei todos", para ficar claro o que é registrado. */
export const CATEGORY_MULTI_ID = 'dose-varios';
export const ACTION_TAKEN = 'ja-tomei';
export const ACTION_NOT_YET = 'ainda-nao';

/** iOS guarda no máximo 64 avisos agendados por app; deixamos folga. */
export const SCHEDULE_LIMIT = Platform.OS === 'ios' ? 60 : 150;

/** Aviso de teste: chega em 10 segundos e repete em 1 minuto se não for respondido. */
export const TEST_FIRST_SECONDS = 10;
export const TEST_REPEAT_SECONDS = 60;
const TEST_ID = 'teste-0';
const TEST_REPEAT_ID = 'teste-1';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export type NotificationData =
  | { kind: 'dose'; date: string; time: string; attempt: number; count?: number }
  | { kind: 'test'; attempt: number };

let configured = false;

/** Som, canal do Android e botões "Já tomei" / "Ainda não" no próprio aviso. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembretes de remédio',
      importance: AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 600, 300, 600],
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  }

  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: ACTION_TAKEN, buttonTitle: 'Já tomei', options: { opensAppToForeground: true } },
    { identifier: ACTION_NOT_YET, buttonTitle: 'Ainda não', options: { opensAppToForeground: true } },
  ]);
  await Notifications.setNotificationCategoryAsync(CATEGORY_MULTI_ID, [
    { identifier: ACTION_TAKEN, buttonTitle: 'Tomei todos', options: { opensAppToForeground: true } },
    { identifier: ACTION_NOT_YET, buttonTitle: 'Ainda não', options: { opensAppToForeground: true } },
  ]);
}

export async function getPermission(): Promise<{ state: PermissionState; canAskAgain: boolean }> {
  const result = await Notifications.getPermissionsAsync();
  return { state: toState(result.status, result.granted), canAskAgain: result.canAskAgain };
}

export async function requestPermission(): Promise<{ state: PermissionState; canAskAgain: boolean }> {
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return { state: toState(result.status, result.granted), canAskAgain: result.canAskAgain };
}

function toState(status: string, granted: boolean): PermissionState {
  if (granted || status === 'granted') return 'granted';
  return status === 'denied' ? 'denied' : 'undetermined';
}

/** Abre os ajustes do celular, para ligar os avisos quando foram bloqueados. */
export function openSystemSettings(): Promise<void> {
  return Linking.openSettings();
}

// Uma sincronização por vez, para duas mudanças seguidas não se atropelarem.
let queue: Promise<void> = Promise.resolve();

/**
 * Troca os avisos de dose agendados pela lista planejada.
 * Só mexe nos avisos de dose (não apaga um aviso de teste em andamento).
 */
export function syncScheduledDoses(planned: PlannedNotification[]): Promise<void> {
  queue = queue
    .then(async () => {
      await configureNotifications();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const request of scheduled) {
        if (request.identifier.startsWith('dose-')) {
          await Notifications.cancelScheduledNotificationAsync(request.identifier);
        }
      }
      for (const item of planned) {
        await schedule(item.id, item.title, item.body, item.data, item.at);
      }
    })
    .catch((error) => {
      console.warn('[MedLembrete] Não foi possível agendar os avisos.', error);
    });
  return queue;
}

/**
 * "Apagar tudo": cancela todos os avisos agendados (doses, repetições e teste)
 * e tira da central de notificações os que já apareceram.
 * Passa pela mesma fila da sincronização, para nenhum agendamento em andamento voltar depois.
 * Se falhar, o erro é repassado (quem chamou não deve apagar os dados nem mostrar sucesso).
 */
export function cancelAllNotifications(): Promise<void> {
  const run = queue.then(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Aviso de teste em 10 segundos, com repetição em 1 minuto. Não registra nada. */
export async function scheduleTestNotification(): Promise<void> {
  await configureNotifications();
  await cancelTestNotifications();
  const now = Date.now();
  await schedule(
    TEST_ID,
    'Aviso de teste',
    'Este é só um teste do MedLembrete. Você já tomou?',
    { kind: 'test', attempt: 0 },
    new Date(now + TEST_FIRST_SECONDS * 1000),
  );
  await scheduleTestRepeat(now + (TEST_FIRST_SECONDS + TEST_REPEAT_SECONDS) * 1000);
}

/** "Ainda não" no teste: repete em 1 minuto. */
export async function scheduleTestRepeat(at = Date.now() + TEST_REPEAT_SECONDS * 1000): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(TEST_REPEAT_ID);
  await schedule(
    TEST_REPEAT_ID,
    'Aviso de teste (repetição)',
    'Este é só um teste do MedLembrete. Você já tomou?',
    { kind: 'test', attempt: 1 },
    new Date(at),
  );
}

export async function cancelTestNotifications(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(TEST_ID);
  await Notifications.cancelScheduledNotificationAsync(TEST_REPEAT_ID);
}

async function schedule(id: string, title: string, body: string, data: NotificationData, at: Date) {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title,
      body,
      data,
      sound: 'default',
      categoryIdentifier: data.kind === 'dose' && (data.count ?? 1) > 1 ? CATEGORY_MULTI_ID : CATEGORY_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: at,
      channelId: CHANNEL_ID,
      // No Android, "alarmClock" entrega no horário exato, sem atraso por economia de bateria.
      delivery: 'alarmClock',
    },
  });
}
