import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, BackHandler, StyleSheet } from 'react-native';

import * as repository from '@/db/repository';
import { listDoseLogsSince, listMedications, type Db } from '@/db/repository';

import { databaseAfterOnboarding, freshDatabase, notificationsMock, renderApp } from '../test-utils/renderApp';

// Relógio fixo: 11/11/2026 (quarta-feira), 09:00.
const NOW = new Date(2026, 10, 11, 9, 0, 0);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const asDb = (db: unknown) => db as Db;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Clica num botão de um Alert nativo simulado. */
function alertButtons() {
  const spy = jest.spyOn(Alert, 'alert');
  return {
    spy,
    press: async (text: string) => {
      const buttons = spy.mock.calls.at(-1)?.[2] ?? [];
      const button = buttons.find((b) => b.text === text);
      if (!button) throw new Error(`Botão "${text}" não está no alerta`);
      await act(async () => button.onPress?.());
    },
  };
}

describe('tela Hoje', () => {
  it('mostra a data por extenso e o horário futuro de forma neutra', async () => {
    await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['09:40'] }]);
    await renderApp();
    expect(await screen.findByText('Quarta-feira, 11 de novembro')).toBeOnTheScreen();
    expect(screen.getByText('Próximo horário')).toBeOnTheScreen();
    expect(screen.getByText('Daqui a 40 minutos')).toBeOnTheScreen();
    expect(screen.queryByText('Ainda não confirmado')).toBeNull();
  });

  it('com vários remédios no mesmo horário, mostra cada nome em uma linha', async () => {
    await databaseAfterOnboarding([
      { name: 'Remédio A', note: '', times: ['08:00'] },
      { name: 'Remédio B com um nome bem comprido para testar a quebra de linha', note: '', times: ['08:00'] },
    ]);
    await renderApp();
    expect(await screen.findByText('Remédio A')).toBeOnTheScreen();
    expect(screen.getByText('Remédio B com um nome bem comprido para testar a quebra de linha')).toBeOnTheScreen();
    expect(screen.getByText('2 remédios neste horário.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Já tomei os 2 remédios' })).toBeOnTheScreen();
  });

  it('quando tudo de hoje foi confirmado, mostra o cartão verde e o próximo de amanhã', async () => {
    const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00'] }]);
    await repository.confirmSlot(asDb(db), {
      date: '2026-11-11',
      time: '08:00',
      medications: [{ id: 1, name: 'Remédio A' }],
      takenAt: new Date(2026, 10, 11, 8, 5),
    });
    await renderApp();
    expect(await screen.findByText('Todos os horários de hoje foram confirmados')).toBeOnTheScreen();
    expect(screen.getByText('Próximo horário: amanhã às 08:00 — Remédio A.')).toBeOnTheScreen();
    expect(screen.getByText('Tomado às 08:05')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Já tomei' })).toBeNull();
  });
});

describe('registro com mais de um remédio no horário', () => {
  it('mostra a lista e pergunta antes de salvar; só salva ao confirmar', async () => {
    const db = await databaseAfterOnboarding([
      { name: 'Remédio A', note: '', times: ['08:00'] },
      { name: 'Remédio B', note: '', times: ['08:00'] },
    ]);
    await renderApp();
    await fireEvent.press(await screen.findByRole('button', { name: 'Já tomei os 2 remédios' }));

    expect(await screen.findByText('Você tomou estes 2 remédios?')).toBeOnTheScreen();
    expect(screen.getByText('Ao tocar em "Sim", os 2 remédios deste horário serão registrados juntos.')).toBeOnTheScreen();
    expect(await listDoseLogsSince(asDb(db), '2026-11-11')).toEqual([]);

    await press('Sim, tomei os 2 remédios');
    expect(await screen.findByText('✓ Registro salvo com sucesso')).toBeOnTheScreen();
    expect(screen.getByText('Remédios registrados (2):')).toBeOnTheScreen();
    expect(screen.getByText('Horário previsto: 08:00')).toBeOnTheScreen();
    expect(screen.getByText('Registrado às 09:00')).toBeOnTheScreen();
    expect(await listDoseLogsSince(asDb(db), '2026-11-11')).toHaveLength(2);
  });

  it('o aviso diz quantos remédios são e o botão diz "Tomei todos"', async () => {
    await databaseAfterOnboarding([
      { name: 'Remédio A', note: '', times: ['10:00'] },
      { name: 'Remédio B', note: '', times: ['10:00'] },
    ]);
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    await waitFor(() =>
      expect(notificationsMock.__getScheduled().some((r) => r.identifier === 'dose-2026-11-11-10:00-0')).toBe(true),
    );
    const first = notificationsMock.__getScheduled().find((r) => r.identifier === 'dose-2026-11-11-10:00-0')!;
    expect(first.content.body).toBe('10:00 — 2 remédios: Remédio A, Remédio B. Você tomou todos?');
    expect((first.content as Record<string, unknown>).categoryIdentifier).toBe('dose-varios');

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
      'dose-varios',
      expect.arrayContaining([expect.objectContaining({ buttonTitle: 'Tomei todos' })]),
    );
  });
});

describe('falhas de salvamento', () => {
  it('no registro: mostra a mensagem e libera o botão para tentar de novo', async () => {
    const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00'] }]);
    const spy = jest.spyOn(repository, 'confirmSlot').mockRejectedValueOnce(new Error('disco cheio'));
    await renderApp();
    await fireEvent.press(await screen.findByRole('button', { name: 'Já tomei' }));

    expect(await screen.findByText('⚠ Não foi possível salvar o registro. Tente de novo.')).toBeOnTheScreen();
    const button = screen.getByRole('button', { name: 'Já tomei' });
    expect(button).toBeEnabled();

    spy.mockRestore();
    await fireEvent.press(button);
    expect(await screen.findByText('✓ Registro salvo com sucesso')).toBeOnTheScreen();
    expect(await listDoseLogsSince(asDb(db), '2026-11-11')).toHaveLength(1);
  });

  it('no cadastro: mostra a mensagem e mantém o que foi digitado', async () => {
    const db = await databaseAfterOnboarding();
    jest.spyOn(repository, 'createMedication').mockRejectedValueOnce(new Error('disco cheio'));
    await renderApp('/medicamentos/novo');
    await screen.findByLabelText('Nome do medicamento');
    await type('Nome do medicamento', 'Remédio C');
    await type('Horário 1', '7h30');
    await press('Salvar medicamento');

    expect(
      await screen.findByText('⚠ Não foi possível salvar. O que você digitou continua aqui. Tente de novo.'),
    ).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Remédio C')).toBeOnTheScreen();
    expect(screen.getByDisplayValue('7h30')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Salvar medicamento' })).toBeEnabled();
    expect(await listMedications(asDb(db))).toEqual([]);

    await press('Salvar medicamento');
    expect(await screen.findByText('07:30')).toBeOnTheScreen();
    expect(await listMedications(asDb(db))).toHaveLength(1);
  });
});

describe('sair de um formulário com alterações não salvas', () => {
  it('pergunta antes de sair; "Continuar editando" mantém os dados', async () => {
    await databaseAfterOnboarding();
    const alert = alertButtons();
    await renderApp('/medicamentos');
    await fireEvent.press(await screen.findByRole('button', { name: 'Cadastrar medicamento' }));
    await type('Nome do medicamento', 'Remédio C');
    await press('Voltar');

    expect(alert.spy).toHaveBeenCalledWith('Sair sem salvar?', expect.any(String), expect.any(Array));
    await alert.press('Continuar editando');
    expect(screen).toHavePathname('/medicamentos/novo');
    expect(screen.getByDisplayValue('Remédio C')).toBeOnTheScreen();

    await press('Voltar');
    await alert.press('Sair sem salvar');
    await waitFor(() => expect(screen).toHavePathname('/medicamentos'));
  });

  it('sem alterações, "Voltar" sai direto, sem perguntar', async () => {
    await databaseAfterOnboarding();
    const alert = alertButtons();
    await renderApp('/medicamentos');
    await fireEvent.press(await screen.findByRole('button', { name: 'Cadastrar medicamento' }));
    await press('Voltar');
    await waitFor(() => expect(screen).toHavePathname('/medicamentos'));
    expect(alert.spy).not.toHaveBeenCalled();
  });

  it('trocar de aba no meio do cadastro mantém o que foi digitado', async () => {
    await databaseAfterOnboarding();
    await renderApp('/medicamentos');
    await fireEvent.press(await screen.findByRole('button', { name: 'Cadastrar medicamento' }));
    await type('Nome do medicamento', 'Remédio C');
    await fireEvent.press(screen.getByRole('tab', { name: 'Ajuda' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Remédios' }));
    expect(screen.getByDisplayValue('Remédio C')).toBeOnTheScreen();
  });
});

describe('questionário e botão voltar do Android', () => {
  it('o botão físico volta uma pergunta, em vez de sair do questionário', async () => {
    type Handler = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: Handler[] = [];
    const pressBack = () => listeners.at(-1)?.({} as never);
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      listeners.push(handler);
      return { remove: () => listeners.splice(listeners.indexOf(handler), 1) };
    });
    freshDatabase();
    await renderApp();
    await screen.findByText('Qual é a sua idade?');
    await press('Pular');
    expect(screen.getByText('Quais medicamentos você usa?')).toBeOnTheScreen();
    expect(screen.getByText('Passo 2 de 4')).toBeOnTheScreen();

    let handled: boolean | null | undefined;
    await act(async () => {
      handled = pressBack();
    });
    expect(handled).toBe(true);
    expect(screen.getByText('Qual é a sua idade?')).toBeOnTheScreen();

    // Na primeira pergunta, o botão segue o comportamento normal do sistema.
    await act(async () => {
      handled = pressBack();
    });
    expect(handled).toBe(false);
  });
});

describe('letra e espaço', () => {
  it.each(['/', '/medicamentos', '/medicamentos/1', '/medicamentos/novo', '/historico', '/ajuda', '/ajuda/novo-contato', '/configuracoes', '/permissao'])(
    'em %s, nenhum texto trava a ampliação do sistema, encolhe para caber ou é cortado',
    async (path) => {
      await databaseAfterOnboarding([
        { name: 'Remédio A', note: 'Texto fictício', times: ['08:00', '20:00'] },
        { name: 'Remédio B', note: '', times: [] },
      ]);
      await renderApp(path);
      await screen.findAllByRole('header');
      const texts = screen.queryAllByText(/./);
      expect(texts.length).toBeGreaterThan(3);
      for (const t of texts) {
        const p = t.props as Record<string, unknown>;
        expect(p.adjustsFontSizeToFit ?? false).toBe(false);
        expect(p.maxFontSizeMultiplier).toBeUndefined();
        expect(p.numberOfLines).toBeUndefined();
        expect(p.allowFontScaling ?? true).toBe(true);
      }
    },
  );

  it('a barra de abas passa para duas linhas (2 + 2) quando os nomes não cabem numa linha', async () => {
    await databaseAfterOnboarding();
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    const tabs = screen.getAllByRole('tab');
    const flat = (el: (typeof tabs)[number]) => StyleSheet.flatten(el.props.style);
    expect(flat(tabs[0]).flexBasis).toBe('auto');

    // Simula a medida feita pelo celular: a última aba caiu para a linha de baixo.
    await act(async () => {
      tabs.forEach((tab, i) => fireEvent(tab, 'layout', { nativeEvent: { layout: { x: 0, y: i === 3 ? 80 : 0, width: 90, height: 70 } } }));
    });
    const after = screen.getAllByRole('tab');
    for (const tab of after) {
      expect(flat(tab).flexBasis).toBe('50%');
      expect(flat(tab).maxWidth).toBe('50%');
    }
  });
});
