import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import * as repository from '@/db/repository';
import { createContact, saveFontSize, USER_TABLES, type Db } from '@/db/repository';

import { databaseAfterOnboarding, notificationsMock, renderApp } from '../test-utils/renderApp';
import type { TestDatabase } from '../test-utils/nodeSqlite';

const NOW = new Date(2026, 10, 11, 9, 0, 0);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function countRows(db: TestDatabase) {
  const counts: Record<string, number> = {};
  for (const table of USER_TABLES) {
    counts[table] = (await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))!.n;
  }
  return counts;
}

/** Banco com remédio, horário, registro, adiamento, contato e preferências; e avisos agendados. */
async function setupFullData() {
  const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: 'Texto fictício', times: ['08:00', '20:00'] }]);
  const asDb = db as unknown as Db;
  await repository.confirmSlot(asDb, {
    date: '2026-11-11',
    time: '08:00',
    medications: [{ id: 1, name: 'Remédio A' }],
    takenAt: new Date(2026, 10, 11, 8, 5),
  });
  await repository.snoozeSlot(asDb, { date: '2026-11-10', time: '20:00', until: new Date().toISOString() });
  await createContact(asDb, { name: 'Maria', phone: '11900000000' });
  await saveFontSize(asDb, 'muitoGrande');
  notificationsMock.__setPresented(['dose-2026-11-11-08:00-0']);
  return db;
}

async function openEraseConfirmation() {
  await renderApp('/configuracoes');
  await waitFor(() =>
    expect(notificationsMock.__getScheduled().some((r) => r.identifier.startsWith('dose-'))).toBe(true),
  );
  await fireEvent.press(await screen.findByRole('button', { name: 'Apagar tudo' }));
  expect(screen.getByText('Tem certeza? Não dá para desfazer.')).toBeOnTheScreen();
}

describe('Apagar tudo', () => {
  it('exige confirmação: o primeiro toque não apaga nada; "Não" cancela', async () => {
    const db = await setupFullData();
    await openEraseConfirmation();
    expect((await countRows(db)).medications).toBe(1);
    await press('Não, manter meus dados');
    expect(screen.queryByText('Tem certeza? Não dá para desfazer.')).toBeNull();
    expect(await countRows(db)).toMatchObject({ medications: 1, help_contacts: 1, dose_logs: 1 });
  });

  it('cancela todos os avisos, apaga todos os dados e volta ao primeiro acesso', async () => {
    const db = await setupFullData();
    await openEraseConfirmation();
    expect(Object.values(await countRows(db)).every((n) => n > 0)).toBe(true);

    await press('Sim, apagar tudo');

    expect(await screen.findByText('Os seus dados foram apagados')).toBeOnTheScreen();
    expect(screen.getByText('Qual é a sua idade?')).toBeOnTheScreen();
    expect(screen).toHavePathname('/questionario');
    // Primeiro acesso: não há tela anterior para voltar.
    expect(screen.queryByRole('button', { name: 'Voltar' })).toBeNull();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(notificationsMock.__getScheduled()).toEqual([]);
    expect(notificationsMock.__getPresented()).toEqual([]);

    expect(await countRows(db)).toEqual({
      dose_logs: 0,
      snoozes: 0,
      medication_times: 0,
      medications: 0,
      help_contacts: 0,
      settings: 0,
    });

    // Nenhum aviso volta a ser agendado depois.
    await waitFor(() => expect(notificationsMock.__getScheduled()).toEqual([]));
  });

  it('se não conseguir cancelar os avisos, não apaga nada e não mostra sucesso', async () => {
    const db = await setupFullData();
    await openEraseConfirmation();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    Notifications.cancelAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('falhou'));

    await press('Sim, apagar tudo');

    expect(
      await screen.findByText('⚠ Não foi possível apagar. Os seus dados continuam no celular. Tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Os seus dados foram apagados')).toBeNull();
    expect(screen).toHavePathname('/configuracoes');
    expect(await countRows(db)).toMatchObject({ medications: 1, help_contacts: 1, dose_logs: 1, settings: expect.any(Number) });
    expect(screen.getByRole('button', { name: 'Sim, apagar tudo' })).toBeEnabled();
  });

  it('se o banco falhar, não mostra sucesso, mantém os dados e reagenda os avisos', async () => {
    const db = await setupFullData();
    await openEraseConfirmation();
    jest.spyOn(repository, 'wipeAllData').mockRejectedValueOnce(new Error('disco'));

    await press('Sim, apagar tudo');

    expect(
      await screen.findByText('⚠ Não foi possível apagar. Os seus dados continuam no celular. Tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Os seus dados foram apagados')).toBeNull();
    expect((await countRows(db)).medications).toBe(1);
    await waitFor(() =>
      expect(notificationsMock.__getScheduled().some((r) => r.identifier === 'dose-2026-11-11-20:00-0')).toBe(true),
    );
  });
});
