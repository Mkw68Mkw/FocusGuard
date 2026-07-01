import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatTime } from '@/utils/format';

// Params kommen als String an, deshalb sicher in eine Zahl umwandeln.
function toNumber(value: string | string[] | undefined) {
  const num = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(num) ? num : 0;
}

// Wandelt den Score in eine Bewertung mit Text, Farbe und Emoji um.
function getRating(score: number) {
  if (score >= 90) return { label: 'Sehr fokussiert', color: '#10B981', emoji: '🎯' };
  if (score >= 70) return { label: 'Gute Session', color: '#22C55E', emoji: '💪' };
  if (score >= 50) return { label: 'Okay', color: '#F59E0B', emoji: '🙂' };
  return { label: 'Viele Unterbrechungen', color: '#EF4444', emoji: '😬' };
}

export default function ResultScreen() {
  // Werte, die der Session Screen übergeben hat, auslesen.
  const params = useLocalSearchParams();
  const durationSeconds = toNumber(params.durationSeconds);
  const interruptions = toNumber(params.interruptions);
  const longestCalmSeconds = toNumber(params.longestCalmSeconds);
  const score = toNumber(params.score);

  // Bewertung passend zum Score bestimmen.
  const rating = getRating(score);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dein Ergebnis</Text>
      <Text style={styles.description}>
        Das war deine Session. Die Werte wurden im Verlauf gespeichert.
      </Text>

      {/* Score-Karte mit Farbe passend zur Bewertung */}
      <View style={[styles.scoreCard, { backgroundColor: rating.color }]}>
        <Text style={styles.scoreEmoji}>{rating.emoji}</Text>
        <Text style={styles.scoreRating}>{rating.label}</Text>

        <View style={styles.scoreNumberRow}>
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.scoreHint}>/ 100</Text>
        </View>

        {/* Fortschrittsbalken: zeigt den Score von 0 bis 100 */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${score}%` }]} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Dauer</Text>
          <Text style={styles.cardValue}>{formatTime(durationSeconds)}</Text>
        </View>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Unterbrechungen</Text>
          <Text style={styles.cardValue}>{interruptions}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Längste ruhige Phase</Text>
        <Text style={styles.cardValue}>{formatTime(longestCalmSeconds)}</Text>
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
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  scoreEmoji: {
    fontSize: 40,
  },
  scoreRating: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  scoreNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 68,
  },
  scoreHint: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
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
    padding: 18,
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
