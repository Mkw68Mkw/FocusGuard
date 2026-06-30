import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function SessionScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Laufende Session</Text>
      <Text style={styles.description}>
        Lege dein Handy beiseite und konzentriere dich. Hier siehst du später deinen Timer und
        deinen aktuellen Status.
      </Text>

      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>Dauer</Text>
        <Text style={styles.timerValue}>00:00</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Status</Text>
          <Text style={styles.cardValue}>Ruhig</Text>
        </View>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Unterbrechungen</Text>
          <Text style={styles.cardValue}>0</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hinweis</Text>
        <Text style={styles.cardText}>
          Die Sensorik (Ruhig / Bewegt) wird später ergänzt. Im Moment sind dies nur Platzhalter.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.endButton, pressed && styles.pressed]}
        onPress={() => router.push('/result')}>
        <Text style={styles.endButtonText}>Session beenden</Text>
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
  timerCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    color: '#C7D2FE',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerValue: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
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
  endButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
