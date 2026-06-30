import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>FocusGuard</Text>
      <Text style={styles.description}>
        FocusGuard hilft dir, konzentriert zu arbeiten. Starte eine Session und lege dein Handy
        beiseite. Die App misst, wie ruhig du bleibst, und zeigt dir am Ende deinen Focus Score.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>So funktioniert es</Text>
        <Text style={styles.cardText}>
          1. Session starten{'\n'}
          2. Fokussiert arbeiten{'\n'}
          3. Ergebnis ansehen
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={() => router.push('/session')}>
        <Text style={styles.primaryButtonText}>Session starten</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        onPress={() => router.push('/history')}>
        <Text style={styles.secondaryButtonText}>Verlauf ansehen</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  secondaryButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
