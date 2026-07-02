import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.headerBackground },
          headerTintColor: theme.headerTint,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="index" options={{ title: 'FocusGuard' }} />
        <Stack.Screen name="session" options={{ title: 'Session' }} />
        <Stack.Screen name="result" options={{ title: 'Ergebnis' }} />
        <Stack.Screen name="history" options={{ title: 'Verlauf' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
