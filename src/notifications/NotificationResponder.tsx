import * as Notifications from 'expo-notifications';
import { router, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAppData } from '@/data/AppDataProvider';
import { formatClock } from '@/domain/doses';

import {
  ACTION_NOT_YET,
  ACTION_TAKEN,
  cancelTestNotifications,
  scheduleTestRepeat,
  type NotificationData,
} from './service';

/**
 * Trata a resposta da pessoa a um aviso, inclusive quando o toque abre o app fechado:
 * - "Já tomei": registra a dose com data e hora e mostra "Registro salvo com sucesso";
 * - "Ainda não": repete o aviso depois do intervalo (padrão 10 minutos);
 * - toque no aviso: abre a pergunta "Você tomou?".
 */
export function NotificationResponder() {
  const response = Notifications.useLastNotificationResponse();
  const navigationReady = Boolean(useRootNavigationState()?.key);
  const { ready, confirmDose, snoozeDose } = useAppData();
  const handled = useRef(new Set<string>());

  useEffect(() => {
    if (!response || !ready || !navigationReady) return;

    const { notification, actionIdentifier } = response;
    const key = `${notification.request.identifier}|${notification.date}|${actionIdentifier}`;
    if (handled.current.has(key)) return;
    handled.current.add(key);
    Notifications.clearLastNotificationResponse();

    const data = notification.request.content.data as NotificationData | undefined;
    if (!data) return;

    (async () => {
      if (data.kind === 'test') {
        if (actionIdentifier === ACTION_TAKEN) await cancelTestNotifications();
        if (actionIdentifier === ACTION_NOT_YET) await scheduleTestRepeat();
        router.push({ pathname: '/registro', params: { test: '1', result: resultFor(actionIdentifier) } });
        return;
      }

      const params: Record<string, string> = { date: data.date, time: data.time };
      try {
        if (actionIdentifier === ACTION_TAKEN) {
          await confirmDose(data.date, data.time);
          params.result = 'saved';
        } else if (actionIdentifier === ACTION_NOT_YET) {
          const until = await snoozeDose(data.date, data.time);
          params.result = 'snoozed';
          params.until = formatClock(until);
        }
      } catch {
        // Se não salvou, abre a pergunta "Você tomou?" para a pessoa tentar de novo.
      }
      router.push({ pathname: '/registro', params });
    })();
  }, [response, ready, navigationReady, confirmDose, snoozeDose]);

  return null;
}

function resultFor(actionIdentifier: string): string {
  if (actionIdentifier === ACTION_TAKEN) return 'saved';
  if (actionIdentifier === ACTION_NOT_YET) return 'snoozed';
  return '';
}
