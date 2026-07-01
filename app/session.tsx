import { Accelerometer, Gyroscope } from 'expo-sensors';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FocusSession } from '@/models/focusSession';
import { formatTime } from '@/utils/format';
import { addSession } from '@/utils/sessionStorage';

// Schwelle für den Accelerometer (ruckartige Bewegung / Anheben).
// Kleiner = empfindlicher.
const ACCEL_THRESHOLD = 0.25;
// Schwelle für das Gyroscope (langsames Kippen / Drehen).
// Kleiner = empfindlicher.
const GYRO_THRESHOLD = 0.12;
// Wie lange (in ms) das Handy ruhig sein muss, bis die aktuelle
// Unterbrechung als beendet gilt und eine neue gezählt werden kann.
const CALM_RESET_MS = 2000;
// Update-Intervall beider Sensoren (in ms).
const SENSOR_INTERVAL_MS = 200;

export default function SessionScreen() {
  const [seconds, setSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [longestCalmSeconds, setLongestCalmSeconds] = useState(0);

  // Refs für Werte, die wir zwischen Updates merken, aber nicht rendern müssen.
  // Vorherige Sensor-Messwerte, um die Veränderung (delta) zu berechnen.
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });
  const lastGyro = useRef({ x: 0, y: 0, z: 0 });
  const hasFirstAccel = useRef(false);
  const hasFirstGyro = useRef(false);

  // Läuft aktuell schon eine Unterbrechung? Verhindert Mehrfachzählung
  // während einer einzigen Handy-Nutzung.
  const isInInterruption = useRef(false);
  // Zeitpunkt der zuletzt erkannten Aktivität (in ms).
  const lastActivityTime = useRef(0);
  const calmStreak = useRef(0); // aktuelle ruhige Phase in Sekunden

  // Timer und Sensoren in Refs merken, damit wir sie beim Beenden gezielt stoppen können.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const calmCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accelSubRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const gyroSubRef = useRef<ReturnType<typeof Gyroscope.addListener> | null>(null);

  // Stoppt Timer, Check-Intervall und beide Sensoren. Mehrfach gefahrlos aufrufbar.
  const stopSession = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (calmCheckRef.current) {
      clearInterval(calmCheckRef.current);
      calmCheckRef.current = null;
    }
    if (accelSubRef.current) {
      accelSubRef.current.remove();
      accelSubRef.current = null;
    }
    if (gyroSubRef.current) {
      gyroSubRef.current.remove();
      gyroSubRef.current = null;
    }
  };

  // Wird aufgerufen, sobald einer der Sensoren Bewegung meldet.
  // Zählt pro Handy-Nutzung nur EINE Unterbrechung.
  const registerActivity = () => {
    setIsMoving(true);
    lastActivityTime.current = Date.now();

    // Nur zählen, wenn nicht bereits eine Unterbrechung läuft.
    if (!isInInterruption.current) {
      isInInterruption.current = true;
      setInterruptions((prev) => prev + 1);
      calmStreak.current = 0; // ruhige Phase beginnt von vorne
    }
  };

  // Startet eine frische Session: setzt alle Werte zurück und beginnt Timer + Sensoren.
  const startSession = () => {
    // Anzeige-Werte zurücksetzen.
    setSeconds(0);
    setInterruptions(0);
    setIsMoving(false);
    setLongestCalmSeconds(0);

    // Gemerkte Werte zurücksetzen.
    hasFirstAccel.current = false;
    hasFirstGyro.current = false;
    isInInterruption.current = false;
    lastActivityTime.current = 0;
    calmStreak.current = 0;

    // Timer: erhöht jede Sekunde die Dauer und verfolgt die längste ruhige Phase.
    // Die ruhige Phase zählt nur hoch, wenn gerade keine Unterbrechung läuft;
    // während einer Unterbrechung bleibt sie bei 0.
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
      if (isInInterruption.current) {
        calmStreak.current = 0;
      } else {
        calmStreak.current += 1;
        setLongestCalmSeconds((prev) => Math.max(prev, calmStreak.current));
      }
    }, 1000);

    // Ruhe-Check: prüft regelmässig, ob das Handy lange genug ruhig war.
    // Ist das der Fall, gilt die Unterbrechung als beendet -> nächste kann zählen.
    calmCheckRef.current = setInterval(() => {
      if (
        lastActivityTime.current > 0 &&
        Date.now() - lastActivityTime.current > CALM_RESET_MS
      ) {
        setIsMoving(false);
        isInInterruption.current = false;
      }
    }, 500);

    // Beide Sensoren gleich schnell abtasten.
    Accelerometer.setUpdateInterval(SENSOR_INTERVAL_MS);
    Gyroscope.setUpdateInterval(SENSOR_INTERVAL_MS);

    // Accelerometer: erkennt ruckartige Bewegungen und Anheben.
    accelSubRef.current = Accelerometer.addListener((data) => {
      // Beim ersten Messwert nur speichern, noch nicht vergleichen.
      if (!hasFirstAccel.current) {
        lastAccel.current = data;
        hasFirstAccel.current = true;
        return;
      }

      const accelDelta =
        Math.abs(data.x - lastAccel.current.x) +
        Math.abs(data.y - lastAccel.current.y) +
        Math.abs(data.z - lastAccel.current.z);

      lastAccel.current = data;

      if (accelDelta > ACCEL_THRESHOLD) registerActivity();
    });

    // Gyroscope: erkennt langsames Kippen und Drehen.
    gyroSubRef.current = Gyroscope.addListener((data) => {
      if (!hasFirstGyro.current) {
        lastGyro.current = data;
        hasFirstGyro.current = true;
        return;
      }

      const gyroDelta =
        Math.abs(data.x - lastGyro.current.x) +
        Math.abs(data.y - lastGyro.current.y) +
        Math.abs(data.z - lastGyro.current.z);

      lastGyro.current = data;

      if (gyroDelta > GYRO_THRESHOLD) registerActivity();
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

  // Session beenden: Timer/Sensor stoppen, Session speichern und Werte an den Result Screen übergeben.
  const endSession = async () => {
    stopSession();

    // Session-Objekt für den Verlauf erstellen und speichern.
    const session: FocusSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      durationSeconds: seconds,
      interruptions,
      longestCalmSeconds,
      score,
    };
    await addSession(session);

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
