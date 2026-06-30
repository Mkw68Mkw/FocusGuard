import { Accelerometer } from 'expo-sensors';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Ab diesem Bewegungswert zählt eine Bewegung als Unterbrechung.
// Kleiner = empfindlicher. Bei Bedarf anpassen.
const MOVEMENT_THRESHOLD = 1.2;
// Mindestabstand zwischen zwei gezählten Unterbrechungen (in ms),
// damit eine einzelne Bewegung nicht mehrfach gezählt wird.
const INTERRUPTION_COOLDOWN_MS = 1500;
// Wie lange der Status nach einer Bewegung auf "Bewegt" bleibt (in ms).
const MOVING_DISPLAY_MS = 800;

// Hilfsfunktion: Sekunden als mm:ss anzeigen.
function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
}

export default function SessionScreen() {
  const [seconds, setSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [longestCalmSeconds, setLongestCalmSeconds] = useState(0);

  // Refs für Werte, die wir zwischen Updates merken, aber nicht rendern müssen.
  const lastReading = useRef({ x: 0, y: 0, z: 0 });
  const hasFirstReading = useRef(false);
  const lastInterruptionTime = useRef(0);
  const calmStreak = useRef(0); // aktuelle ruhige Phase in Sekunden
  const movingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer und Sensor in Refs merken, damit wir sie beim Beenden gezielt stoppen können.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);

  // Stoppt Timer, Sensor und Timeout. Kann mehrfach gefahrlos aufgerufen werden.
  const stopSession = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (movingTimeout.current) {
      clearTimeout(movingTimeout.current);
      movingTimeout.current = null;
    }
  };

  // Startet eine frische Session: setzt alle Werte zurück und beginnt Timer + Sensor.
  const startSession = () => {
    // Anzeige-Werte zurücksetzen.
    setSeconds(0);
    setInterruptions(0);
    setIsMoving(false);
    setLongestCalmSeconds(0);

    // Gemerkte Werte zurücksetzen.
    hasFirstReading.current = false;
    lastInterruptionTime.current = 0;
    calmStreak.current = 0;

    // Timer: erhöht jede Sekunde die Dauer und verfolgt die längste ruhige Phase.
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
      calmStreak.current += 1;
      setLongestCalmSeconds((prev) => Math.max(prev, calmStreak.current));
    }, 1000);

    // Accelerometer: misst Bewegung und zählt Unterbrechungen.
    Accelerometer.setUpdateInterval(200);
    subscriptionRef.current = Accelerometer.addListener((data) => {
      // Beim ersten Messwert nur speichern, noch nicht vergleichen.
      if (!hasFirstReading.current) {
        lastReading.current = data;
        hasFirstReading.current = true;
        return;
      }

      // delta = wie stark hat sich die Lage seit der letzten Messung verändert.
      const delta =
        Math.abs(data.x - lastReading.current.x) +
        Math.abs(data.y - lastReading.current.y) +
        Math.abs(data.z - lastReading.current.z);

      lastReading.current = data;

      // Nur reagieren, wenn die Bewegung gross genug ist.
      if (delta > MOVEMENT_THRESHOLD) {
        const now = Date.now();

        // Cooldown: nur zählen, wenn genug Zeit seit der letzten Unterbrechung vergangen ist.
        if (now - lastInterruptionTime.current >= INTERRUPTION_COOLDOWN_MS) {
          lastInterruptionTime.current = now;
          setInterruptions((prev) => prev + 1);
          calmStreak.current = 0; // ruhige Phase beginnt von vorne

          // Status kurz auf "Bewegt" setzen und danach zurück auf "Ruhig".
          setIsMoving(true);
          if (movingTimeout.current) clearTimeout(movingTimeout.current);
          movingTimeout.current = setTimeout(() => setIsMoving(false), MOVING_DISPLAY_MS);
        }
      }
    });
  };

  // Bei jedem Fokussieren des Screens startet eine frische Session,
  // beim Verlassen (z. B. zurück oder weiter zum Ergebnis) wird sauber gestoppt.
  useFocusEffect(
    useCallback(() => {
      startSession();
      return () => stopSession();
    }, [])
  );

  // Einfacher Score: pro Unterbrechung 7 Punkte Abzug, mindestens 0.
  const score = Math.max(0, 100 - interruptions * 7);

  // Session beenden: zuerst Timer/Sensor stoppen, dann Werte an den Result Screen übergeben.
  const endSession = () => {
    stopSession();
    router.push({
      pathname: '/result',
      params: {
        durationSeconds: seconds,
        interruptions,
        longestCalmSeconds,
        score,
      },
    });
  };

  // Session abbrechen: erst nachfragen, bei Bestätigung zurück zur Startseite (ohne Ergebnis).
  const cancelSession = () => {
    Alert.alert(
      'Session abbrechen?',
      'Die laufende Session wird verworfen und nicht gespeichert.',
      [
        { text: 'Weiter', style: 'cancel' },
        {
          text: 'Abbrechen',
          style: 'destructive',
          onPress: () => {
            stopSession();
            router.dismissTo('/');
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Laufende Session</Text>
      <Text style={styles.description}>
        Lege dein Handy beiseite und konzentriere dich. Die App misst deine Bewegung und zählt
        Unterbrechungen.
      </Text>

      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>Dauer</Text>
        <Text style={styles.timerValue}>{formatTime(seconds)}</Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Status</Text>
          <Text style={[styles.cardValue, isMoving ? styles.statusMoving : styles.statusCalm]}>
            {isMoving ? 'Bewegt' : 'Ruhig'}
          </Text>
        </View>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Unterbrechungen</Text>
          <Text style={styles.cardValue}>{interruptions}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Längste ruhige Phase</Text>
        <Text style={styles.cardText}>{formatTime(longestCalmSeconds)} ohne Unterbrechung</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.endButton, pressed && styles.pressed]}
        onPress={endSession}>
        <Text style={styles.endButtonText}>Session beenden</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        onPress={cancelSession}>
        <Text style={styles.cancelButtonText}>Abbrechen</Text>
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
  statusCalm: {
    color: '#10B981',
  },
  statusMoving: {
    color: '#EF4444',
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
  cancelButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9CA3AF',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
});
