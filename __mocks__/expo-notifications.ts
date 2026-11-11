/**
 * Mock automático do expo-notifications para o Jest.
 * Guarda os avisos agendados em memória e permite simular a resposta da pessoa a um aviso.
 */
import { useSyncExternalStore } from 'react';

type Request = { identifier: string; content: Record<string, unknown>; trigger: Record<string, unknown> };
type Response = {
  notification: { date: number; request: Request };
  actionIdentifier: string;
};

export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT';

export enum SchedulableTriggerInputTypes {
  DATE = 'date',
}

export enum AndroidImportance {
  MAX = 7,
}

export enum AndroidNotificationVisibility {
  PUBLIC = 1,
}

let scheduled: Request[] = [];
let permission = { status: 'undetermined', granted: false, canAskAgain: true };
let permissionAfterRequest = { status: 'granted', granted: true, canAskAgain: true };
let lastResponse: Response | null = null;
const listeners = new Set<() => void>();

// ---------- Ajudantes para os testes ----------

export function __reset() {
  scheduled = [];
  permission = { status: 'undetermined', granted: false, canAskAgain: true };
  permissionAfterRequest = { status: 'granted', granted: true, canAskAgain: true };
  lastResponse = null;
  listeners.forEach((l) => l());
}

export function __setPermission(status: 'granted' | 'denied' | 'undetermined', canAskAgain = true) {
  permission = { status, granted: status === 'granted', canAskAgain };
}

export function __setPermissionAfterRequest(status: 'granted' | 'denied', canAskAgain = true) {
  permissionAfterRequest = { status, granted: status === 'granted', canAskAgain };
}

export function __getScheduled(): Request[] {
  return scheduled;
}

/** Simula a pessoa tocando no aviso ou num botão dele. */
export function __respond(request: Request, actionIdentifier = DEFAULT_ACTION_IDENTIFIER) {
  lastResponse = { notification: { date: Date.now(), request }, actionIdentifier };
  listeners.forEach((l) => l());
}

// ---------- API usada pelo app ----------

export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn(async () => null);
export const setNotificationCategoryAsync = jest.fn(async () => ({}));

export const getPermissionsAsync = jest.fn(async () => ({ ...permission }));
export const requestPermissionsAsync = jest.fn(async () => {
  permission = { ...permissionAfterRequest };
  return { ...permission };
});

export const scheduleNotificationAsync = jest.fn(async (request: Request) => {
  scheduled = scheduled.filter((r) => r.identifier !== request.identifier);
  scheduled.push(request);
  return request.identifier;
});

export const getAllScheduledNotificationsAsync = jest.fn(async () => [...scheduled]);

export const cancelScheduledNotificationAsync = jest.fn(async (identifier: string) => {
  scheduled = scheduled.filter((r) => r.identifier !== identifier);
});

export const cancelAllScheduledNotificationsAsync = jest.fn(async () => {
  scheduled = [];
});

export function useLastNotificationResponse() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => lastResponse,
  );
}

export const clearLastNotificationResponse = jest.fn(() => {
  lastResponse = null;
});
