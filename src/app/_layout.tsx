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

function AppStack() {
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="questionario" options={{ title: 'Primeiros passos' }} />
      <Stack.Screen name="registro" options={{ title: 'Registro' }} />
      <Stack.Screen name="permissao" options={{ title: 'Avisos' }} />
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
      <StatusBar style="light" />
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
