import { Stack } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

// Ao abrir o cadastro direto (pela tela Hoje), "Voltar" leva à lista de medicamentos.
export const unstable_settings = {
  anchor: 'index',
};

/** Pilha da aba Remédios: lista, cadastro e edição, com a barra de abas sempre visível. */
export default function MedicationsLayout() {
  const { colors, font } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerTitleStyle: { fontSize: font.heading, fontWeight: '700' },
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Remédios' }} />
      <Stack.Screen name="novo" options={{ title: 'Cadastrar medicamento' }} />
      <Stack.Screen name="[id]" options={{ title: 'Editar medicamento' }} />
    </Stack>
  );
}
