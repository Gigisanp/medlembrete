import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDataProvider, useAppData } from '@/data/AppDataProvider';
import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/schema';
import { NotificationResponder } from '@/notifications/NotificationResponder';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { colors } from '@/theme/tokens';

/**
 * Pilha principal. Os cabeçalhos são desenhados pelo próprio app (componente Screen),
 * para o título quebrar linha e "Voltar" e "Ajustes" terem texto visível.
 * O botão físico e o gesto de voltar do Android continuam funcionando pela pilha.
 */
function AppStack() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="configuracoes" />
      <Stack.Screen name="questionario" />
      <Stack.Screen name="registro" />
      <Stack.Screen name="permissao" />
    </Stack>
  );
}

function ThemedApp() {
  const { ready, settings, setFontSize } = useAppData();
  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }
  return (
    <ThemeProvider fontSize={settings.fontSize ?? 'normal'} onFontSizeChange={setFontSize}>
      <StatusBar style="dark" />
      <AppStack />
      <NotificationResponder />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <AppDataProvider>
          <ThemedApp />
        </AppDataProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  loadingText: { fontSize: 24, color: colors.text },
});
