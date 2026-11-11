import { fireEvent, screen } from '@testing-library/react-native';

import { confirmSlot, type Db } from '@/db/repository';

import { databaseAfterOnboarding, renderApp } from '../test-utils/renderApp';

const NOW = new Date(2026, 10, 11, 9, 0, 0);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});
afterEach(() => jest.useRealTimers());

describe('tela Histórico', () => {
  it('carrega os registros do banco e mostra por dia, com hora real e sem afirmar que não tomou', async () => {
    const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00', '20:00'] }]);
    // O remédio foi cadastrado "agora" (11/11); para ter "Ontem", ajusta a data de cadastro.
    await db.runAsync("UPDATE medications SET created_at = '2026-11-09T10:00:00.000Z'");
    await confirmSlot(db as unknown as Db, {
      date: '2026-11-10',
      time: '08:00',
      medications: [{ id: 1, name: 'Remédio A' }],
      takenAt: new Date(2026, 10, 10, 8, 12),
    });

    await renderApp('/historico');
    expect(await screen.findByRole('header', { name: 'Hoje' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Ontem' })).toBeOnTheScreen();
    expect(screen.getByText('Tomado às 08:12')).toBeOnTheScreen();
    // Ontem 20:00 e hoje 08:00 ficaram sem confirmação; hoje 20:00 ainda vai chegar.
    expect(screen.getAllByText('Sem confirmação').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Daqui a 11 horas')).toBeOnTheScreen();
    expect(
      screen.getByText(
        '"Sem confirmação" quer dizer que o registro não foi feito no app. Não quer dizer que o remédio não foi tomado.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('1 de 2 registros confirmados')).toBeOnTheScreen();
    expect(screen.queryByText('Ainda não há registros.')).toBeNull();
  });

  it('um "Já tomei" feito na tela Hoje aparece no Histórico', async () => {
    await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00'] }]);
    await renderApp();
    await fireEvent.press(await screen.findByRole('button', { name: 'Já tomei' }));
    await screen.findByText('✓ Registro salvo com sucesso');
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar para Hoje' }));
    await fireEvent.press(await screen.findByRole('tab', { name: 'Histórico' }));
    expect(await screen.findByText('Tomado às 09:00')).toBeOnTheScreen();
  });

  it('sem remédios com horário, explica e oferece o cadastro', async () => {
    await databaseAfterOnboarding();
    await renderApp('/historico');
    expect(await screen.findByText('Nenhum horário para mostrar')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir a aba Remédios' })).toBeOnTheScreen();
  });
});
