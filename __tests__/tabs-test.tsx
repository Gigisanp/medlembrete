import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { TAB_ICON_SIZE, TAB_LABEL_SIZE } from '@/components/TabBar';
import { colors, MIN_TOUCH_SIZE } from '@/theme/tokens';

import { databaseAfterOnboarding, renderApp } from '../test-utils/renderApp';

const ORDER = ['Hoje', 'Remédios', 'Histórico', 'Ajuda'];

function tabStyle(name: string) {
  const tab = screen.getByRole('tab', { name });
  const label = within(tab).getByText(name);
  return {
    label,
    labelStyle: StyleSheet.flatten(label.props.style),
    tabStyle: StyleSheet.flatten(
      typeof tab.props.style === 'function' ? tab.props.style({ pressed: false }) : tab.props.style,
    ),
  };
}

describe('abas inferiores', () => {
  beforeEach(async () => {
    await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00'] }]);
  });

  it('mostra quatro abas na ordem certa, cada uma com texto visível', async () => {
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual(ORDER);
    for (const name of ORDER) {
      expect(within(screen.getByRole('tab', { name })).getByText(name)).toBeOnTheScreen();
    }
  });

  it('cada aba tem um ícone, preenchido na ativa e contornado nas outras', async () => {
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    const icon = (name: string) => {
      const el = within(screen.getByRole('tab', { name })).getByTestId(/^icone-/, { includeHiddenElements: true });
      expect(StyleSheet.flatten(el.props.style).fontSize).toBe(TAB_ICON_SIZE);
      return el.props.testID.replace('icone-', '');
    };
    expect(ORDER.map(icon)).toEqual(['today', 'medkit-outline', 'time-outline', 'help-circle-outline']);
  });

  it('a aba ativa tem cor e peso de fonte diferentes', async () => {
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    const active = tabStyle('Hoje').labelStyle;
    const inactive = tabStyle('Ajuda').labelStyle;
    expect(active.color).toBe(colors.onLilac);
    expect(inactive.color).toBe(colors.textMuted);
    expect(active.fontWeight).toBe('800');
    expect(inactive.fontWeight).toBe('500');
    expect(screen.getByRole('tab', { name: 'Ajuda', selected: false })).toBeOnTheScreen();
  });

  it('o texto das abas tem 20 px, sem redução automática e sem bloquear a ampliação do sistema', async () => {
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    expect(TAB_LABEL_SIZE).toBe(20);
    for (const name of ORDER) {
      const { label, labelStyle } = tabStyle(name);
      expect(labelStyle.fontSize).toBe(20);
      expect(label.props.adjustsFontSizeToFit).toBeFalsy();
      expect(label.props.numberOfLines).toBeUndefined();
      expect(label.props.maxFontSizeMultiplier).toBeUndefined();
    }
  });

  it('as abas têm área de toque de pelo menos 44 px', async () => {
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    for (const name of ORDER) {
      const s = tabStyle(name).tabStyle;
      expect(s.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
      expect(s.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
    }
  });

  it.each([
    ['Remédios', '/medicamentos', '1 remédio cadastrado'],
    ['Histórico', '/historico', 'Como ler'],
    ['Ajuda', '/ajuda', 'Em caso de emergência, ligue 192 (SAMU).'],
  ])('tocar em "%s" abre a tela certa e marca a aba como ativa', async (name, path, text) => {
    await renderApp();
    await screen.findByRole('tab', { name: 'Hoje', selected: true });
    await fireEvent.press(screen.getByRole('tab', { name }));

    expect(screen).toHavePathname(path);
    expect(screen.getByText(text)).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name, selected: true })).toBeOnTheScreen();
    expect(tabStyle(name).labelStyle.fontWeight).toBe('800');
    expect(tabStyle('Hoje').labelStyle.fontWeight).toBe('500');
  });

  it('cadastro e edição ficam dentro da aba Remédios, com as abas visíveis', async () => {
    await renderApp('/medicamentos');
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar Remédio A' }));
    expect(screen).toHavePathname('/medicamentos/1');
    expect(screen.getByRole('tab', { name: 'Remédios', selected: true })).toBeOnTheScreen();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('"Cadastrar medicamento" na tela Hoje abre a aba Remédios', async () => {
    await databaseAfterOnboarding();
    await renderApp();
    await fireEvent.press(await screen.findByRole('button', { name: 'Cadastrar medicamento' }));
    expect(screen).toHavePathname('/medicamentos/novo');
    expect(screen.getByRole('tab', { name: 'Remédios', selected: true })).toBeOnTheScreen();
  });
});

describe('botão "Ajustes" no cabeçalho', () => {
  beforeEach(async () => {
    await databaseAfterOnboarding([{ name: 'Remédio A', note: '', times: ['08:00'] }]);
  });

  it.each([
    ['Hoje', '/'],
    ['Remédios', '/medicamentos'],
    ['Histórico', '/historico'],
    ['Ajuda', '/ajuda'],
  ])('aparece com texto na aba %s e abre os Ajustes', async (tab, path) => {
    await renderApp(path);
    await screen.findByRole('tab', { name: tab, selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Ajustes' }));

    expect(screen).toHavePathname('/configuracoes');
    expect(screen.getByText('Tamanho da letra')).toBeOnTheScreen();
    expect(screen.getByText('Repetir o aviso')).toBeOnTheScreen();
  });

  it('"Voltar" com texto, nos Ajustes, retorna para a aba de onde veio', async () => {
    await renderApp('/ajuda');
    await screen.findByRole('tab', { name: 'Ajuda', selected: true });
    await fireEvent.press(screen.getByRole('button', { name: 'Ajustes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen).toHavePathname('/ajuda');
    expect(screen.getByRole('tab', { name: 'Ajuda', selected: true })).toBeOnTheScreen();
  });
});
