// Ein einzelner Punkt der Bewegungs-Timeline: pro Sekunde ein Wert.
export type TimelinePoint = {
  second: number; // Sekunde seit Session-Start
  intensity: number; // Bewegungsintensität in dieser Sekunde (accelDelta + gyroDelta)
};

export type FocusSession = {
    id: string;
    date: string;
    durationSeconds: number;
    interruptions: number;
    longestCalmSeconds: number;
    totalInterruptionSeconds: number;
    score: number;
    // Optional: Bewegungs-Timeline der Session (für spätere Auswertung im Verlauf).
    timeline?: TimelinePoint[];
  };
