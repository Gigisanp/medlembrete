import { fireEvent, screen } from '@testing-library/react-native';

import { getSettings, listMedications, type Db } from '@/db/repository';

import { databaseAfterOnboarding, freshDatabase, renderApp } from '../test-utils/renderApp';

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

describe('questionário inicial', () => {
  it('aparece na primeira abertura', async () => {
    freshDatabase();
    await renderApp();
    expect(await screen.findByText('Qual é a sua idade?')).toBeOnTheScreen();
    expect(screen).toHavePathname('/questionario');
  });

  it('não aparece de novo depois de concluído', async () => {
    await databaseAfterOnboarding();
    await renderApp();
    expect(await screen.findByRole('tab', { name: 'Hoje', selected: true })).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });

  it('fluxo completo: idade, medicamentos, horários, resumo e confirmação', async () => {
    const db = freshDatabase();
    await renderApp();
    await screen.findByText('Qual é a sua idade?');

    // Passo 1: idade inválida, depois válida (60+ começa com letra grande)
    await type('Idade em anos', '15');
    await press('Continuar');
    expect(screen.getByText('⚠ Digite uma idade entre 18 e 120 anos.')).toBeOnTheScreen();
    await type('Idade em anos', '72');
    await press('Continuar');

    // Passo 2: dois medicamentos
    expect(screen.getByText('Quais medicamentos você usa?')).toBeOnTheScreen();
    await type('Medicamento 1', 'Remédio A');
    await press('Adicionar outro');
    await type('Medicamento 2', 'Remédio B');
    await press('Continuar');

    // Passo 3: horários do primeiro (com erro e correção)
    expect(screen.getByText('Em que horários você toma Remédio A?')).toBeOnTheScreen();
    await press('Continuar');
    expect(screen.getByText('⚠ Digite pelo menos um horário.')).toBeOnTheScreen();
    await type('Horário 1', '8h');
    await press('Adicionar outro horário');
    await type('Horário 2', '20:00');
    await type('Observação (opcional)', 'Texto fictício de teste');
    await press('Continuar');

    // Passo 3: o segundo é pulado
    expect(screen.getByText('Em que horários você toma Remédio B?')).toBeOnTheScreen();
    await press('Pular');

    // Passo 4: resumo
    expect(
      screen.getByText('Estes são os horários que a sua receita indicou. Confira com atenção.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Idade: 72 anos')).toBeOnTheScreen();
    expect(screen.getByText('Horários: 08:00, 20:00')).toBeOnTheScreen();
    expect(screen.getByText('Sem horário. Você pode adicionar depois, na aba Remédios.')).toBeOnTheScreen();

    await press('Confirmar');

    // Depois do questionário: explicação e pedido de permissão dos avisos
    expect(await screen.findByText('Avisos na hora do remédio')).toBeOnTheScreen();
    await press('Permitir avisos');

    // Tela Hoje com os medicamentos salvos
    expect(await screen.findByText('Outros horários de hoje')).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
    expect(screen.getAllByText('Remédio A').length).toBeGreaterThan(0);
    expect(screen.getByText('1 medicamento está sem horário e não gera aviso.')).toBeOnTheScreen();

    // E no banco
    const settings = await getSettings(db as unknown as Db);
    expect(settings).toMatchObject({ onboardingDone: true, age: 72, fontSize: 'grande', notificationsAsked: true });
    const meds = await listMedications(db as unknown as Db);
    expect(meds.map((m) => [m.name, m.times, m.note])).toEqual([
      ['Remédio A', ['08:00', '20:00'], 'Texto fictício de teste'],
      ['Remédio B', [], ''],
    ]);
  });

  it('pular tudo leva à tela inicial vazia com "Cadastrar medicamento"', async () => {
    const db = freshDatabase();
    await renderApp();
    await screen.findByText('Qual é a sua idade?');

    await press('Pular');
    await press('Pular');
    expect(screen.getByText('Nenhum medicamento informado. Você pode cadastrar depois, na aba Remédios.')).toBeOnTheScreen();
    await press('Confirmar');
    await screen.findByText('Avisos na hora do remédio');
    await press('Agora não');

    expect(await screen.findByText('Nenhum remédio cadastrado')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cadastrar medicamento' })).toBeOnTheScreen();
    expect(await getSettings(db as unknown as Db)).toMatchObject({ onboardingDone: true, age: null, fontSize: null });
  });
});
