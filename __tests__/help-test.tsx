import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { createContact, listContacts, type Db } from '@/db/repository';

import { databaseAfterOnboarding, renderApp } from '../test-utils/renderApp';

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const asDb = (db: unknown) => db as Db;

afterEach(() => {
  jest.restoreAllMocks();
  // O openURL do Linking é exposto por getter; limpa as chamadas para não vazarem entre testes.
  jest.clearAllMocks();
});

describe('Ajuda e contatos de ajuda', () => {
  it('sempre mostra o aviso de emergência e as orientações', async () => {
    await databaseAfterOnboarding();
    await renderApp('/ajuda');
    expect(await screen.findByText('Em caso de emergência, ligue 192 (SAMU).')).toBeOnTheScreen();
    expect(screen.getByText('Não tome dose extra por conta própria.')).toBeOnTheScreen();
    expect(screen.getByText('Em caso de dúvida, fale com o seu médico ou farmacêutico.')).toBeOnTheScreen();
  });

  it('sem contatos, oferece o cadastro; o contato fica salvo no aparelho', async () => {
    const db = await databaseAfterOnboarding();
    await renderApp('/ajuda');
    await fireEvent.press(await screen.findByRole('button', { name: 'Cadastrar contato de ajuda' }));
    expect(screen).toHavePathname('/ajuda/novo-contato');
    expect(screen.getByPlaceholderText('Exemplo fictício: Maria (filha)')).toBeOnTheScreen();

    await press('Salvar contato');
    expect(screen.getByText('⚠ Digite o nome do contato.')).toBeOnTheScreen();
    expect(screen.getByText('⚠ Digite o telefone.')).toBeOnTheScreen();

    await type('Nome', 'Maria');
    await type('Telefone com DDD', '(11) 90000-0000');
    await press('Salvar contato');

    expect(await screen.findByText('Liga para Maria, (11) 90000-0000.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/ajuda');
    expect(await listContacts(asDb(db))).toEqual([expect.objectContaining({ name: 'Maria', phone: '11900000000' })]);
  });

  it('com um contato, "Pedir ajuda" abre o discador direto', async () => {
    const db = await databaseAfterOnboarding();
    await createContact(asDb(db), { name: 'Maria', phone: '11900000000' });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    open.mockClear();
    await renderApp('/ajuda');
    await fireEvent.press(await screen.findByRole('button', { name: 'Pedir ajuda' }));
    expect(open).toHaveBeenCalledWith('tel:11900000000');
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('com vários contatos, lista e abre o discador com o escolhido', async () => {
    const db = await databaseAfterOnboarding();
    await createContact(asDb(db), { name: 'Maria', phone: '11900000000' });
    await createContact(asDb(db), { name: 'João', phone: '21900000000' });
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    open.mockClear();
    await renderApp('/ajuda');
    await fireEvent.press(await screen.findByRole('button', { name: 'Pedir ajuda' }));
    expect(open).not.toHaveBeenCalled();
    expect(screen.getByText('Para quem você quer ligar?')).toBeOnTheScreen();

    await press('Ligar para João');
    expect(open).toHaveBeenCalledWith('tel:21900000000');
  });

  it('se o aparelho não abrir o discador, mostra uma mensagem', async () => {
    const db = await databaseAfterOnboarding();
    await createContact(asDb(db), { name: 'Maria', phone: '11900000000' });
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('sem telefone'));
    await renderApp('/ajuda');
    await fireEvent.press(await screen.findByRole('button', { name: 'Pedir ajuda' }));
    expect(await screen.findByText('⚠ Não foi possível abrir o discador neste aparelho.')).toBeOnTheScreen();
  });

  it('edita e remove um contato', async () => {
    const db = await databaseAfterOnboarding();
    await createContact(asDb(db), { name: 'Maria', phone: '11900000000' });
    await renderApp('/ajuda');
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar contato Maria' }));
    expect(screen.getByDisplayValue('(11) 90000-0000')).toBeOnTheScreen();
    await type('Nome', 'Maria (filha)');
    await press('Salvar alterações');
    expect(await screen.findByText('Liga para Maria (filha), (11) 90000-0000.')).toBeOnTheScreen();

    await press('Editar contato Maria (filha)');
    await press('Remover contato');
    await press('Sim, remover contato');
    expect(await screen.findByRole('button', { name: 'Cadastrar contato de ajuda' })).toBeOnTheScreen();
    expect(await listContacts(asDb(db))).toEqual([]);
  });

  it('leva às instruções da receita (observações na aba Remédios)', async () => {
    await databaseAfterOnboarding([{ name: 'Remédio A', note: 'Texto fictício: depois do café', times: ['08:00'] }]);
    await renderApp('/ajuda');
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver os meus remédios e observações' }));
    expect(screen).toHavePathname('/medicamentos');
    expect(screen.getByText('Observação: Texto fictício: depois do café')).toBeOnTheScreen();
  });
});
