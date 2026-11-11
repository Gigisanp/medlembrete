import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { listMedications, type Db } from '@/db/repository';

import { databaseAfterOnboarding, renderApp } from '../test-utils/renderApp';

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);

describe('cadastro de medicamento', () => {
  it('valida os campos e salva no banco', async () => {
    const db = await databaseAfterOnboarding();
    await renderApp();
    await press('Cadastrar medicamento');
    expect(screen).toHavePathname('/medicamentos/novo');

    // Os exemplos são fictícios e sinalizados
    expect(screen.getByPlaceholderText('Exemplo fictício: Remédio A')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/dose/i)).toBeNull();

    await press('Salvar medicamento');
    expect(screen.getByText('⚠ Digite o nome do medicamento.')).toBeOnTheScreen();
    expect(screen.getByText('⚠ Digite pelo menos um horário.')).toBeOnTheScreen();

    await type('Nome do medicamento', 'Remédio C');
    await type('Horário 1', '25:00');
    await press('Salvar medicamento');
    expect(screen.getByText('⚠ Horário inválido. Digite assim: 08:00 ou 8h30.')).toBeOnTheScreen();

    await type('Horário 1', '7h30');
    await press('Salvar medicamento');

    // Volta para a lista da aba Remédios
    await waitFor(() => expect(screen).toHavePathname('/medicamentos'));
    expect(await screen.findByText('Horários: 07:30')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Remédios', selected: true })).toBeOnTheScreen();

    // O formulário não fica "preso" na aba: voltar a ela mostra a lista
    await fireEvent.press(screen.getByRole('tab', { name: 'Hoje' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Remédios' }));
    expect(screen).toHavePathname('/medicamentos');
    expect(screen.queryByText('Salvar medicamento')).toBeNull();
    expect(await listMedications(db as unknown as Db)).toEqual([
      expect.objectContaining({ name: 'Remédio C', times: ['07:30'], note: '' }),
    ]);
  });

  it('edita e remove um medicamento', async () => {
    const db = await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00'] }]);
    await renderApp();
    await screen.findByText('08:00 — Remédio A');
    await fireEvent.press(screen.getByRole('tab', { name: 'Remédios' }));

    await press('Editar Remédio A');
    expect(screen.getByDisplayValue('Remédio A')).toBeOnTheScreen();
    await type('Horário 1', '09:00');
    await press('Salvar alterações');
    expect(await screen.findByText('Horários: 09:00')).toBeOnTheScreen();

    await press('Editar Remédio A');
    await press('Remover medicamento');
    expect(screen.getByText('Remover "Remédio A" e todos os horários dele?')).toBeOnTheScreen();
    await press('Sim, remover');

    expect(await screen.findByText('Você ainda não tem medicamentos cadastrados.')).toBeOnTheScreen();
    expect(await listMedications(db as unknown as Db)).toEqual([]);
  });
});
