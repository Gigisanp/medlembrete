import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { listDoseLogsSince, listSnoozesSince, type Db } from '@/db/repository';
import { ACTION_NOT_YET, ACTION_TAKEN } from '@/notifications/service';

import { databaseAfterOnboarding, freshDatabase, notificationsMock, renderApp } from '../test-utils/renderApp';

// Relógio fixo: 11/11/2026, 09:00 (horário local). O relógio continua andando normalmente.
const NOW = new Date(2026, 10, 11, 9, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});

afterEach(() => {
  jest.useRealTimers();
});

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const asDb = (db: unknown) => db as Db;
const clock = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Avisos de dose agendados, como "AAAA-MM-DD HH:MM título". */
function scheduledDoses() {
  return notificationsMock
    .__getScheduled()
    .filter((r) => r.identifier.startsWith('dose-'))
    .map((r) => {
      const d = new Date(r.trigger.date);
      return `${d.getDate()}/${clock(d)} ${r.content.title}`;
    })
    .sort();
}

describe('avisos no horário', () => {
  it('agenda o aviso no horário e as repetições de 10 em 10 minutos', async () => {
    await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['10:00'] }]);
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });

    await waitFor(() => expect(scheduledDoses().length).toBeGreaterThan(0));
    expect(scheduledDoses().filter((s) => s.startsWith('11/'))).toEqual([
      '11/10:00 Hora do remédio',
      '11/10:10 Lembrete: hora do remédio',
      '11/10:20 Lembrete: hora do remédio',
      '11/10:30 Lembrete: hora do remédio',
    ]);

    const first = notificationsMock.__getScheduled().find((r) => r.identifier === 'dose-2026-11-11-10:00-0')!;
    expect(first.content).toMatchObject({
      title: 'Hora do remédio',
      body: '10:00 — Remédio A. Você já tomou?',
      sound: 'default',
      categoryIdentifier: 'dose',
    });
    expect(first.trigger).toMatchObject({ type: 'date', channelId: 'lembretes', delivery: 'alarmClock' });
  });

  it('sem permissão, não agenda e mostra que os avisos estão desligados', async () => {
    await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['10:00'] }], { permission: 'denied' });
    await renderApp();
    expect(await screen.findByText('Os avisos estão desligados')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ligar avisos' })).toBeOnTheScreen();
    expect(scheduledDoses()).toEqual([]);
  });
});

describe('"Já tomei" na tela Hoje', () => {
  it('registra a dose com data e hora e para as repetições', async () => {
    const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:50', '20:00'] }]);
    await renderApp();

    // 08:50 já passou e não foi confirmado: aparece em destaque (repetições às 09:10 e 09:20)
    expect(await screen.findByText('Ainda não confirmado')).toBeOnTheScreen();
    expect(screen.getByText('O horário já passou.')).toBeOnTheScreen();
    await waitFor(() => expect(scheduledDoses()).toContain('11/09:10 Lembrete: hora do remédio'));

    await press('Já tomei');

    expect(await screen.findByText('✓ Registro salvo com sucesso')).toBeOnTheScreen();
    expect(screen.getByText('Horário previsto: 08:50')).toBeOnTheScreen();
    expect(screen.getByText('Registrado às 09:00')).toBeOnTheScreen();

    const logs = await listDoseLogsSince(asDb(db), '2026-11-11');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ medicationName: 'Remédio A', date: '2026-11-11', time: '08:50' });
    expect(new Date(logs[0].takenAt).getTime()).toBeGreaterThanOrEqual(NOW.getTime());

    await waitFor(() => expect(scheduledDoses().some((s) => s.startsWith('11/09:'))).toBe(false));

    await press('Voltar para Hoje');
    expect(await screen.findByText('Tomado às 09:00')).toBeOnTheScreen();
    // Horário futuro aparece neutro, como "Próximo horário", e não como pendência
    expect(screen.getByText('Próximo horário')).toBeOnTheScreen();
    expect(screen.getByText('Daqui a 11 horas')).toBeOnTheScreen();
    expect(screen.queryByText('Ainda não confirmado')).toBeNull();
  });
});

describe('resposta ao aviso', () => {
  async function setupWithPendingDose() {
    // 08:50: o aviso já tocou e a repetição das 09:10 ainda está agendada
    const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:50'] }]);
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    await waitFor(() => expect(scheduledDoses()).toContain('11/09:10 Lembrete: hora do remédio'));
    const request = notificationsMock.__getScheduled().find((r) => r.identifier === 'dose-2026-11-11-08:50-2')!;
    return { db, request };
  }

  it('botão "Já tomei" no aviso registra a dose', async () => {
    const { db, request } = await setupWithPendingDose();
    notificationsMock.__respond(request, ACTION_TAKEN);

    expect(await screen.findByText('✓ Registro salvo com sucesso')).toBeOnTheScreen();
    expect(await listDoseLogsSince(asDb(db), '2026-11-11')).toHaveLength(1);
  });

  it('botão "Ainda não" no aviso repete em 10 minutos', async () => {
    const { db, request } = await setupWithPendingDose();
    notificationsMock.__respond(request, ACTION_NOT_YET);

    expect(await screen.findByText('Vamos avisar de novo às 09:10, daqui a 10 minutos.')).toBeOnTheScreen();
    expect(await listSnoozesSince(asDb(db), '2026-11-11')).toHaveLength(1);
    expect(await listDoseLogsSince(asDb(db), '2026-11-11')).toEqual([]);
    await waitFor(() =>
      expect(scheduledDoses().filter((s) => s.startsWith('11/'))).toEqual([
        '11/09:10 Lembrete: hora do remédio',
        '11/09:20 Lembrete: hora do remédio',
        '11/09:30 Lembrete: hora do remédio',
      ]),
    );
  });

  it('tocar no aviso pergunta "Você tomou?"; "Ainda não" repete o aviso', async () => {
    const { db, request } = await setupWithPendingDose();
    notificationsMock.__respond(request);

    expect(await screen.findByText('Você tomou?')).toBeOnTheScreen();
    expect(screen.getByText('Horário das 08:50')).toBeOnTheScreen();
    await press('Ainda não');

    expect(await screen.findByText('Vamos avisar de novo às 09:10, daqui a 10 minutos.')).toBeOnTheScreen();
    expect(await listSnoozesSince(asDb(db), '2026-11-11')).toHaveLength(1);
  });

  it('tocar no aviso e responder "Sim, tomei" registra a dose', async () => {
    const { db, request } = await setupWithPendingDose();
    notificationsMock.__respond(request);
    await screen.findByText('Você tomou?');
    await press('Sim, tomei');

    expect(await screen.findByText('✓ Registro salvo com sucesso')).toBeOnTheScreen();
    expect(await listDoseLogsSince(asDb(db), '2026-11-11')).toHaveLength(1);
  });
});

describe('permissão de notificações', () => {
  it('explica o motivo e pede a permissão depois do questionário', async () => {
    freshDatabase();
    await renderApp();
    await screen.findByText('Qual é a sua idade?');
    await press('Pular');
    await screen.findByText('Quais medicamentos você usa?');
    await fireEvent.changeText(screen.getByLabelText('Medicamento 1'), 'Remédio A');
    await press('Continuar');
    await fireEvent.changeText(screen.getByLabelText('Horário 1'), '10:00');
    await press('Continuar');
    await press('Confirmar');

    expect(await screen.findByText('Avisos na hora do remédio')).toBeOnTheScreen();
    expect(
      screen.getByText(/precisa enviar avisos com som, mesmo com o app fechado/),
    ).toBeOnTheScreen();
    await press('Permitir avisos');

    expect(await screen.findByRole('tab', { name: 'Hoje', selected: true })).toBeOnTheScreen();
    await waitFor(() => expect(scheduledDoses()).toContain('11/10:00 Hora do remédio'));
  });

  it('se o celular bloqueou, orienta a abrir os ajustes', async () => {
    freshDatabase();
    notificationsMock.__setPermissionAfterRequest('denied', false);
    await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['10:00'] }], {
      permission: 'undetermined',
    });
    notificationsMock.__setPermissionAfterRequest('denied', false);
    await renderApp('/permissao');
    await press('Permitir avisos');
    expect(await screen.findByText('Os avisos estão bloqueados')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir ajustes do celular' })).toBeOnTheScreen();
  });
});

describe('aviso de teste', () => {
  it('agenda um aviso em 10 segundos e a repetição 1 minuto depois', async () => {
    await databaseAfterOnboarding();
    await renderApp('/configuracoes');
    await press('Testar aviso');

    expect(
      await screen.findByText('Aviso de teste marcado. Bloqueie a tela ou saia do app e aguarde 10 segundos.'),
    ).toBeOnTheScreen();
    const tests = notificationsMock.__getScheduled().filter((r) => r.identifier.startsWith('teste-'));
    expect(tests.map((r) => r.identifier)).toEqual(['teste-0', 'teste-1']);
    const delays = tests.map((r) => Math.round((new Date(r.trigger.date).getTime() - Date.now()) / 1000));
    expect(delays[0]).toBeGreaterThanOrEqual(9);
    expect(delays[0]).toBeLessThanOrEqual(10);
    expect(delays[1]).toBeGreaterThanOrEqual(69);
    expect(delays[1]).toBeLessThanOrEqual(70);
  });

  it('responder ao teste não registra nada', async () => {
    const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00'] }]);
    await renderApp('/configuracoes');
    await press('Testar aviso');
    const test = notificationsMock.__getScheduled().find((r) => r.identifier === 'teste-0')!;
    notificationsMock.__respond(test, ACTION_TAKEN);

    expect(await screen.findByText('Este foi só um teste')).toBeOnTheScreen();
    expect(screen.getByText('Nada foi registrado.')).toBeOnTheScreen();
    expect(await listDoseLogsSince(asDb(db), '2026-11-01')).toEqual([]);
    expect(notificationsMock.__getScheduled().some((r) => r.identifier === 'teste-1')).toBe(false);
  });
});
