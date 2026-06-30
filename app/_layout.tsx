import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#4F46E5' },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#F5F6FA' },
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
