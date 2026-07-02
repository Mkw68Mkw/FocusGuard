import { AppColors, AppTheme } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Gibt die passende Farbpalette zum aktuellen System-Theme zurück.
// Wechselt automatisch, wenn der Nutzer sein Gerät auf Dark/Light stellt.
export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? AppColors.dark : AppColors.light;
}
