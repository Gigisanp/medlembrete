import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

// Ao abrir o cadastro direto (pela tela Hoje), "Voltar" leva à lista de remédios.
export const unstable_settings = {
  anchor: 'index',
};

/**
 * Pilha da aba Remédios: lista, cadastro e edição, com a barra de abas sempre visível.
 * Os cabeçalhos são do próprio app (componente Screen).
 */
export default function MedicationsLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="novo" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
