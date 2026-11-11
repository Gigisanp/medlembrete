import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { MIN_TOUCH_SIZE } from '@/theme/tokens';

async function renderButton(props: Partial<React.ComponentProps<typeof AppButton>> = {}) {
  const onPress = jest.fn();
  await render(
    <ThemeProvider>
      <AppButton label="Já tomei" onPress={onPress} {...props} />
    </ThemeProvider>,
  );
  return { onPress };
}

describe('AppButton', () => {
  it('mostra o rótulo visível e tem papel de botão', async () => {
    await renderButton();
    expect(screen.getByText('Já tomei')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Já tomei' })).toBeOnTheScreen();
  });

  it('tem área de toque de pelo menos 44 px', async () => {
    await renderButton();
    const style = StyleSheet.flatten(screen.getByRole('button').props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
    expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TOUCH_SIZE);
  });

  it('chama onPress ao tocar', async () => {
    const { onPress } = await renderButton();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('indica seleção no texto, sem depender só da cor', async () => {
    await renderButton({ selected: true });
    expect(screen.getByText('✓ Já tomei')).toBeOnTheScreen();
  });
});
