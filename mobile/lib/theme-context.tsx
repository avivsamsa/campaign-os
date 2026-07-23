import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { darkColors, lightColors, type Palette } from './theme';

export type ThemeMode = 'system' | 'light' | 'dark';
const MODE_KEY = 'theme_mode';

type ThemeState = {
  colors: Palette;
  scheme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeState>({
  colors: darkColors,
  scheme: 'dark',
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      try {
        const saved = (await SecureStore.getItemAsync(MODE_KEY)) as ThemeMode | null;
        if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    SecureStore.setItemAsync(MODE_KEY, m).catch(() => {});
  }

  // מסנכרן את המראה הנייטיבי (iOS 26 glass header, מקלדת וכו') לבחירה שלנו —
  // אחרת הזכוכית של ה-header עוקבת אחרי המערכת ונראית לבנה במצב כהה.
  useEffect(() => {
    try {
      Appearance.setColorScheme(mode === 'system' ? null : mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const scheme: 'light' | 'dark' = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const colors = scheme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ colors, scheme, mode, setMode }}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;
