import { fireEvent, screen } from '@testing-library/react-native';

import { getSettings, type Db } from '@/db/repository';

import { databaseAfterOnboarding, renderApp } from '../test-utils/renderApp';

describe('navegação', () => {
  it('abre a tela de início', async () => {
    await databaseAfterOnboarding();
    await renderApp();
    expect(await screen.findByRole('tab', { name: 'Hoje', selected: true })).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });

  it('a tela de ajuda sempre mostra o número do SAMU', async () => {
    await databaseAfterOnboarding();
    await renderApp();
    await fireEvent.press(await screen.findByRole('tab', { name: 'Ajuda' }));
    expect(screen).toHavePathname('/ajuda');
    expect(screen.getByText('Em caso de emergência, ligue 192 (SAMU).')).toBeOnTheScreen();
  });

  it('aumentar a letra em Ajustes marca a opção e fica salvo', async () => {
    const db = await databaseAfterOnboarding();
    await renderApp('/configuracoes');
    await fireEvent.press(await screen.findByRole('button', { name: 'Grande' }));
    expect(screen.getByText('✓ Grande')).toBeOnTheScreen();
    expect((await getSettings(db as unknown as Db)).fontSize).toBe('grande');
  });

  it('Ajustes permite refazer o questionário', async () => {
    await databaseAfterOnboarding();
    await renderApp('/configuracoes');
    await fireEvent.press(await screen.findByRole('button', { name: 'Refazer questionário' }));
    expect(screen).toHavePathname('/questionario');
  });
});
