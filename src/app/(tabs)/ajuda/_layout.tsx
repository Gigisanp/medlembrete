import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

// Ao abrir um contato direto, "Voltar" leva à tela de Ajuda.
export const unstable_settings = {
  anchor: 'index',
};

/** Pilha da aba Ajuda: tela de ajuda e cadastro/edição de contatos, com as abas visíveis. */
export default function HelpLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="novo-contato" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
