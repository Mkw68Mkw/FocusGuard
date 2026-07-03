import { Accelerometer, Gyroscope } from 'expo-sensors';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { FocusSession, TimelinePoint } from '@/models/focusSession';
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
// Mindestdauer der aktiven Bewegung (in ms), damit sie als echte
// Unterbrechung zählt. Kurzes Verschieben darunter wird ignoriert.
const MIN_INTERRUPTION_MS = 2000;
// Update-Intervall beider Sensoren (in ms).
const SENSOR_INTERVAL_MS = 200;

export default function SessionScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [seconds, setSeconds] = useState(0);
  const [interruptions, setInterruptions] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [longestCalmSeconds, setLongestCalmSeconds] = useState(0);
  const [totalInterruptionSeconds, setTotalInterruptionSeconds] = useState(0);

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
  // Startzeitpunkt der aktuellen Unterbrechung (in ms).
  const interruptionStartTime = useRef(0);
  // Summe aller gezählten Unterbrechungs-Dauern (in ms).
  const totalInterruptionMs = useRef(0);
  const calmStreak = useRef(0); // aktuelle ruhige Phase in Sekunden

  // Timeline: pro Sekunde ein Bewegungs-Wert. Wir sammeln die Intensität der
  // laufenden Sekunde in currentSecondIntensity und schreiben sie einmal pro
  // Sekunde (im Timer) als Punkt in timelineData. So bleiben die Daten klein.
  const timelineData = useRef<TimelinePoint[]>([]);
  const currentSecondIntensity = useRef(0);

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
  // Merkt sich nur den Start der Bewegung; gezählt wird erst am Ende
  // (im Ruhe-Check), wenn die Dauer feststeht.
  const registerActivity = () => {
    setIsMoving(true);
    lastActivityTime.current = Date.now();

    // Beginn einer neuen Bewegungs-Phase merken. Die ruhige Phase wird hier
    // NICHT zurückgesetzt: ob sie unterbrochen wird, entscheidet sich erst am
    // Ende der Bewegung (nur echte Unterbrechungen >= 2s setzen sie zurück).
    if (!isInInterruption.current) {
      isInInterruption.current = true;
      interruptionStartTime.current = Date.now();
    }
  };

  // Startet eine frische Session: setzt alle Werte zurück und beginnt Timer + Sensoren.
  const startSession = () => {
    // Anzeige-Werte zurücksetzen.
    setSeconds(0);
    setInterruptions(0);
    setIsMoving(false);
    setLongestCalmSeconds(0);
    setTotalInterruptionSeconds(0);

    // Gemerkte Werte zurücksetzen.
    hasFirstAccel.current = false;
    hasFirstGyro.current = false;
    isInInterruption.current = false;
    lastActivityTime.current = 0;
    interruptionStartTime.current = 0;
    totalInterruptionMs.current = 0;
    calmStreak.current = 0;
    timelineData.current = [];
    currentSecondIntensity.current = 0;

    // Timer: erhöht jede Sekunde die Dauer und verfolgt die längste ruhige Phase.
    // Die ruhige Phase zählt nur hoch, wenn gerade keine Bewegung läuft.
    // Während einer Bewegung wird sie "eingefroren" (weder hoch noch auf 0):
    // so läuft sie nach einer zu kurzen Bewegung einfach weiter.
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);

      // Timeline: die in dieser Sekunde gesammelte Bewegungsintensität als
      // einen Punkt speichern und den Zähler für die nächste Sekunde nullen.
      const intensity = Math.round(currentSecondIntensity.current * 100) / 100;
      timelineData.current.push({
        second: timelineData.current.length + 1,
        intensity,
      });
      currentSecondIntensity.current = 0;

      // Nur hochzählen, wenn gerade keine Bewegung läuft. Bei Bewegung bleibt
      // der Wert stehen (eingefroren) und läuft danach ggf. weiter.
      if (!isInInterruption.current) {
        calmStreak.current += 1;
        setLongestCalmSeconds((prev) => Math.max(prev, calmStreak.current));
      }
    }, 1000);

    // Ruhe-Check: prüft regelmässig, ob das Handy lange genug ruhig war.
    // Ist das der Fall, gilt die Unterbrechung als beendet. Erst hier wird
    // anhand der aktiven Dauer entschieden, ob sie als Unterbrechung zählt.
    calmCheckRef.current = setInterval(() => {
      if (
        isInInterruption.current &&
        Date.now() - lastActivityTime.current > CALM_RESET_MS
      ) {
        // Aktive Dauer = vom Start der Bewegung bis zur letzten Aktivität
        // (die 2 s Ruhe-Wartezeit zählen bewusst nicht mit).
        const activeMs = lastActivityTime.current - interruptionStartTime.current;

        // Nur zählen, wenn lange genug bewegt (kurzes Verschieben wird ignoriert).
        if (activeMs >= MIN_INTERRUPTION_MS) {
          setInterruptions((prev) => prev + 1);
          totalInterruptionMs.current += activeMs;
          setTotalInterruptionSeconds(Math.round(totalInterruptionMs.current / 1000));
          // Nur eine echte Unterbrechung beendet die ruhige Phase.
          calmStreak.current = 0;
        }
        // Bei einer zu kurzen Bewegung bleibt calmStreak erhalten und läuft weiter.

        isInInterruption.current = false;
        setIsMoving(false);
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

      // Bewegung dieser Sekunde aufsummieren (auch kleine Bewegungen zählen für die Timeline).
      currentSecondIntensity.current += accelDelta;

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

      // Drehung/Kippen dieser Sekunde ebenfalls zur Intensität addieren.
      currentSecondIntensity.current += gyroDelta;

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

  // Session beenden: Timer/Sensor stoppen, Session speichern und Werte an den Result Screen übergeben.
  const endSession = async () => {
    stopSession();

    // Falls beim Beenden gerade noch eine Unterbrechung läuft, diese final
    // abrechnen (sonst ginge die letzte Bewegung verloren).
    let finalInterruptions = interruptions;
    let finalTotalMs = totalInterruptionMs.current;
    if (isInInterruption.current) {
      const activeMs = lastActivityTime.current - interruptionStartTime.current;
      if (activeMs >= MIN_INTERRUPTION_MS) {
        finalInterruptions += 1;
        finalTotalMs += activeMs;
      }
    }

    const totalInterruption = Math.round(finalTotalMs / 1000);
    // Einfacher Score: pro Unterbrechung 7 Punkte Abzug, mindestens 0.
    const score = Math.max(0, 100 - finalInterruptions * 7);

    // Aufgezeichnete Bewegungs-Timeline dieser Session.
    const timeline = timelineData.current;

    // Session-Objekt für den Verlauf erstellen und speichern.
    const session: FocusSession = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      durationSeconds: seconds,
      interruptions: finalInterruptions,
      longestCalmSeconds,
      totalInterruptionSeconds: totalInterruption,
      score,
      timeline,
    };
    await addSession(session);

    router.push({
      pathname: '/result',
      params: {
        durationSeconds: seconds,
        interruptions: finalInterruptions,
        longestCalmSeconds,
        totalInterruptionSeconds: totalInterruption,
        score,
        // Router-Params können nur Strings sein -> Timeline als JSON-String übergeben.
        timeline: JSON.stringify(timeline),
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unterbrechungszeit gesamt</Text>
        <Text style={styles.cardText}>{formatTime(totalInterruptionSeconds)} insgesamt bewegt</Text>
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

const createStyles = (c: AppTheme) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 24,
      gap: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      marginTop: 8,
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
      color: c.textSecondary,
    },
    timerCard: {
      backgroundColor: c.primary,
      borderRadius: 20,
      paddingVertical: 32,
      alignItems: 'center',
      gap: 6,
    },
    timerLabel: {
      color: c.timerLabel,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    timerValue: {
      color: c.primaryText,
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
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      gap: 6,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      gap: 8,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
    },
    cardValue: {
      fontSize: 22,
      fontWeight: '700',
      color: c.textPrimary,
    },
    statusCalm: {
      color: c.success,
    },
    statusMoving: {
      color: c.danger,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    cardText: {
      fontSize: 15,
      lineHeight: 24,
      color: c.textSecondary,
    },
    endButton: {
      backgroundColor: c.danger,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    endButtonText: {
      color: c.primaryText,
      fontSize: 16,
      fontWeight: '700',
    },
    cancelButton: {
      backgroundColor: c.card,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.neutralBorder,
    },
    cancelButtonText: {
      color: c.textMuted,
      fontSize: 16,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.8,
    },
  });
