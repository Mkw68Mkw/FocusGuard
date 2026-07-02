// Zentrale Farbpalette der App für Light- und Dark-Mode.
// Jede Farbe hat einen semantischen Namen, damit die Screens nicht mehr
// mit festen Hex-Werten arbeiten müssen.

export type AppTheme = {
  background: string; // Bildschirm-Hintergrund
  card: string; // Hintergrund von Karten
  shadow: string; // Schattenfarbe
  textPrimary: string; // Überschriften / wichtige Werte
  textSecondary: string; // Fließtext
  textMuted: string; // Labels / Nebentexte
  primary: string; // Akzentfarbe (Buttons, Timer, Score)
  primaryText: string; // Text auf primärer Fläche
  timerLabel: string; // gedämpftes Label auf der Timer-Karte
  danger: string; // Warnung / "Beenden" / "Bewegt"
  success: string; // "Ruhig"
  neutralBorder: string; // dezenter Rand (z. B. Abbrechen-Button)
  headerBackground: string; // Navigations-Header
  headerTint: string; // Text/Icons im Header
};

export const AppColors: { light: AppTheme; dark: AppTheme } = {
  light: {
    background: '#F5F6FA',
    card: '#FFFFFF',
    shadow: '#000000',
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    primary: '#4F46E5',
    primaryText: '#FFFFFF',
    timerLabel: '#C7D2FE',
    danger: '#EF4444',
    success: '#10B981',
    neutralBorder: '#9CA3AF',
    headerBackground: '#4F46E5',
    headerTint: '#FFFFFF',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    shadow: '#000000',
    textPrimary: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    primary: '#6366F1',
    primaryText: '#FFFFFF',
    timerLabel: '#C7D2FE',
    danger: '#F87171',
    success: '#34D399',
    neutralBorder: '#475569',
    headerBackground: '#1E293B',
    headerTint: '#FFFFFF',
  },
};
