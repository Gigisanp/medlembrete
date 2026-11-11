import { usePreventRemove } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Pergunta antes de sair de um formulário com alterações não salvas
 * (botão "Voltar" do app, botão físico ou gesto de voltar do Android).
 * Usa o usePreventRemove do Expo Router (SDK 58).
 *
 * Devolve `allowLeave()`, para liberar a saída depois de salvar ou remover.
 */
export function useLeaveGuard(
  dirty: boolean,
  { title = 'Sair sem salvar?', message = 'O que você digitou neste formulário será perdido.', stay = 'Continuar editando' } = {},
) {
  const [leaving, setLeaving] = useState(false);
  const pendingLeave = useRef<(() => void) | null>(null);

  usePreventRemove(dirty && !leaving, ({ repeat }) => {
    Alert.alert(title, message, [
      { text: stay, style: 'cancel' },
      {
        text: 'Sair sem salvar',
        style: 'destructive',
        onPress: () => {
          // A documentação pede para desligar a proteção antes de repetir a navegação.
          pendingLeave.current = repeat;
          setLeaving(true);
        },
      },
    ]);
  });

  useEffect(() => {
    if (leaving && pendingLeave.current) {
      const go = pendingLeave.current;
      pendingLeave.current = null;
      go();
    }
  }, [leaving]);

  return {
    allowLeave: () => setLeaving(true),
    blockLeave: () => setLeaving(false),
  };
}
