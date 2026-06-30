import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function ResultScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dein Ergebnis</Text>
      <Text style={styles.description}>
        Hier siehst du nach jeder Session deine Auswertung. Aktuell sind dies nur Platzhalter.
      </Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Focus Score</Text>
        <Text style={styles.scoreValue}>--</Text>
        <Text style={styles.scoreHint}>von 100</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Dauer</Text>
          <Text style={styles.cardValue}>--:--</Text>
        </View>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Unterbrechungen</Text>
          <Text style={styles.cardValue}>--</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={() => router.dismissTo('/')}>
        <Text style={styles.primaryButtonText}>Zurück zum Start</Text>
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
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
  },
  scoreCard: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    color: '#D1FAE5',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '800',
  },
  scoreHint: {
    color: '#D1FAE5',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  smallCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
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
  pressed: {
    opacity: 0.8,
  },
});
