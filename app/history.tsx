import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusSession } from '@/models/focusSession';
import { formatTime } from '@/utils/format';
import { clearSessions, loadSessions } from '@/utils/sessionStorage';

// Hilfsfunktion: ISO-Datum lesbar anzeigen.
function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);

  // Bei jedem Fokussieren des Screens die gespeicherten Sessions neu laden.
  useFocusEffect(
    useCallback(() => {
      loadSessions().then(setSessions);
    }, [])
  );

  // Verlauf löschen: erst nachfragen, bei Bestätigung alle Sessions entfernen.
  const handleClear = () => {
    Alert.alert(
      'Verlauf löschen?',
      'Alle gespeicherten Sessions werden dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await clearSessions();
            setSessions([]);
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Verlauf</Text>
      <Text style={styles.description}>
        Hier siehst du deine gespeicherten Sessions, die neueste zuerst.
      </Text>

      {sessions.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardDate}>Noch keine Sessions</Text>
          <Text style={styles.cardDuration}>Starte eine Session, um deinen Verlauf zu füllen.</Text>
        </View>
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{formatDate(session.date)}</Text>
              <Text style={styles.cardScore}>{session.score}</Text>
            </View>
            <Text style={styles.cardDuration}>
              Dauer: {formatTime(session.durationSeconds)} · Unterbrechungen: {session.interruptions}
            </Text>
          </View>
        ))
      )}

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={() => router.dismissTo('/')}>
        <Text style={styles.primaryButtonText}>Zurück zum Start</Text>
      </Pressable>

      {sessions.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
          onPress={handleClear}>
          <Text style={styles.dangerButtonText}>Verlauf löschen</Text>
        </Pressable>
      )}
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
  dangerButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
