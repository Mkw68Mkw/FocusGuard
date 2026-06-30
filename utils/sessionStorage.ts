import AsyncStorage from '@react-native-async-storage/async-storage';

import { FocusSession } from '@/models/focusSession';

// Schlüssel, unter dem alle Sessions im Speicher abgelegt werden.
const STORAGE_KEY = 'focusguard.sessions';

// Lädt alle gespeicherten Sessions. Gibt bei Fehlern eine leere Liste zurück.
export async function loadSessions(): Promise<FocusSession[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FocusSession[];
  } catch (error) {
    console.warn('Sessions konnten nicht geladen werden:', error);
    return [];
  }
}

// Speichert eine neue Session (neueste zuerst) und gibt die aktualisierte Liste zurück.
export async function addSession(session: FocusSession): Promise<FocusSession[]> {
  const existing = await loadSessions();
  const updated = [session, ...existing];
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Session konnte nicht gespeichert werden:', error);
  }
  return updated;
}

// Löscht alle gespeicherten Sessions.
export async function clearSessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Sessions konnten nicht gelöscht werden:', error);
  }
}
