// Gemeinsame Formatierungs-Helfer, die in mehreren Screens gebraucht werden.

// Sekunden als mm:ss anzeigen (z. B. 75 -> "01:15").
export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(minutes)}:${pad(seconds)}`;
}
