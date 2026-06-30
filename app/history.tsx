import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const placeholderSessions = [
  { id: '1', date: 'Noch keine Session', score: '--', duration: '--:--' },
  { id: '2', date: 'Noch keine Session', score: '--', duration: '--:--' },
  { id: '3', date: 'Noch keine Session', score: '--', duration: '--:--' },
];

export default function HistoryScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Verlauf</Text>
      <Text style={styles.description}>
        Hier erscheinen später deine gespeicherten Sessions. Im Moment siehst du nur Platzhalter.
      </Text>

      {placeholderSessions.map((session) => (
        <View key={session.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardDate}>{session.date}</Text>
            <Text style={styles.cardScore}>{session.score}</Text>
          </View>
          <Text style={styles.cardDuration}>Dauer: {session.duration}</Text>
        </View>
      ))}

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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  cardScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4F46E5',
  },
  cardDuration: {
    fontSize: 14,
    color: '#6B7280',
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
