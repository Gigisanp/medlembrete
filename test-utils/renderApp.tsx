import { renderRouter } from 'expo-router/testing-library';

import RootLayout from '@/app/_layout';
import TabsLayout from '@/app/(tabs)/_layout';
import HelpScreen from '@/app/(tabs)/ajuda';
import SettingsScreen from '@/app/(tabs)/configuracoes';
import HistoryScreen from '@/app/(tabs)/historico';
import HomeScreen from '@/app/(tabs)/index';
import EditMedicationScreen from '@/app/(tabs)/medicamentos/[id]';
import * as medicationsLayout from '@/app/(tabs)/medicamentos/_layout';
import MedicationsScreen from '@/app/(tabs)/medicamentos/index';
import NewMedicationScreen from '@/app/(tabs)/medicamentos/novo';
import PermissionScreen from '@/app/permissao';
import OnboardingScreen from '@/app/questionario';
import RecordScreen from '@/app/registro';
import { completeOnboarding, markNotificationsAsked, type Db } from '@/db/repository';
import { migrateDbIfNeeded } from '@/db/schema';
import type { MedicationInput } from '@/domain/medication';

import { createTestDatabase, type TestDatabase } from './nodeSqlite';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const sqliteMock = require('expo-sqlite') as { __setTestDatabase: (db: TestDatabase) => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const notificationsMock = require('expo-notifications') as {
  __reset: () => void;
  __setPermission: (status: 'granted' | 'denied' | 'undetermined', canAskAgain?: boolean) => void;
  __setPermissionAfterRequest: (status: 'granted' | 'denied', canAskAgain?: boolean) => void;
  __getScheduled: () => {
    identifier: string;
    content: { title: string; body: string; data: Record<string, unknown> };
    trigger: { date: Date };
  }[];
  __respond: (request: unknown, actionIdentifier?: string) => void;
};

export const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': HomeScreen,
  // Módulo inteiro, para valer o unstable_settings (Voltar leva à lista).
  '(tabs)/medicamentos/_layout': medicationsLayout,
  '(tabs)/medicamentos/index': MedicationsScreen,
  '(tabs)/medicamentos/novo': NewMedicationScreen,
  '(tabs)/medicamentos/[id]': EditMedicationScreen,
  '(tabs)/historico': HistoryScreen,
  '(tabs)/ajuda': HelpScreen,
  '(tabs)/configuracoes': SettingsScreen,
  questionario: OnboardingScreen,
  registro: RecordScreen,
  permissao: PermissionScreen,
};

/** Banco novo e vazio, como na primeira abertura do app (avisos ainda sem permissão). */
export function freshDatabase(): TestDatabase {
  notificationsMock.__reset();
  const db = createTestDatabase();
  sqliteMock.__setTestDatabase(db);
  return db;
}

/**
 * Banco com o questionário já respondido e a tela de permissão já vista.
 * Por padrão, os avisos estão permitidos.
 */
export async function databaseAfterOnboarding(
  medications: MedicationInput[] = [],
  { permission = 'granted' }: { permission?: 'granted' | 'denied' | 'undetermined' } = {},
): Promise<TestDatabase> {
  const db = freshDatabase();
  await migrateDbIfNeeded(db);
  await completeOnboarding(db as unknown as Db, { age: null, medications });
  await markNotificationsAsked(db as unknown as Db);
  notificationsMock.__setPermission(permission);
  return db;
}

export async function renderApp(initialUrl = '/') {
  return renderRouter(routes, { initialUrl });
}
