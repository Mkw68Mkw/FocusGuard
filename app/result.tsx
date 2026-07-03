import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppTheme } from '@/constants/colors';
import { useTheme } from '@/hooks/use-theme';
import { TimelinePoint } from '@/models/focusSession';
import { formatTime } from '@/utils/format';

// Params kommen als String an, deshalb sicher in eine Zahl umwandeln.
function toNumber(value: string | string[] | undefined) {
  const num = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(num) ? num : 0;
}

// Die Timeline kommt als JSON-String an -> sicher zurück in ein Array wandeln.
function parseTimeline(value: string | string[] | undefined): TimelinePoint[] {
  try {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Maximale Balkenhöhe der Timeline-Visualisierung (in Pixeln).
const MAX_BAR_HEIGHT = 120;

// Wandelt den Score in eine Bewertung mit Text, Farbe und Emoji um.
function getRating(score: number) {
  if (score >= 90) return { label: 'Sehr fokussiert', color: '#10B981', emoji: '🎯' };
  if (score >= 70) return { label: 'Gute Session', color: '#22C55E', emoji: '💪' };
  if (score >= 50) return { label: 'Okay', color: '#F59E0B', emoji: '🙂' };
  return { label: 'Viele Unterbrechungen', color: '#EF4444', emoji: '😬' };
}

export default function ResultScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Werte, die der Session Screen übergeben hat, auslesen.
  const params = useLocalSearchParams();
  const durationSeconds = toNumber(params.durationSeconds);
  const interruptions = toNumber(params.interruptions);
  const longestCalmSeconds = toNumber(params.longestCalmSeconds);
  const totalInterruptionSeconds = toNumber(params.totalInterruptionSeconds);
  const score = toNumber(params.score);
  const timeline = parseTimeline(params.timeline);

  // Bewertung passend zum Score bestimmen.
  const rating = getRating(score);

  // Kleine Auswertung der Timeline berechnen.
  const maxIntensity = timeline.reduce((max, p) => Math.max(max, p.intensity), 0);
  const peakPoint = timeline.reduce(
    (best, p) => (p.intensity > best.intensity ? p : best),
    { second: 0, intensity: 0 } as TimelinePoint
  );
  const averageIntensity =
    timeline.length > 0
      ? timeline.reduce((sum, p) => sum + p.intensity, 0) / timeline.length
      : 0;

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

      <View style={styles.row}>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Längste ruhige Phase</Text>
          <Text style={styles.cardValue}>{formatTime(longestCalmSeconds)}</Text>
        </View>
        <View style={[styles.smallCard, styles.flex1]}>
          <Text style={styles.cardLabel}>Unterbrechungszeit</Text>
          <Text style={styles.cardValue}>{formatTime(totalInterruptionSeconds)}</Text>
        </View>
      </View>

      {/* Session Analyse: Bewegungs-Timeline als kleine Balken-Visualisierung */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session Analyse</Text>
        <Text style={styles.cardText}>
          Hier siehst du, wann dein Handy während der Session bewegt wurde.
        </Text>

        {timeline.length === 0 ? (
          <Text style={styles.emptyText}>Keine Bewegungsdaten aufgezeichnet.</Text>
        ) : (
          <>
            {/* Horizontale Balken: je höher, desto stärker die Bewegung */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chart}>
              {timeline.map((point) => {
                // Balkenhöhe relativ zum stärksten Peak berechnen.
                const ratio = maxIntensity > 0 ? point.intensity / maxIntensity : 0;
                const barHeight = Math.max(4, ratio * MAX_BAR_HEIGHT);
                // Peaks farblich hervorheben.
                const isPeak = point.intensity === maxIntensity && maxIntensity > 0;
                return (
                  <View key={point.second} style={styles.barColumn}>
                    <View
                      style={[
                        styles.bar,
                        { height: barHeight },
                        isPeak && styles.barPeak,
                      ]}
                    />
                  </View>
                );
              })}
            </ScrollView>

            {/* Kleine Auswertung */}
            <View style={styles.analysisStats}>
              <Text style={styles.analysisLine}>
                Stärkster Peak: {peakPoint.intensity.toFixed(2)} bei {formatTime(peakPoint.second)}
              </Text>
              <Text style={styles.analysisLine}>
                Durchschnittliche Intensität: {averageIntensity.toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={() => router.dismissTo('/')}>
        <Text style={styles.primaryButtonText}>Zurück zum Start</Text>
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
    scoreCard: {
      borderRadius: 24,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 6,
      shadowColor: c.shadow,
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
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 20,
      gap: 12,
      shadowColor: c.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    cardText: {
      fontSize: 15,
      lineHeight: 22,
      color: c.textSecondary,
    },
    emptyText: {
      fontSize: 14,
      color: c.textMuted,
      fontStyle: 'italic',
    },
    chart: {
      alignItems: 'flex-end',
      gap: 3,
      height: MAX_BAR_HEIGHT,
      paddingVertical: 4,
    },
    barColumn: {
      justifyContent: 'flex-end',
    },
    bar: {
      width: 6,
      borderRadius: 3,
      backgroundColor: c.primary,
    },
    barPeak: {
      backgroundColor: c.danger,
    },
    analysisStats: {
      gap: 4,
    },
    analysisLine: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textPrimary,
    },
    primaryButton: {
      backgroundColor: c.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
      marginTop: 8,
    },
    primaryButtonText: {
      color: c.primaryText,
      fontSize: 16,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.8,
    },
  });
